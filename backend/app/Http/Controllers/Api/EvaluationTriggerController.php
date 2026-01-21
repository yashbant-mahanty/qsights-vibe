<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class EvaluationTriggerController extends Controller
{
    /**
     * Trigger evaluations for selected evaluators
     */
    public function trigger(Request $request)
    {
        try {
            $user = $request->user();
            
            $validated = $request->validate([
                'template_id' => 'required|string',
                'template_name' => 'required|string|max:255',
                'template_questions' => 'required|array',
                'evaluator_ids' => 'required|array|min:1',
                'evaluator_ids.*' => 'uuid|exists:evaluation_staff,id',
                'organization_id' => 'required|uuid|exists:organizations,id'
            ]);
            
            $triggeredCount = 0;
            $emailsSent = 0;
            
            foreach ($validated['evaluator_ids'] as $evaluatorId) {
                // Get evaluator details
                $evaluator = DB::table('evaluation_staff')
                    ->where('id', $evaluatorId)
                    ->whereNull('deleted_at')
                    ->first();
                    
                if (!$evaluator) {
                    continue;
                }
                
                // Get subordinates for this evaluator
                $subordinates = DB::table('evaluation_hierarchy as eh')
                    ->join('evaluation_staff as es', 'eh.staff_id', '=', 'es.id')
                    ->where('eh.reports_to_id', $evaluatorId)
                    ->where('eh.is_active', true)
                    ->whereNull('eh.deleted_at')
                    ->whereNull('es.deleted_at')
                    ->select('es.id', 'es.name', 'es.email', 'es.employee_id')
                    ->get();
                
                if ($subordinates->isEmpty()) {
                    continue;
                }
                
                // Create triggered evaluation record
                $triggeredId = Str::uuid()->toString();
                $accessToken = Str::random(64);
                
                DB::table('evaluation_triggered')->insert([
                    'id' => $triggeredId,
                    'organization_id' => $validated['organization_id'],
                    'template_id' => $validated['template_id'],
                    'template_name' => $validated['template_name'],
                    'template_questions' => json_encode($validated['template_questions']),
                    'evaluator_id' => $evaluatorId,
                    'evaluator_name' => $evaluator->name,
                    'evaluator_email' => $evaluator->email,
                    'subordinates' => json_encode($subordinates->toArray()),
                    'subordinates_count' => $subordinates->count(),
                    'access_token' => $accessToken,
                    'status' => 'pending',
                    'triggered_by' => $user->id,
                    'triggered_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                $triggeredCount++;
                
                // Send email to evaluator
                try {
                    $evaluationUrl = config('app.frontend_url', 'https://qsights.co') . 
                        '/e/evaluate/' . $triggeredId . '?token=' . $accessToken;
                    
                    // Use simple mail or queue
                    Mail::send('emails.evaluation-trigger', [
                        'evaluatorName' => $evaluator->name,
                        'templateName' => $validated['template_name'],
                        'subordinatesCount' => $subordinates->count(),
                        'subordinates' => $subordinates,
                        'evaluationUrl' => $evaluationUrl
                    ], function ($message) use ($evaluator, $validated) {
                        $message->to($evaluator->email, $evaluator->name)
                            ->subject('Evaluation Request: ' . $validated['template_name']);
                    });
                    
                    $emailsSent++;
                    
                    // Update email sent status
                    DB::table('evaluation_triggered')
                        ->where('id', $triggeredId)
                        ->update(['email_sent_at' => now()]);
                        
                } catch (\Exception $emailError) {
                    \Log::error('Failed to send evaluation email: ' . $emailError->getMessage());
                }
            }
            
            // Log audit
            $this->logAudit(
                'evaluation_trigger', 
                null, 
                'triggered', 
                "Triggered {$triggeredCount} evaluation(s), sent {$emailsSent} email(s)", 
                $user, 
                $validated['organization_id']
            );
            
            return response()->json([
                'success' => true,
                'message' => "Evaluation triggered successfully. {$emailsSent} email(s) sent.",
                'triggered_count' => $triggeredCount,
                'emails_sent' => $emailsSent
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to trigger evaluation: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get triggered evaluations list
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $organizationId = $request->query('organization_id', $user->organization_id);
            
            $evaluations = DB::table('evaluation_triggered')
                ->where('organization_id', $organizationId)
                ->orderBy('triggered_at', 'desc')
                ->select(
                    'id', 
                    'template_name', 
                    'evaluator_name', 
                    'subordinates_count', 
                    'status', 
                    'triggered_at', 
                    'completed_at',
                    'email_sent_at'
                )
                ->get();
            
            return response()->json([
                'success' => true,
                'evaluations' => $evaluations
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch triggered evaluations: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get a single triggered evaluation (for taking)
     */
    public function show(Request $request, $id)
    {
        try {
            $token = $request->query('token');
            
            $evaluation = DB::table('evaluation_triggered')
                ->where('id', $id)
                ->first();
            
            if (!$evaluation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Evaluation not found'
                ], 404);
            }
            
            // Verify access token
            if ($evaluation->access_token !== $token) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid access token'
                ], 403);
            }
            
            // Parse JSON fields
            $evaluation->template_questions = json_decode($evaluation->template_questions);
            $evaluation->subordinates = json_decode($evaluation->subordinates);
            
            return response()->json([
                'success' => true,
                'evaluation' => $evaluation
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch evaluation: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Submit evaluation responses
     */
    public function submit(Request $request, $id)
    {
        try {
            $token = $request->query('token');
            
            $evaluation = DB::table('evaluation_triggered')
                ->where('id', $id)
                ->first();
            
            if (!$evaluation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Evaluation not found'
                ], 404);
            }
            
            // Verify access token
            if ($evaluation->access_token !== $token) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid access token'
                ], 403);
            }
            
            if ($evaluation->status === 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Evaluation already completed'
                ], 422);
            }
            
            $validated = $request->validate([
                'responses' => 'required|array'
            ]);
            
            // Store responses
            DB::table('evaluation_triggered')
                ->where('id', $id)
                ->update([
                    'responses' => json_encode($validated['responses']),
                    'status' => 'completed',
                    'completed_at' => now(),
                    'updated_at' => now()
                ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Evaluation submitted successfully'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit evaluation: ' . $e->getMessage()
            ], 500);
        }
    }
    
    private function logAudit($entityType, $entityId, $action, $description, $user, $organizationId, $oldValues = null, $newValues = null)
    {
        try {
            DB::table('evaluation_audit_log')->insert([
                'id' => Str::uuid()->toString(),
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'organization_id' => $organizationId,
                'action' => $action,
                'action_description' => $description,
                'user_id' => $user->id,
                'user_name' => $user->name,
                'user_email' => $user->email,
                'old_values' => $oldValues ? json_encode($oldValues) : null,
                'new_values' => $newValues ? json_encode($newValues) : null,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'performed_at' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to log audit: ' . $e->getMessage());
        }
    }
}
