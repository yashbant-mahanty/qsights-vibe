<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvaluationEvent;
use App\Models\EvaluationAssignment;
use App\Models\User;
use App\Models\Participant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class EvaluationEventController extends Controller
{
    /**
     * List all evaluation events (with filters)
     */
    public function index(Request $request)
    {
        $query = EvaluationEvent::with(['questionnaire', 'organization', 'program', 'creator'])
            ->withCount(['assignments', 'responses']);

        // Filter by organization
        if ($request->has('organization_id')) {
            $query->where('organization_id', $request->organization_id);
        }

        // Filter by program
        if ($request->has('program_id')) {
            $query->where('program_id', $request->program_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        $events = $query
            ->orderBy('updated_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($events);
    }

    /**
     * Create a new evaluation event
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'questionnaire_id' => 'required|integer|exists:questionnaires,id',
            'organization_id' => 'nullable|uuid|exists:organizations,id',
            'program_id' => 'nullable|uuid|exists:programs,id',
            'evaluation_type' => 'nullable|in:downward,upward,360',
            'is_hierarchy_based' => 'nullable|boolean',
            'is_anonymous' => 'nullable|boolean',
            'show_individual_responses' => 'nullable|boolean',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'settings' => 'nullable|array',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = 'draft';

        $event = EvaluationEvent::create($validated);

        return response()->json([
            'message' => 'Evaluation event created successfully',
            'data' => $event->load(['questionnaire', 'organization', 'program', 'creator'])
        ], 201);
    }

    /**
     * Get a specific evaluation event
     */
    public function show(string $id)
    {
        $event = EvaluationEvent::with([
            'questionnaire.sections.questions',
            'organization',
            'program',
            'creator',
            'assignments.evaluator',
            'assignments.evaluatee'
        ])
        ->withCount(['assignments', 'responses'])
        ->findOrFail($id);

        // Add completion stats
        $event->completion_stats = $event->getCompletionStats();

        return response()->json(['data' => $event]);
    }

    /**
     * Update an evaluation event
     */
    public function update(Request $request, string $id)
    {
        $event = EvaluationEvent::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'questionnaire_id' => 'sometimes|integer|exists:questionnaires,id',
            'organization_id' => 'nullable|uuid|exists:organizations,id',
            'program_id' => 'nullable|uuid|exists:programs,id',
            'evaluation_type' => 'nullable|in:downward,upward,360',
            'is_hierarchy_based' => 'nullable|boolean',
            'is_anonymous' => 'nullable|boolean',
            'show_individual_responses' => 'nullable|boolean',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'status' => 'sometimes|in:draft,active,paused,completed,cancelled',
            'settings' => 'nullable|array',
        ]);

        $event->update($validated);

        return response()->json([
            'message' => 'Evaluation event updated successfully',
            'data' => $event->fresh(['questionnaire', 'organization', 'program', 'creator'])
        ]);
    }

    /**
     * Delete an evaluation event
     */
    public function destroy(string $id)
    {
        $event = EvaluationEvent::findOrFail($id);
        $event->delete();

        return response()->json(['message' => 'Evaluation event deleted successfully']);
    }

    /**
     * Activate an evaluation event
     */
    public function activate(string $id)
    {
        $event = EvaluationEvent::findOrFail($id);

        if ($event->status !== 'draft' && $event->status !== 'paused') {
            return response()->json([
                'message' => 'Event can only be activated from draft or paused status'
            ], 422);
        }

        $event->update(['status' => 'active']);

        return response()->json([
            'message' => 'Evaluation event activated successfully',
            'data' => $event
        ]);
    }

    /**
     * Pause an evaluation event
     */
    public function pause(string $id)
    {
        $event = EvaluationEvent::findOrFail($id);

        if ($event->status !== 'active') {
            return response()->json([
                'message' => 'Only active events can be paused'
            ], 422);
        }

        $event->update(['status' => 'paused']);

        return response()->json([
            'message' => 'Evaluation event paused successfully',
            'data' => $event
        ]);
    }

    /**
     * Complete an evaluation event
     */
    public function complete(string $id)
    {
        $event = EvaluationEvent::findOrFail($id);
        $event->update(['status' => 'completed']);

        return response()->json([
            'message' => 'Evaluation event marked as completed',
            'data' => $event
        ]);
    }

    /**
     * Auto-generate assignments from hierarchy
     * Based on evaluation_type, creates assignments for all relationships
     */
    public function generateAssignments(Request $request, string $id)
    {
        $event = EvaluationEvent::findOrFail($id);

        $validated = $request->validate([
            'evaluation_type' => 'required|in:manager_to_subordinate,subordinate_to_manager,360_degree,peer_to_peer,self_only',
            'allow_self_evaluation' => 'nullable|boolean',
        ]);

        // Get all hierarchy relationships for this organization
        $query = DB::table('evaluation_hierarchy')
            ->where('is_active', true);
            
        if ($event->organization_id) {
            $query->where('organization_id', $event->organization_id);
        }
        
        $hierarchies = $query->get();
        
        // Get all staff
        $staffQuery = DB::table('evaluation_staff')
            ->where('status', 'active');
            
        if ($event->organization_id) {
            $staffQuery->where('organization_id', $event->organization_id);
        }
        
        $staff = $staffQuery->get();
        $staffMap = $staff->keyBy('id');

        $created = [];
        $skipped = [];

        DB::beginTransaction();
        try {
            // Generate based on evaluation type
            switch ($validated['evaluation_type']) {
                case 'manager_to_subordinate':
                    // Manager evaluates subordinate (downward)
                    foreach ($hierarchies as $h) {
                        $result = $this->createAssignment($event->id, $h->reports_to_id, $h->staff_id, 'downward');
                        if ($result['created']) {
                            $created[] = $result['assignment'];
                        } else {
                            $skipped[] = $result;
                        }
                    }
                    break;

                case 'subordinate_to_manager':
                    // Subordinate evaluates manager (upward)
                    foreach ($hierarchies as $h) {
                        $result = $this->createAssignment($event->id, $h->staff_id, $h->reports_to_id, 'upward');
                        if ($result['created']) {
                            $created[] = $result['assignment'];
                        } else {
                            $skipped[] = $result;
                        }
                    }
                    break;

                case '360_degree':
                    // Both directions
                    foreach ($hierarchies as $h) {
                        // Downward
                        $result = $this->createAssignment($event->id, $h->reports_to_id, $h->staff_id, 'downward');
                        if ($result['created']) {
                            $created[] = $result['assignment'];
                        } else {
                            $skipped[] = $result;
                        }
                        
                        // Upward
                        $result = $this->createAssignment($event->id, $h->staff_id, $h->reports_to_id, 'upward');
                        if ($result['created']) {
                            $created[] = $result['assignment'];
                        } else {
                            $skipped[] = $result;
                        }
                    }
                    break;

                case 'peer_to_peer':
                    // Peers at same role level - TBD based on role matching
                    // For now, skip
                    break;

                case 'self_only':
                    // Only self evaluations
                    break;
            }

            // Add self evaluations if enabled
            if ($request->get('allow_self_evaluation', false)) {
                foreach ($staff as $s) {
                    $result = $this->createAssignment($event->id, $s->id, $s->id, 'self');
                    if ($result['created']) {
                        $created[] = $result['assignment'];
                    } else {
                        $skipped[] = $result;
                    }
                }
            }

            // Update event with assignment counts
            $event->touch();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Assignments generated successfully',
                'created_count' => count($created),
                'skipped_count' => count($skipped),
                'total_staff' => $staff->count(),
                'total_relationships' => $hierarchies->count(),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate assignments',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper to create a single assignment
     */
    private function createAssignment(string $eventId, string $evaluatorId, string $evaluateeId, string $type): array
    {
        // Check if already exists
        $existing = EvaluationAssignment::where('evaluation_event_id', $eventId)
            ->where('evaluator_id', $evaluatorId)
            ->where('evaluatee_id', $evaluateeId)
            ->first();

        if ($existing) {
            return ['created' => false, 'reason' => 'already_exists', 'evaluator' => $evaluatorId, 'evaluatee' => $evaluateeId];
        }

        $assignment = EvaluationAssignment::create([
            'evaluation_event_id' => $eventId,
            'evaluator_id' => $evaluatorId,
            'evaluatee_id' => $evaluateeId,
            'evaluator_type' => $type,
            'status' => 'pending',
            'access_token' => Str::random(64),
            'assigned_at' => now(),
            'send_invitation' => true,
            'send_reminders' => true,
        ]);

        return ['created' => true, 'assignment' => $assignment];
    }

    /**
     * Get available evaluatees for the current manager
     * Returns users/participants who report to the current user
     */
    public function getAvailableEvaluatees(Request $request, string $id)
    {
        $event = EvaluationEvent::findOrFail($id);
        $currentUser = Auth::user();

        // Get direct reports (Users)
        $userReports = User::where('reports_to_user_id', $currentUser->id)
            ->where('status', 'active')
            ->select('id', 'name', 'email', 'role')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'type' => 'user',
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ];
            });

        // Get direct reports (Participants)
        $participantReports = Participant::where('reports_to_user_id', $currentUser->id)
            ->where('status', 'active')
            ->select('id', 'name', 'email')
            ->get()
            ->map(function ($participant) {
                return [
                    'id' => $participant->id,
                    'type' => 'participant',
                    'name' => $participant->name,
                    'email' => $participant->email,
                    'role' => 'Participant',
                ];
            });

        // Also get participants who report to participant managers under this user
        $subordinateManagerIds = User::where('reports_to_user_id', $currentUser->id)
            ->pluck('id');

        $indirectParticipants = Participant::whereIn('reports_to_user_id', $subordinateManagerIds)
            ->where('status', 'active')
            ->select('id', 'name', 'email', 'reports_to_user_id')
            ->get()
            ->map(function ($participant) {
                $manager = User::find($participant->reports_to_user_id);
                return [
                    'id' => $participant->id,
                    'type' => 'participant',
                    'name' => $participant->name,
                    'email' => $participant->email,
                    'role' => 'Participant',
                    'via_manager' => $manager ? $manager->name : null,
                ];
            });

        // Get already assigned evaluatees for this event
        $existingAssignments = EvaluationAssignment::where('evaluation_event_id', $id)
            ->where('triggered_by', $currentUser->id)
            ->get()
            ->map(function ($assignment) {
                return $assignment->evaluatee_type . '_' . $assignment->evaluatee_id;
            })
            ->toArray();

        // Mark already assigned
        $allEvaluatees = $userReports->concat($participantReports)->concat($indirectParticipants)
            ->map(function ($evaluatee) use ($existingAssignments) {
                $key = $evaluatee['type'] . '_' . $evaluatee['id'];
                $evaluatee['already_assigned'] = in_array($key, $existingAssignments);
                return $evaluatee;
            });

        return response()->json([
            'data' => $allEvaluatees,
            'total' => $allEvaluatees->count(),
            'already_assigned_count' => collect($allEvaluatees)->where('already_assigned', true)->count(),
        ]);
    }

    /**
     * Trigger evaluation for selected evaluatees
     * Creates assignments and sends notification emails
     */
    public function triggerEvaluation(Request $request, string $id)
    {
        $event = EvaluationEvent::findOrFail($id);
        $currentUser = Auth::user();

        if ($event->status !== 'active') {
            return response()->json([
                'message' => 'Evaluation event must be active to trigger evaluations'
            ], 422);
        }

        $validated = $request->validate([
            'evaluatees' => 'required|array|min:1',
            'evaluatees.*.id' => 'required|uuid',
            'evaluatees.*.type' => 'required|in:user,participant',
            'send_email' => 'nullable|boolean',
        ]);

        $created = [];
        $skipped = [];

        DB::beginTransaction();
        try {
            foreach ($validated['evaluatees'] as $evaluatee) {
                // Check if already assigned
                $existing = EvaluationAssignment::where('evaluation_event_id', $id)
                    ->where('evaluatee_type', $evaluatee['type'])
                    ->where('evaluatee_id', $evaluatee['id'])
                    ->first();

                if ($existing) {
                    $skipped[] = $evaluatee;
                    continue;
                }

                // Create assignment
                $assignment = EvaluationAssignment::create([
                    'evaluation_event_id' => $id,
                    'evaluator_type' => 'user',
                    'evaluator_id' => $currentUser->id,
                    'evaluatee_type' => $evaluatee['type'],
                    'evaluatee_id' => $evaluatee['id'],
                    'triggered_by' => $currentUser->id,
                    'access_token' => Str::random(64),
                    'status' => 'pending',
                    'sent_at' => now(),
                ]);

                $created[] = $assignment;

                // TODO: Send email notification
                if ($request->get('send_email', true)) {
                    // $this->sendEvaluationEmail($assignment);
                }
            }

            // Update event timestamp to reflect last activity
            $event->touch();

            DB::commit();

            return response()->json([
                'message' => 'Evaluation triggered successfully',
                'created_count' => count($created),
                'skipped_count' => count($skipped),
                'data' => $created,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to trigger evaluation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get assignments for current manager's team
     */
    public function getMyAssignments(Request $request, string $id)
    {
        $event = EvaluationEvent::findOrFail($id);
        $currentUser = Auth::user();

        $assignments = EvaluationAssignment::with(['evaluateeUser', 'evaluateeParticipant'])
            ->where('evaluation_event_id', $id)
            ->where('triggered_by', $currentUser->id)
            ->get()
            ->map(function ($assignment) {
                $evaluatee = $assignment->evaluatee_type === 'user' 
                    ? $assignment->evaluateeUser 
                    : $assignment->evaluateeParticipant;

                return [
                    'id' => $assignment->id,
                    'evaluatee_type' => $assignment->evaluatee_type,
                    'evaluatee_id' => $assignment->evaluatee_id,
                    'evaluatee_name' => $evaluatee ? $evaluatee->name : 'Unknown',
                    'evaluatee_email' => $evaluatee ? $evaluatee->email : null,
                    'status' => $assignment->status,
                    'sent_at' => $assignment->sent_at,
                    'completed_at' => $assignment->completed_at,
                    'reminder_count' => $assignment->reminder_count,
                    'access_token' => $assignment->access_token,
                ];
            });

        $stats = [
            'total' => $assignments->count(),
            'pending' => $assignments->where('status', 'pending')->count(),
            'in_progress' => $assignments->where('status', 'in_progress')->count(),
            'completed' => $assignments->where('status', 'completed')->count(),
        ];

        return response()->json([
            'data' => $assignments,
            'stats' => $stats,
        ]);
    }

    /**
     * Send reminder to pending evaluatees
     */
    public function sendReminder(Request $request, string $id)
    {
        $event = EvaluationEvent::findOrFail($id);
        $currentUser = Auth::user();

        $validated = $request->validate([
            'assignment_ids' => 'nullable|array',
            'assignment_ids.*' => 'uuid',
        ]);

        $query = EvaluationAssignment::where('evaluation_event_id', $id)
            ->where('triggered_by', $currentUser->id)
            ->whereIn('status', ['pending', 'in_progress']);

        if (!empty($validated['assignment_ids'])) {
            $query->whereIn('id', $validated['assignment_ids']);
        }

        $assignments = $query->get();

        $remindersSent = 0;
        foreach ($assignments as $assignment) {
            // TODO: Send reminder email
            $assignment->increment('reminder_count');
            $remindersSent++;
        }

        // Update event timestamp to reflect last activity
        $event->touch();

        return response()->json([
            'message' => "Reminders sent to {$remindersSent} evaluatees",
            'count' => $remindersSent,
        ]);
    }
}
