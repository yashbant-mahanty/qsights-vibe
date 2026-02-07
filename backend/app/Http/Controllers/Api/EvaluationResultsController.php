<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EvaluationResultsController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $organizationId = $request->query('organization_id', $user->organization_id);
            $evaluationEventId = $request->query('evaluation_event_id');
            $staffId = $request->query('staff_id');
            $status = $request->query('status');
            
            $query = DB::table('evaluation_results as er')
                ->join('evaluation_events as ee', 'er.evaluation_event_id', '=', 'ee.id')
                ->join('evaluation_staff as es', 'er.staff_id', '=', 'es.id')
                ->join('evaluation_roles as role', 'es.role_id', '=', 'role.id')
                ->where('er.organization_id', $organizationId)
                ->whereNull('er.deleted_at')
                ->select(
                    'er.*',
                    'ee.title as evaluation_title',
                    'es.name as staff_name',
                    'es.email as staff_email',
                    'es.employee_id',
                    'role.name as role_name'
                );
            
            if ($evaluationEventId) {
                $query->where('er.evaluation_event_id', $evaluationEventId);
            }
            
            if ($staffId) {
                $query->where('er.staff_id', $staffId);
            }
            
            if ($status) {
                $query->where('er.status', $status);
            }
            
            $results = $query->orderBy('er.updated_at', 'desc')->get();
            
            return response()->json([
                'success' => true,
                'results' => $results
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch results: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function show(Request $request, $id)
    {
        try {
            $result = DB::table('evaluation_results as er')
                ->join('evaluation_events as ee', 'er.evaluation_event_id', '=', 'ee.id')
                ->join('evaluation_staff as es', 'er.staff_id', '=', 'es.id')
                ->join('evaluation_roles as role', 'es.role_id', '=', 'role.id')
                ->where('er.id', $id)
                ->whereNull('er.deleted_at')
                ->select('er.*', 'ee.title as evaluation_title', 'es.name as staff_name', 'role.name as role_name')
                ->first();
            
            if (!$result) {
                return response()->json([
                    'success' => false,
                    'message' => 'Result not found'
                ], 404);
            }
            
            // Get individual assignments and their scores
            $assignments = DB::table('evaluation_assignments as ea')
                ->join('evaluation_staff as evaluator', 'ea.evaluator_id', '=', 'evaluator.id')
                ->leftJoin('responses as r', 'ea.response_id', '=', 'r.id')
                ->where('ea.evaluation_event_id', $result->evaluation_event_id)
                ->where('ea.evaluatee_id', $result->staff_id)
                ->whereNull('ea.deleted_at')
                ->select(
                    'ea.id',
                    'evaluator.name as evaluator_name',
                    'ea.status',
                    'r.status as response_status',
                    'r.completed_at'
                )
                ->get();
            
            return response()->json([
                'success' => true,
                'result' => $result,
                'assignments' => $assignments
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch result: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Calculate/recalculate aggregated results for a staff member in an evaluation event
     */
    public function calculate(Request $request)
    {
        try {
            $user = $request->user();
            
            $validated = $request->validate([
                'evaluation_event_id' => 'required|uuid|exists:evaluation_events,id',
                'staff_id' => 'required|uuid|exists:evaluation_staff,id'
            ]);
            
            $eventId = $validated['evaluation_event_id'];
            $staffId = $validated['staff_id'];
            
            // Get staff details
            $staff = DB::table('evaluation_staff')->where('id', $staffId)->first();
            
            if (!$staff) {
                return response()->json([
                    'success' => false,
                    'message' => 'Staff not found'
                ], 404);
            }
            
            // Get all assignments for this staff member
            $assignments = DB::table('evaluation_assignments as ea')
                ->join('evaluation_staff as evaluator', 'ea.evaluator_id', '=', 'evaluator.id')
                ->leftJoin('responses as r', 'ea.response_id', '=', 'r.id')
                ->where('ea.evaluation_event_id', $eventId)
                ->where('ea.evaluatee_id', $staffId)
                ->whereNull('ea.deleted_at')
                ->select(
                    'ea.*',
                    'evaluator.id as eval_id',
                    'r.status as response_status',
                    'r.completed_at'
                )
                ->get();
            
            $totalAssignments = count($assignments);
            $completedAssignments = $assignments->where('response_status', 'completed')->count();
            $pendingAssignments = $totalAssignments - $completedAssignments;
            $completionRate = $totalAssignments > 0 ? round(($completedAssignments / $totalAssignments) * 100, 2) : 0;
            
            // Categorize evaluators by relationship
            $managerScores = [];
            $peerScores = [];
            $subordinateScores = [];
            $selfScore = null;
            
            foreach ($assignments as $assignment) {
                if ($assignment->response_status !== 'completed') {
                    continue;
                }
                
                // Determine relationship type
                if ($assignment->evaluator_id === $staffId) {
                    // Self-evaluation
                    $selfScore = $this->calculateResponseScore($assignment->response_id);
                } else {
                    $isManager = $this->isManager($assignment->evaluator_id, $staffId);
                    $isSubordinate = $this->isManager($staffId, $assignment->evaluator_id);
                    
                    $score = $this->calculateResponseScore($assignment->response_id);
                    
                    if ($isManager) {
                        $managerScores[] = $score;
                    } elseif ($isSubordinate) {
                        $subordinateScores[] = $score;
                    } else {
                        $peerScores[] = $score;
                    }
                }
            }
            
            // Calculate averages
            $managerAvg = !empty($managerScores) ? round(array_sum($managerScores) / count($managerScores), 2) : null;
            $peerAvg = !empty($peerScores) ? round(array_sum($peerScores) / count($peerScores), 2) : null;
            $subordinateAvg = !empty($subordinateScores) ? round(array_sum($subordinateScores) / count($subordinateScores), 2) : null;
            
            // Overall average (weighted or simple average)
            $allScores = array_merge($managerScores, $peerScores, $subordinateScores);
            if ($selfScore !== null) {
                $allScores[] = $selfScore;
            }
            $overallScore = !empty($allScores) ? round(array_sum($allScores) / count($allScores), 2) : null;
            
            // Check if result already exists
            $existingResult = DB::table('evaluation_results')
                ->where('evaluation_event_id', $eventId)
                ->where('staff_id', $staffId)
                ->whereNull('deleted_at')
                ->first();
            
            $aggregatedData = [
                'manager_evaluations' => count($managerScores),
                'peer_evaluations' => count($peerScores),
                'subordinate_evaluations' => count($subordinateScores),
                'self_evaluation' => $selfScore !== null ? 1 : 0,
                'total_evaluations' => count($allScores),
                'individual_scores' => $allScores
            ];
            
            if ($existingResult) {
                // Update existing result
                DB::table('evaluation_results')->where('id', $existingResult->id)->update([
                    'total_assignments' => $totalAssignments,
                    'completed_assignments' => $completedAssignments,
                    'pending_assignments' => $pendingAssignments,
                    'completion_rate' => $completionRate,
                    'overall_score' => $overallScore,
                    'manager_score' => $managerAvg,
                    'peer_score' => $peerAvg,
                    'subordinate_score' => $subordinateAvg,
                    'self_score' => $selfScore,
                    'aggregated_data' => json_encode($aggregatedData),
                    'calculated_at' => now(),
                    'updated_by' => $user->id,
                    'updated_at' => now()
                ]);
                
                $resultId = $existingResult->id;
                
                $this->logAudit('evaluation_result', $resultId, 'recalculated', 'Results recalculated', $user, $staff->organization_id);
            } else {
                // Create new result
                $resultId = Str::uuid()->toString();
                
                DB::table('evaluation_results')->insert([
                    'id' => $resultId,
                    'evaluation_event_id' => $eventId,
                    'staff_id' => $staffId,
                    'organization_id' => $staff->organization_id,
                    'program_id' => $staff->program_id,
                    'total_assignments' => $totalAssignments,
                    'completed_assignments' => $completedAssignments,
                    'pending_assignments' => $pendingAssignments,
                    'completion_rate' => $completionRate,
                    'overall_score' => $overallScore,
                    'manager_score' => $managerAvg,
                    'peer_score' => $peerAvg,
                    'subordinate_score' => $subordinateAvg,
                    'self_score' => $selfScore,
                    'aggregated_data' => json_encode($aggregatedData),
                    'status' => 'draft',
                    'calculated_at' => now(),
                    'created_by' => $user->id,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                $this->logAudit('evaluation_result', $resultId, 'calculated', 'Results calculated', $user, $staff->organization_id);
            }
            
            $result = DB::table('evaluation_results')->where('id', $resultId)->first();
            
            return response()->json([
                'success' => true,
                'message' => 'Results calculated successfully',
                'result' => $result
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to calculate results: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Publish results (make visible to staff)
     */
    public function publish(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            $result = DB::table('evaluation_results')->where('id', $id)->whereNull('deleted_at')->first();
            
            if (!$result) {
                return response()->json([
                    'success' => false,
                    'message' => 'Result not found'
                ], 404);
            }
            
            $validated = $request->validate([
                'admin_notes' => 'nullable|string'
            ]);
            
            DB::table('evaluation_results')->where('id', $id)->update([
                'status' => 'published',
                'published_at' => now(),
                'published_by' => $user->id,
                'admin_notes' => $validated['admin_notes'] ?? null,
                'updated_by' => $user->id,
                'updated_at' => now()
            ]);
            
            $this->logAudit('evaluation_result', $id, 'published', 'Results published', $user, $result->organization_id);
            
            $updatedResult = DB::table('evaluation_results')->where('id', $id)->first();
            
            return response()->json([
                'success' => true,
                'message' => 'Results published successfully',
                'result' => $updatedResult
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to publish results: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Helper: Calculate if evaluatorId is a manager of staffId
     */
    private function isManager($evaluatorId, $staffId)
    {
        return DB::table('evaluation_hierarchy')
            ->where('staff_id', $staffId)
            ->where('reports_to_id', $evaluatorId)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->exists();
    }
    
    /**
     * Helper: Calculate aggregate score from a response
     * This is a simplified version - you may want more complex logic
     */
    private function calculateResponseScore($responseId)
    {
        if (!$responseId) {
            return null;
        }
        
        // Get all answers for this response
        $answers = DB::table('answers')
            ->where('response_id', $responseId)
            ->get();
        
        if ($answers->isEmpty()) {
            return null;
        }
        
        $totalScore = 0;
        $scoredQuestions = 0;
        
        foreach ($answers as $answer) {
            // Get question details to determine if it's scoreable
            $question = DB::table('questions')->where('id', $answer->question_id)->first();
            
            if (!$question) {
                continue;
            }
            
            // For now, assume numeric answers are scores
            // You may want more sophisticated logic based on question type
            if (is_numeric($answer->answer_text)) {
                $totalScore += floatval($answer->answer_text);
                $scoredQuestions++;
            } elseif ($question->question_type === 'rating_scale') {
                // Extract numeric value from rating scale answer
                if (is_numeric($answer->answer_text)) {
                    $totalScore += floatval($answer->answer_text);
                    $scoredQuestions++;
                }
            }
        }
        
        if ($scoredQuestions === 0) {
            return null;
        }
        
        // Return average score (could be weighted or normalized differently)
        return round($totalScore / $scoredQuestions, 2);
    }
    
    public function destroy(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            $result = DB::table('evaluation_results')->where('id', $id)->whereNull('deleted_at')->first();
            
            if (!$result) {
                return response()->json([
                    'success' => false,
                    'message' => 'Result not found'
                ], 404);
            }
            
            DB::table('evaluation_results')->where('id', $id)->update(['deleted_at' => now()]);
            
            $this->logAudit('evaluation_result', $id, 'deleted', 'Result deleted', $user, $result->organization_id);
            
            return response()->json([
                'success' => true,
                'message' => 'Result deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete result: ' . $e->getMessage()
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
