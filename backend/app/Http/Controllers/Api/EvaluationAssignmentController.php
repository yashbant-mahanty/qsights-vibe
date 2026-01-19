<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EvaluationAssignmentController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $organizationId = $request->query('organization_id', $user->organization_id);
            $evaluationEventId = $request->query('evaluation_event_id');
            $evaluatorId = $request->query('evaluator_id');
            $evaluateeId = $request->query('evaluatee_id');
            $status = $request->query('status');
            
            $query = DB::table('evaluation_assignments as ea')
                ->join('evaluation_events as ee', 'ea.evaluation_event_id', '=', 'ee.id')
                ->join('evaluation_staff as evaluator', 'ea.evaluator_id', '=', 'evaluator.id')
                ->join('evaluation_staff as evaluatee', 'ea.evaluatee_id', '=', 'evaluatee.id')
                ->leftJoin('responses as r', 'ea.response_id', '=', 'r.id')
                ->where('ea.organization_id', $organizationId)
                ->whereNull('ea.deleted_at')
                ->select(
                    'ea.*',
                    'ee.title as evaluation_title',
                    'ee.status as evaluation_status',
                    'evaluator.name as evaluator_name',
                    'evaluator.email as evaluator_email',
                    'evaluatee.name as evaluatee_name',
                    'evaluatee.email as evaluatee_email',
                    'r.status as response_status',
                    'r.completed_at as response_completed_at'
                );
            
            if ($evaluationEventId) {
                $query->where('ea.evaluation_event_id', $evaluationEventId);
            }
            
            if ($evaluatorId) {
                $query->where('ea.evaluator_id', $evaluatorId);
            }
            
            if ($evaluateeId) {
                $query->where('ea.evaluatee_id', $evaluateeId);
            }
            
            if ($status) {
                $query->where('ea.status', $status);
            }
            
            $assignments = $query->orderBy('ea.created_at', 'desc')->get();
            
            return response()->json([
                'success' => true,
                'assignments' => $assignments
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch assignments: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function show(Request $request, $id)
    {
        try {
            $assignment = DB::table('evaluation_assignments as ea')
                ->join('evaluation_events as ee', 'ea.evaluation_event_id', '=', 'ee.id')
                ->join('evaluation_staff as evaluator', 'ea.evaluator_id', '=', 'evaluator.id')
                ->join('evaluation_staff as evaluatee', 'ea.evaluatee_id', '=', 'evaluatee.id')
                ->leftJoin('responses as r', 'ea.response_id', '=', 'r.id')
                ->where('ea.id', $id)
                ->whereNull('ea.deleted_at')
                ->select(
                    'ea.*',
                    'ee.title as evaluation_title',
                    'ee.questionnaire_id',
                    'evaluator.name as evaluator_name',
                    'evaluator.email as evaluator_email',
                    'evaluatee.name as evaluatee_name',
                    'evaluatee.email as evaluatee_email',
                    'r.status as response_status'
                )
                ->first();
            
            if (!$assignment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Assignment not found'
                ], 404);
            }
            
            return response()->json([
                'success' => true,
                'assignment' => $assignment
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch assignment: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function store(Request $request)
    {
        try {
            $user = $request->user();
            
            $validated = $request->validate([
                'evaluation_event_id' => 'required|uuid|exists:evaluation_events,id',
                'evaluator_id' => 'required|uuid|exists:evaluation_staff,id',
                'evaluatee_id' => 'required|uuid|exists:evaluation_staff,id|different:evaluator_id',
                'organization_id' => 'required|uuid|exists:organizations,id',
                'program_id' => 'nullable|uuid|exists:programs,id',
                'due_date' => 'nullable|date',
                'send_notification' => 'boolean',
                'notification_sent_at' => 'nullable|date'
            ]);
            
            // Check for duplicate assignment
            $exists = DB::table('evaluation_assignments')
                ->where('evaluation_event_id', $validated['evaluation_event_id'])
                ->where('evaluator_id', $validated['evaluator_id'])
                ->where('evaluatee_id', $validated['evaluatee_id'])
                ->whereNull('deleted_at')
                ->exists();
            
            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'This assignment already exists'
                ], 422);
            }
            
            $assignmentId = Str::uuid()->toString();
            $accessToken = Str::random(64);
            
            DB::table('evaluation_assignments')->insert([
                'id' => $assignmentId,
                'evaluation_event_id' => $validated['evaluation_event_id'],
                'evaluator_id' => $validated['evaluator_id'],
                'evaluatee_id' => $validated['evaluatee_id'],
                'organization_id' => $validated['organization_id'],
                'program_id' => $validated['program_id'] ?? null,
                'status' => 'pending',
                'access_token' => $accessToken,
                'due_date' => $validated['due_date'] ?? null,
                'send_notification' => $validated['send_notification'] ?? true,
                'notification_sent_at' => $validated['notification_sent_at'] ?? null,
                'reminder_count' => 0,
                'created_by' => $user->id,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            $this->logAudit('evaluation_assignment', $assignmentId, 'created', 'Evaluation assignment created', $user, $validated['organization_id']);
            
            $assignment = DB::table('evaluation_assignments')->where('id', $assignmentId)->first();
            
            return response()->json([
                'success' => true,
                'message' => 'Assignment created successfully',
                'assignment' => $assignment
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create assignment: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Auto-assign evaluations based on hierarchy
     */
    public function autoAssign(Request $request)
    {
        try {
            $user = $request->user();
            
            $validated = $request->validate([
                'evaluation_event_id' => 'required|uuid|exists:evaluation_events,id',
                'organization_id' => 'required|uuid|exists:organizations,id',
                'program_id' => 'nullable|uuid|exists:programs,id',
                'include_managers' => 'boolean',
                'include_peers' => 'boolean',
                'include_subordinates' => 'boolean',
                'include_self' => 'boolean',
                'due_date' => 'nullable|date'
            ]);
            
            $eventId = $validated['evaluation_event_id'];
            $orgId = $validated['organization_id'];
            $progId = $validated['program_id'] ?? null;
            
            $includeManagers = $validated['include_managers'] ?? true;
            $includePeers = $validated['include_peers'] ?? false;
            $includeSubordinates = $validated['include_subordinates'] ?? false;
            $includeSelf = $validated['include_self'] ?? false;
            
            $created = 0;
            $skipped = 0;
            
            // Get all active staff
            $staff = DB::table('evaluation_staff')
                ->where('organization_id', $orgId)
                ->where('status', 'active')
                ->whereNull('deleted_at')
                ->get();
            
            foreach ($staff as $evaluatee) {
                // Assign manager(s) to evaluate this staff
                if ($includeManagers) {
                    $managers = DB::table('evaluation_hierarchy')
                        ->where('staff_id', $evaluatee->id)
                        ->where('organization_id', $orgId)
                        ->where('is_active', true)
                        ->whereNull('deleted_at')
                        ->pluck('reports_to_id');
                    
                    foreach ($managers as $managerId) {
                        $result = $this->createAssignment($eventId, $managerId, $evaluatee->id, $orgId, $progId, $validated['due_date'] ?? null, $user);
                        if ($result) $created++;
                        else $skipped++;
                    }
                }
                
                // Assign subordinates to evaluate this staff
                if ($includeSubordinates) {
                    $subordinates = DB::table('evaluation_hierarchy')
                        ->where('reports_to_id', $evaluatee->id)
                        ->where('organization_id', $orgId)
                        ->where('is_active', true)
                        ->whereNull('deleted_at')
                        ->pluck('staff_id');
                    
                    foreach ($subordinates as $subordinateId) {
                        $result = $this->createAssignment($eventId, $subordinateId, $evaluatee->id, $orgId, $progId, $validated['due_date'] ?? null, $user);
                        if ($result) $created++;
                        else $skipped++;
                    }
                }
                
                // Assign self-evaluation
                if ($includeSelf) {
                    $result = $this->createAssignment($eventId, $evaluatee->id, $evaluatee->id, $orgId, $progId, $validated['due_date'] ?? null, $user);
                    if ($result) $created++;
                    else $skipped++;
                }
                
                // Assign peers (staff with same manager)
                if ($includePeers) {
                    $manager = DB::table('evaluation_hierarchy')
                        ->where('staff_id', $evaluatee->id)
                        ->where('is_primary', true)
                        ->where('is_active', true)
                        ->whereNull('deleted_at')
                        ->value('reports_to_id');
                    
                    if ($manager) {
                        $peers = DB::table('evaluation_hierarchy')
                            ->where('reports_to_id', $manager)
                            ->where('staff_id', '!=', $evaluatee->id)
                            ->where('is_primary', true)
                            ->where('is_active', true)
                            ->whereNull('deleted_at')
                            ->pluck('staff_id');
                        
                        foreach ($peers as $peerId) {
                            $result = $this->createAssignment($eventId, $peerId, $evaluatee->id, $orgId, $progId, $validated['due_date'] ?? null, $user);
                            if ($result) $created++;
                            else $skipped++;
                        }
                    }
                }
            }
            
            $this->logAudit('evaluation_assignment', $eventId, 'auto_assigned', "Auto-assigned $created evaluations", $user, $orgId);
            
            return response()->json([
                'success' => true,
                'message' => "Auto-assignment completed: $created created, $skipped skipped",
                'created' => $created,
                'skipped' => $skipped
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to auto-assign: ' . $e->getMessage()
            ], 500);
        }
    }
    
    private function createAssignment($eventId, $evaluatorId, $evaluateeId, $orgId, $progId, $dueDate, $user)
    {
        try {
            // Check if already exists
            $exists = DB::table('evaluation_assignments')
                ->where('evaluation_event_id', $eventId)
                ->where('evaluator_id', $evaluatorId)
                ->where('evaluatee_id', $evaluateeId)
                ->whereNull('deleted_at')
                ->exists();
            
            if ($exists) {
                return false;
            }
            
            $assignmentId = Str::uuid()->toString();
            $accessToken = Str::random(64);
            
            DB::table('evaluation_assignments')->insert([
                'id' => $assignmentId,
                'evaluation_event_id' => $eventId,
                'evaluator_id' => $evaluatorId,
                'evaluatee_id' => $evaluateeId,
                'organization_id' => $orgId,
                'program_id' => $progId,
                'status' => 'pending',
                'access_token' => $accessToken,
                'due_date' => $dueDate,
                'send_notification' => true,
                'reminder_count' => 0,
                'created_by' => $user->id,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            return true;
        } catch (\Exception $e) {
            \Log::error('Failed to create assignment: ' . $e->getMessage());
            return false;
        }
    }
    
    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            $assignment = DB::table('evaluation_assignments')->where('id', $id)->whereNull('deleted_at')->first();
            
            if (!$assignment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Assignment not found'
                ], 404);
            }
            
            $validated = $request->validate([
                'status' => 'nullable|in:pending,in_progress,completed,overdue,cancelled',
                'due_date' => 'nullable|date',
                'response_id' => 'nullable|uuid|exists:responses,id'
            ]);
            
            $oldValues = (array) $assignment;
            
            $updateData = array_merge(
                $validated,
                [
                    'updated_by' => $user->id,
                    'updated_at' => now()
                ]
            );
            
            DB::table('evaluation_assignments')->where('id', $id)->update($updateData);
            
            $this->logAudit('evaluation_assignment', $id, 'updated', 'Assignment updated', $user, $assignment->organization_id, $oldValues, $validated);
            
            $updatedAssignment = DB::table('evaluation_assignments')->where('id', $id)->first();
            
            return response()->json([
                'success' => true,
                'message' => 'Assignment updated successfully',
                'assignment' => $updatedAssignment
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update assignment: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function destroy(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            $assignment = DB::table('evaluation_assignments')->where('id', $id)->whereNull('deleted_at')->first();
            
            if (!$assignment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Assignment not found'
                ], 404);
            }
            
            // Check if there's a linked response
            if ($assignment->response_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete assignment with existing response. Cancel it instead.'
                ], 422);
            }
            
            DB::table('evaluation_assignments')->where('id', $id)->update(['deleted_at' => now()]);
            
            $this->logAudit('evaluation_assignment', $id, 'deleted', 'Assignment deleted', $user, $assignment->organization_id);
            
            return response()->json([
                'success' => true,
                'message' => 'Assignment deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete assignment: ' . $e->getMessage()
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
