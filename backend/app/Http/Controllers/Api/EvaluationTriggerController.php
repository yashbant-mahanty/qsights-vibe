<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use App\Models\SystemSetting;

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
                'program_id' => 'required|uuid',
                'email_subject' => 'nullable|string',
                'email_body' => 'nullable|string',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date',
            ]);
            
            $triggeredCount = 0;
            $emailsSent = 0;
            $skippedCount = 0;
            $skippedEvaluators = [];
            
            foreach ($validated['evaluator_ids'] as $evaluatorId) {
                // Check for duplicate active evaluation
                // Only skip if there's an active evaluation for the SAME template that hasn't ended yet
                $existingActive = DB::table('evaluation_triggered')
                    ->where('evaluator_id', $evaluatorId)
                    ->where('template_id', $validated['template_id'])
                    ->where('program_id', $validated['program_id'])
                    ->where('is_active', true)
                    ->where(function($query) {
                        // Check if end_date hasn't passed OR no end_date set
                        $query->where('end_date', '>=', now())
                              ->orWhereNull('end_date');
                    })
                    ->whereNull('deleted_at')
                    ->exists();
                
                if ($existingActive) {
                    $evaluator = DB::table('evaluation_staff')->where('id', $evaluatorId)->first();
                    $skippedCount++;
                    $skippedEvaluators[] = $evaluator->name ?? 'Unknown';
                    \Log::info("Skipping evaluator {$evaluatorId} - active evaluation already exists");
                    continue; // Skip this evaluator
                }
                
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
                    'program_id' => $validated['program_id'],
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
                    'start_date' => $validated['start_date'] ?? null,
                    'end_date' => $validated['end_date'] ?? null,
                    'email_subject' => $validated['email_subject'] ?? null,
                    'email_body' => $validated['email_body'] ?? null,
                    'is_active' => true,
                    'triggered_by' => $user->id,
                    'triggered_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                $triggeredCount++;
                
                // Send email to evaluator
                try {
                    $evaluationUrl = config('app.frontend_url', 'https://prod.qsights.com') . 
                        '/e/evaluate/' . $triggeredId . '?token=' . $accessToken;
                    
                    // Prepare email subject and body with placeholders
                    $emailSubject = $validated['email_subject'] ?? ('Evaluation Request: ' . $validated['template_name']);
                    $emailBody = $validated['email_body'] ?? "Hello {evaluator_name},\n\nYou have been requested to complete evaluations for your team members.";
                    
                    // Replace placeholders including evaluation_url for button
                    $subordinatesList = $subordinates->map(fn($s) => $s->name)->implode("\n- ");
                    
                    // First replace the evaluation_url placeholder if present (for button in body)
                    $emailBody = str_replace('{evaluation_url}', $evaluationUrl, $emailBody);
                    
                    // Then replace other placeholders
                    $emailBody = str_replace([
                        '{evaluator_name}',
                        '{start_date}',
                        '{end_date}',
                        '{subordinates_list}'
                    ], [
                        $evaluator->name,
                        $validated['start_date'] ?? 'Not specified',
                        $validated['end_date'] ?? 'Not specified',
                        $subordinatesList
                    ], $emailBody);
                    
                    // Send via SendGrid API - Get credentials from database (System Settings)
                    $sendGridApiKey = SystemSetting::getValue('email_sendgrid_api_key') ?: env('SENDGRID_API_KEY');
                    $from = SystemSetting::getValue('email_sender_email') ?: config('mail.from.address', 'info@qsights.com');
                    $fromName = SystemSetting::getValue('email_sender_name') ?: config('mail.from.name', 'QSights');
                    
                    \Log::info('Sending evaluation email', [
                        'to' => $evaluator->email,
                        'subject' => $emailSubject,
                        'from' => $from,
                        'has_api_key' => !empty($sendGridApiKey)
                    ]);
                    
                    // Build professional HTML email template like event emailers
                    // Use full HTML document structure for better email client compatibility
                    // Use solid background color (not gradient) for maximum email client compatibility
                    $buttonHtml = "
                        <table role='presentation' cellspacing='0' cellpadding='0' border='0' align='center' style='margin: 30px auto;'>
                            <tr>
                                <td align='center' bgcolor='#667eea' style='border-radius: 8px; background-color: #667eea;'>
                                    <a href='" . $evaluationUrl . "' target='_blank' style='background-color: #667eea; border: 15px solid #667eea; border-radius: 8px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; line-height: 1.1; text-align: center; text-decoration: none; display: inline-block; color: #ffffff; mso-padding-alt: 0;'>
                                        <!--[if mso]><i style='letter-spacing: 25px; mso-font-width: -100%; mso-text-raise: 30pt;'>&nbsp;</i><![endif]-->
                                        <span style='color: #ffffff; mso-text-raise: 15pt;'>Start Evaluation →</span>
                                        <!--[if mso]><i style='letter-spacing: 25px; mso-font-width: -100%;'>&nbsp;</i><![endif]-->
                                    </a>
                                </td>
                            </tr>
                        </table>";
                    
                    $htmlBody = "<!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset='utf-8'>
                        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                    </head>
                    <body style='margin: 0; padding: 0; background-color: #f4f4f4;'>
                        <table role='presentation' cellspacing='0' cellpadding='0' border='0' width='100%' style='background-color: #f4f4f4;'>
                            <tr>
                                <td style='padding: 20px 0;'>
                                    <table role='presentation' cellspacing='0' cellpadding='0' border='0' width='600' style='margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;'>
                                        <tr>
                                            <td style='padding: 40px 30px; font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333333;'>
                                                " . nl2br(e($emailBody)) . "
                                                " . $buttonHtml . "
                                                <p style='color: #888888; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #eeeeee; padding-top: 20px;'>
                                                    If the button doesn't work, copy and paste this link into your browser:<br>
                                                    <a href='" . $evaluationUrl . "' style='color: #667eea; word-break: break-all;'>" . $evaluationUrl . "</a>
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>";
                    
                    \Log::info('Email HTML body constructed', [
                        'html_length' => strlen($htmlBody),
                        'has_button' => strpos($htmlBody, 'Start Evaluation') !== false,
                        'evaluation_url' => $evaluationUrl
                    ]);
                    
                    $response = Http::withHeaders([
                        'Authorization' => 'Bearer ' . $sendGridApiKey,
                        'Content-Type' => 'application/json'
                    ])->post('https://api.sendgrid.com/v3/mail/send', [
                        'personalizations' => [[
                            'to' => [['email' => $evaluator->email, 'name' => $evaluator->name]],
                            'subject' => $emailSubject
                        ]],
                        'from' => ['email' => $from, 'name' => $fromName],
                        'content' => [['type' => 'text/html', 'value' => $htmlBody]]
                    ]);
                    
                    \Log::info('SendGrid response', [
                        'status' => $response->status(),
                        'successful' => $response->successful(),
                        'body' => $response->body()
                    ]);
                    
                    if ($response->successful()) {
                        $emailsSent++;
                        
                        // Update email sent status
                        DB::table('evaluation_triggered')
                            ->where('id', $triggeredId)
                            ->update(['email_sent_at' => now()]);
                    } else {
                        \Log::error('SendGrid email failed', [
                            'status' => $response->status(),
                            'body' => $response->body(),
                            'to' => $evaluator->email
                        ]);
                    }
                        
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
                $validated['program_id']
            );
            
            return response()->json([
                'success' => true,
                'message' => $triggeredCount > 0 
                    ? "Evaluation triggered successfully. {$emailsSent} email(s) sent." . ($skippedCount > 0 ? " {$skippedCount} evaluator(s) skipped (already have active evaluation)." : "")
                    : ($skippedCount > 0 ? "All {$skippedCount} evaluator(s) skipped - they already have active evaluations that haven't ended. Delete the existing evaluation or wait until end date passes." : "No evaluations triggered."),
                'triggered_count' => $triggeredCount,
                'emails_sent' => $emailsSent,
                'skipped_count' => $skippedCount,
                'skipped_evaluators' => $skippedEvaluators,
                'skipped_reason' => $skippedCount > 0 ? 'Active evaluation exists (end date not passed)' : null
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
            $programId = $request->query('program_id', $user->program_id ?? null);
            
            $query = DB::table('evaluation_triggered')
                ->orderBy('triggered_at', 'desc');
                
            if ($programId) {
                $query->where('program_id', $programId);
            }
                
            $evaluations = $query->select(
                    'id', 
                    'template_name', 
                    'evaluator_name', 
                    'subordinates_count', 
                    'status', 
                    'triggered_at', 
                    'completed_at',
                    'email_sent_at',
                    'start_date',
                    'end_date',
                    'is_active',
                    'email_subject',
                    'email_body'
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
    
    private function logAudit($entityType, $entityId, $action, $description, $user, $programId, $oldValues = null, $newValues = null)
    {
        try {
            DB::table('evaluation_audit_log')->insert([
                'id' => Str::uuid()->toString(),
                'entity_type' => $entityType,
                'entity_id' => $entityId,
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

    /**
     * Update triggered evaluation
     */
    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            $validated = $request->validate([
                'email_subject' => 'nullable|string|max:500',
                'email_body' => 'nullable|string',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after_or_equal:start_date'
            ]);
            
            $triggered = DB::table('evaluation_triggered')->where('id', $id)->first();
            
            if (!$triggered) {
                return response()->json(['success' => false, 'message' => 'Evaluation not found'], 404);
            }
            
            DB::table('evaluation_triggered')
                ->where('id', $id)
                ->update([
                    'start_date' => $validated['start_date'] ?? $triggered->start_date,
                    'end_date' => $validated['end_date'] ?? $triggered->end_date,
                    'updated_at' => now()
                ]);
            
            $this->logAudit('evaluation_triggered', $id, 'updated', 
                'Updated triggered evaluation details', 
                $user, 
                $triggered->program_id,
                ['start_date' => $triggered->start_date, 'end_date' => $triggered->end_date],
                $validated
            );
            
            return response()->json(['success' => true, 'message' => 'Evaluation updated successfully']);
            
        } catch (\Exception $e) {
            \Log::error('Failed to update triggered evaluation: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update evaluation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete triggered evaluation (cascade)
     */
    public function destroy(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            $triggered = DB::table('evaluation_triggered')->where('id', $id)->first();
            
            if (!$triggered) {
                return response()->json(['success' => false, 'message' => 'Evaluation not found'], 404);
            }
            
            // Delete related results if table exists
            try {
                DB::table('evaluation_results')->where('triggered_id', $id)->delete();
            } catch (\Exception $e) {
                // Table may not exist or no foreign key, ignore
                \Log::info('No evaluation_results to delete for triggered_id: ' . $id);
            }
            
            // Delete the triggered evaluation
            DB::table('evaluation_triggered')->where('id', $id)->delete();
            
            $this->logAudit('evaluation_triggered', $id, 'deleted', 
                'Deleted triggered evaluation and related responses', 
                $user, 
                $triggered->program_id
            );
            
            return response()->json(['success' => true, 'message' => 'Evaluation deleted successfully']);
            
        } catch (\Exception $e) {
            \Log::error('Failed to delete triggered evaluation: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete evaluation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle active status
     */
    public function toggleActive(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            $validated = $request->validate([
                'is_active' => 'required|boolean'
            ]);
            
            $triggered = DB::table('evaluation_triggered')->where('id', $id)->first();
            
            if (!$triggered) {
                return response()->json(['success' => false, 'message' => 'Evaluation not found'], 404);
            }
            
            DB::table('evaluation_triggered')
                ->where('id', $id)
                ->update([
                    'is_active' => $validated['is_active'],
                    'updated_at' => now()
                ]);
            
            $this->logAudit('evaluation_triggered', $id, 'status_changed', 
                'Changed active status to ' . ($validated['is_active'] ? 'active' : 'inactive'), 
                $user, 
                $triggered->program_id
            );
            
            return response()->json(['success' => true, 'message' => 'Status updated successfully']);
            
        } catch (\Exception $e) {
            \Log::error('Failed to toggle active status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Resend evaluation email
     */
    public function resend(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            $triggered = DB::table('evaluation_triggered')->where('id', $id)->first();
            
            if (!$triggered) {
                return response()->json(['success' => false, 'message' => 'Evaluation not found'], 404);
            }
            
            // Generate new access token
            $newToken = Str::random(64);
            
            DB::table('evaluation_triggered')
                ->where('id', $id)
                ->update([
                    'access_token' => $newToken,
                    'email_sent_at' => now(),
                    'updated_at' => now()
                ]);
            
            // Send email
            $evaluationUrl = config('app.frontend_url', 'https://prod.qsights.com') . 
                '/e/evaluate/' . $id . '?token=' . $newToken;
            
            $emailSubject = 'Evaluation Reminder: ' . $triggered->template_name;
            $emailBody = "Hello {$triggered->evaluator_name},\n\nThis is a reminder to complete your pending evaluations.";
            
            $sendGridApiKey = SystemSetting::getValue('email_sendgrid_api_key') ?: env('SENDGRID_API_KEY');
            $from = SystemSetting::getValue('email_sender_email') ?: config('mail.from.address', 'info@qsights.com');
            $fromName = SystemSetting::getValue('email_sender_name') ?: config('mail.from.name', 'QSights');
            
            // Build professional HTML email template (same as trigger email)
            // Use solid background color (not gradient) for maximum email client compatibility
            $buttonHtml = "
                <table role='presentation' cellspacing='0' cellpadding='0' border='0' align='center' style='margin: 30px auto;'>
                    <tr>
                        <td align='center' bgcolor='#667eea' style='border-radius: 8px; background-color: #667eea;'>
                            <a href='" . $evaluationUrl . "' target='_blank' style='background-color: #667eea; border: 15px solid #667eea; border-radius: 8px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; line-height: 1.1; text-align: center; text-decoration: none; display: inline-block; color: #ffffff; mso-padding-alt: 0;'>
                                <!--[if mso]><i style='letter-spacing: 25px; mso-font-width: -100%; mso-text-raise: 30pt;'>&nbsp;</i><![endif]-->
                                <span style='color: #ffffff; mso-text-raise: 15pt;'>Start Evaluation →</span>
                                <!--[if mso]><i style='letter-spacing: 25px; mso-font-width: -100%;'>&nbsp;</i><![endif]-->
                            </a>
                        </td>
                    </tr>
                </table>";
            
            $htmlBody = "<!DOCTYPE html>
            <html>
            <head>
                <meta charset='utf-8'>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            </head>
            <body style='margin: 0; padding: 0; background-color: #f4f4f4;'>
                <table role='presentation' cellspacing='0' cellpadding='0' border='0' width='100%' style='background-color: #f4f4f4;'>
                    <tr>
                        <td style='padding: 20px 0;'>
                            <table role='presentation' cellspacing='0' cellpadding='0' border='0' width='600' style='margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;'>
                                <tr>
                                    <td style='padding: 40px 30px; font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333333;'>
                                        " . nl2br(e($emailBody)) . "
                                        " . $buttonHtml . "
                                        <p style='color: #888888; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #eeeeee; padding-top: 20px;'>
                                            If the button doesn't work, copy and paste this link into your browser:<br>
                                            <a href='" . $evaluationUrl . "' style='color: #667eea; word-break: break-all;'>" . $evaluationUrl . "</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>";
            
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $sendGridApiKey,
                'Content-Type' => 'application/json'
            ])->post('https://api.sendgrid.com/v3/mail/send', [
                'personalizations' => [[
                    'to' => [['email' => $triggered->evaluator_email, 'name' => $triggered->evaluator_name]],
                    'subject' => $emailSubject
                ]],
                'from' => ['email' => $from, 'name' => $fromName],
                'content' => [['type' => 'text/html', 'value' => $htmlBody]]
            ]);
            
            if ($response->successful()) {
                $this->logAudit('evaluation_triggered', $id, 'email_resent', 
                    'Resent evaluation email', 
                    $user, 
                    $triggered->program_id
                );
                
                return response()->json(['success' => true, 'message' => 'Email resent successfully']);
            } else {
            return response()->json(['success' => false, 'message' => 'Failed to send email'], 500);
            }
            
        } catch (\Exception $e) {
            \Log::error('Failed to resend email: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to resend email',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get evaluation reports with filters
     */
    public function reports(Request $request)
    {
        try {
            $user = $request->user();
            $programId = $request->query('program_id', $user->program_id ?? null);
            
            // Get filter parameters
            $departmentId = $request->query('department_id');
            $evaluatorId = $request->query('evaluator_id');
            $templateId = $request->query('template_id');
            $staffId = $request->query('staff_id');
            $dateFrom = $request->query('date_from');
            $dateTo = $request->query('date_to');
            
            // Build query for triggered evaluations with responses
            $query = DB::table('evaluation_triggered as et')
                ->leftJoin('evaluation_staff as es', 'et.evaluator_id', '=', 'es.id')
                ->leftJoin('evaluation_roles as er', 'es.role_id', '=', 'er.id')
                ->where('et.status', 'completed')
                ->whereNull('et.deleted_at')
                ->select(
                    'et.id',
                    'et.template_id',
                    'et.template_name',
                    'et.evaluator_id',
                    'et.evaluator_name',
                    'et.evaluator_email',
                    'et.subordinates',
                    'et.subordinates_count',
                    'et.responses',
                    'et.status',
                    'et.triggered_at',
                    'et.completed_at',
                    'et.start_date',
                    'et.end_date',
                    'er.category as department',
                    'er.name as evaluator_role'
                );
            
            if ($programId) {
                $query->where('et.program_id', $programId);
            }
            
            // Apply filters
            if ($departmentId) {
                $query->where('er.category', $departmentId);
            }
            
            if ($evaluatorId) {
                $query->where('et.evaluator_id', $evaluatorId);
            }
            
            if ($templateId) {
                $query->where('et.template_id', $templateId);
            }
            
            if ($dateFrom) {
                $query->where('et.completed_at', '>=', $dateFrom);
            }
            
            if ($dateTo) {
                $query->where('et.completed_at', '<=', $dateTo . ' 23:59:59');
            }
            
            $evaluations = $query->orderBy('et.completed_at', 'desc')->get();
            
            // Process responses for staff-wise breakdown
            $staffReports = [];
            
            foreach ($evaluations as $eval) {
                $responses = json_decode($eval->responses, true) ?? [];
                $subordinates = json_decode($eval->subordinates, true) ?? [];
                
                foreach ($subordinates as $subordinate) {
                    $subId = $subordinate['id'];
                    
                    // Apply staff filter if provided
                    if ($staffId && $subId !== $staffId) {
                        continue;
                    }
                    
                    $staffResponses = $responses[$subId] ?? null;
                    
                    if (!isset($staffReports[$subId])) {
                        $staffReports[$subId] = [
                            'staff_id' => $subId,
                            'staff_name' => $subordinate['name'] ?? 'Unknown',
                            'staff_email' => $subordinate['email'] ?? '',
                            'employee_id' => $subordinate['employee_id'] ?? '',
                            'evaluations' => []
                        ];
                    }
                    
                    $staffReports[$subId]['evaluations'][] = [
                        'evaluation_id' => $eval->id,
                        'template_id' => $eval->template_id,
                        'template_name' => $eval->template_name,
                        'evaluator_id' => $eval->evaluator_id,
                        'evaluator_name' => $eval->evaluator_name,
                        'evaluator_role' => $eval->evaluator_role,
                        'department' => $eval->department,
                        'responses' => $staffResponses,
                        'completed_at' => $eval->completed_at
                    ];
                }
            }
            
            return response()->json([
                'success' => true,
                'reports' => array_values($staffReports),
                'total_evaluations' => $evaluations->count(),
                'total_staff_evaluated' => count($staffReports)
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to fetch evaluation reports: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch reports: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get summary statistics for evaluations
     */
    public function reportsSummary(Request $request)
    {
        try {
            $user = $request->user();
            $programId = $request->query('program_id', $user->program_id ?? null);
            
            $query = DB::table('evaluation_triggered')
                ->whereNull('deleted_at');
            
            if ($programId) {
                $query->where('program_id', $programId);
            }
            
            $totalTriggered = (clone $query)->count();
            $completed = (clone $query)->where('status', 'completed')->count();
            $pending = (clone $query)->where('status', 'pending')->count();
            $inProgress = (clone $query)->where('status', 'in_progress')->count();
            
            // Get total subordinates evaluated (sum of subordinates_count where completed)
            $totalSubordinatesEvaluated = (clone $query)
                ->where('status', 'completed')
                ->sum('subordinates_count');
            
            // Get unique evaluators
            $uniqueEvaluators = (clone $query)
                ->where('status', 'completed')
                ->distinct()
                ->count('evaluator_id');
            
            // Get completion rate
            $completionRate = $totalTriggered > 0 ? round(($completed / $totalTriggered) * 100, 1) : 0;
            
            // Get templates breakdown
            $templateBreakdown = (clone $query)
                ->where('status', 'completed')
                ->groupBy('template_id', 'template_name')
                ->select('template_id', 'template_name', DB::raw('COUNT(*) as count'))
                ->get();
            
            // Get department-wise breakdown
            $departmentBreakdown = DB::table('evaluation_triggered as et')
                ->join('evaluation_staff as es', 'et.evaluator_id', '=', 'es.id')
                ->join('evaluation_roles as er', 'es.role_id', '=', 'er.id')
                ->where('et.status', 'completed')
                ->whereNull('et.deleted_at')
                ->when($programId, function($q) use ($programId) {
                    $q->where('et.program_id', $programId);
                })
                ->groupBy('er.category')
                ->select('er.category as department', DB::raw('COUNT(*) as count'))
                ->get();
            
            return response()->json([
                'success' => true,
                'summary' => [
                    'total_triggered' => $totalTriggered,
                    'completed' => $completed,
                    'pending' => $pending,
                    'in_progress' => $inProgress,
                    'completion_rate' => $completionRate,
                    'total_subordinates_evaluated' => $totalSubordinatesEvaluated,
                    'unique_evaluators' => $uniqueEvaluators,
                    'template_breakdown' => $templateBreakdown,
                    'department_breakdown' => $departmentBreakdown
                ]
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to fetch evaluation summary: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch summary: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get detailed evaluation for a specific staff member
     */
    public function staffDetail(Request $request, $staffId)
    {
        try {
            $user = $request->user();
            $programId = $request->query('program_id', $user->program_id ?? null);
            
            // Get staff details
            $staff = DB::table('evaluation_staff')
                ->where('id', $staffId)
                ->whereNull('deleted_at')
                ->first();
            
            if (!$staff) {
                return response()->json([
                    'success' => false,
                    'message' => 'Staff not found'
                ], 404);
            }
            
            // Get all evaluations where this staff was a subordinate
            $query = DB::table('evaluation_triggered')
                ->where('status', 'completed')
                ->whereNull('deleted_at')
                ->whereRaw("subordinates::text LIKE ?", ['%' . $staffId . '%']);
            
            if ($programId) {
                $query->where('program_id', $programId);
            }
            
            $evaluations = $query->orderBy('completed_at', 'desc')->get();
            
            $staffEvaluations = [];
            $aggregatedScores = [];
            
            foreach ($evaluations as $eval) {
                $responses = json_decode($eval->responses, true) ?? [];
                $subordinates = json_decode($eval->subordinates, true) ?? [];
                
                // Find this staff in subordinates
                $found = false;
                foreach ($subordinates as $sub) {
                    if ($sub['id'] === $staffId) {
                        $found = true;
                        break;
                    }
                }
                
                if (!$found) continue;
                
                $staffResponses = $responses[$staffId] ?? [];
                
                $staffEvaluations[] = [
                    'evaluation_id' => $eval->id,
                    'template_name' => $eval->template_name,
                    'evaluator_name' => $eval->evaluator_name,
                    'responses' => $staffResponses,
                    'completed_at' => $eval->completed_at
                ];
                
                // Aggregate scores for rating questions
                if (is_array($staffResponses)) {
                    foreach ($staffResponses as $questionKey => $answer) {
                        if (is_numeric($answer)) {
                            if (!isset($aggregatedScores[$questionKey])) {
                                $aggregatedScores[$questionKey] = [
                                    'question' => $questionKey,
                                    'scores' => [],
                                    'average' => 0
                                ];
                            }
                            $aggregatedScores[$questionKey]['scores'][] = (float)$answer;
                        }
                    }
                }
            }
            
            // Calculate averages
            foreach ($aggregatedScores as $key => &$scoreData) {
                if (count($scoreData['scores']) > 0) {
                    $scoreData['average'] = round(array_sum($scoreData['scores']) / count($scoreData['scores']), 2);
                    $scoreData['count'] = count($scoreData['scores']);
                }
            }
            
            return response()->json([
                'success' => true,
                'staff' => $staff,
                'evaluations' => $staffEvaluations,
                'aggregated_scores' => array_values($aggregatedScores),
                'total_evaluations' => count($staffEvaluations)
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to fetch staff evaluation detail: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch details: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get evaluators list with their evaluation counts
     */
    public function evaluatorsList(Request $request)
    {
        try {
            $user = $request->user();
            $programId = $request->query('program_id', $user->program_id ?? null);
            
            $query = DB::table('evaluation_triggered as et')
                ->join('evaluation_staff as es', 'et.evaluator_id', '=', 'es.id')
                ->leftJoin('evaluation_roles as er', 'es.role_id', '=', 'er.id')
                ->whereNull('et.deleted_at')
                ->whereNull('es.deleted_at')
                ->groupBy('et.evaluator_id', 'et.evaluator_name', 'et.evaluator_email', 'er.category', 'er.name')
                ->select(
                    'et.evaluator_id',
                    'et.evaluator_name',
                    'et.evaluator_email',
                    'er.category as department',
                    'er.name as role',
                    DB::raw('COUNT(*) as total_evaluations'),
                    DB::raw("COUNT(CASE WHEN et.status = 'completed' THEN 1 END) as completed_evaluations"),
                    DB::raw("COUNT(CASE WHEN et.status = 'pending' THEN 1 END) as pending_evaluations"),
                    DB::raw('SUM(et.subordinates_count) as total_subordinates_evaluated')
                );
            
            if ($programId) {
                $query->where('et.program_id', $programId);
            }
            
            $evaluators = $query->orderBy('et.evaluator_name')->get();
            
            return response()->json([
                'success' => true,
                'evaluators' => $evaluators
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to fetch evaluators: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch evaluators: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get list of staff who have been evaluated
     */
    public function evaluatedStaff(Request $request)
    {
        try {
            $user = $request->user();
            $programId = $request->query('program_id', $user->program_id ?? null);
            $evaluatorId = $request->query('evaluator_id');
            
            $query = DB::table('evaluation_triggered')
                ->where('status', 'completed')
                ->whereNull('deleted_at');
            
            if ($programId) {
                $query->where('program_id', $programId);
            }
            
            if ($evaluatorId) {
                $query->where('evaluator_id', $evaluatorId);
            }
            
            $evaluations = $query->get();
            
            $staffList = [];
            
            foreach ($evaluations as $eval) {
                $subordinates = json_decode($eval->subordinates, true) ?? [];
                
                foreach ($subordinates as $sub) {
                    $subId = $sub['id'];
                    if (!isset($staffList[$subId])) {
                        $staffList[$subId] = [
                            'id' => $subId,
                            'name' => $sub['name'] ?? 'Unknown',
                            'email' => $sub['email'] ?? '',
                            'employee_id' => $sub['employee_id'] ?? '',
                            'evaluation_count' => 0
                        ];
                    }
                    $staffList[$subId]['evaluation_count']++;
                }
            }
            
            // Sort by name
            usort($staffList, function($a, $b) {
                return strcasecmp($a['name'], $b['name']);
            });
            
            return response()->json([
                'success' => true,
                'staff' => array_values($staffList)
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to fetch evaluated staff: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch staff: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Export evaluation reports
     */
    public function exportReports(Request $request)
    {
        try {
            $user = $request->user();
            $programId = $request->query('program_id', $user->program_id ?? null);
            $format = $request->query('format', 'json'); // json, csv
            
            // Get all completed evaluations
            $query = DB::table('evaluation_triggered')
                ->where('status', 'completed')
                ->whereNull('deleted_at');
            
            if ($programId) {
                $query->where('program_id', $programId);
            }
            
            $evaluations = $query->orderBy('completed_at', 'desc')->get();
            
            $exportData = [];
            
            foreach ($evaluations as $eval) {
                $responses = json_decode($eval->responses, true) ?? [];
                $subordinates = json_decode($eval->subordinates, true) ?? [];
                $templateQuestions = json_decode($eval->template_questions, true) ?? [];
                
                foreach ($subordinates as $sub) {
                    $subId = $sub['id'];
                    $staffResponses = $responses[$subId] ?? [];
                    
                    $row = [
                        'evaluator_name' => $eval->evaluator_name,
                        'evaluator_email' => $eval->evaluator_email,
                        'staff_name' => $sub['name'] ?? 'Unknown',
                        'staff_email' => $sub['email'] ?? '',
                        'employee_id' => $sub['employee_id'] ?? '',
                        'template_name' => $eval->template_name,
                        'completed_at' => $eval->completed_at
                    ];
                    
                    // Add response fields
                    if (is_array($staffResponses)) {
                        foreach ($staffResponses as $question => $answer) {
                            $row['response_' . $question] = is_array($answer) ? json_encode($answer) : $answer;
                        }
                    }
                    
                    $exportData[] = $row;
                }
            }
            
            if ($format === 'csv') {
                $filename = 'evaluation_report_' . date('Y-m-d_H-i-s') . '.csv';
                
                $headers = [
                    'Content-Type' => 'text/csv',
                    'Content-Disposition' => 'attachment; filename="' . $filename . '"'
                ];
                
                $callback = function() use ($exportData) {
                    $file = fopen('php://output', 'w');
                    
                    if (count($exportData) > 0) {
                        fputcsv($file, array_keys($exportData[0]));
                    }
                    
                    foreach ($exportData as $row) {
                        fputcsv($file, $row);
                    }
                    
                    fclose($file);
                };
                
                return response()->stream($callback, 200, $headers);
            }
            
            return response()->json([
                'success' => true,
                'data' => $exportData,
                'total_records' => count($exportData)
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to export evaluation reports: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to export: ' . $e->getMessage()
            ], 500);
        }
    }
}
