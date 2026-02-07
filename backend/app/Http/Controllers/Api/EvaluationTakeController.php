<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvaluationEvent;
use App\Models\EvaluationAssignment;
use App\Models\EvaluationResponse;
use App\Models\User;
use App\Models\Participant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class EvaluationTakeController extends Controller
{
    /**
     * Get evaluation details by access token (public route)
     * Used when staff clicks on evaluation link
     */
    public function getByToken(string $token)
    {
        $assignment = EvaluationAssignment::with([
            'evaluationEvent.questionnaire.sections.questions',
            'evaluationEvent.organization',
            'evaluatorUser',
        ])
        ->where('access_token', $token)
        ->first();

        if (!$assignment) {
            return response()->json([
                'message' => 'Invalid or expired evaluation link'
            ], 404);
        }

        $event = $assignment->evaluationEvent;

        // Check if event is still active
        if ($event->status !== 'active') {
            return response()->json([
                'message' => 'This evaluation is no longer active',
                'status' => $event->status
            ], 422);
        }

        // Check if within date range
        if (now()->lt($event->start_date)) {
            return response()->json([
                'message' => 'This evaluation has not started yet',
                'starts_at' => $event->start_date
            ], 422);
        }

        if (now()->gt($event->end_date)) {
            return response()->json([
                'message' => 'This evaluation has ended',
                'ended_at' => $event->end_date
            ], 422);
        }

        // Check if already completed
        if ($assignment->status === 'completed') {
            return response()->json([
                'message' => 'You have already completed this evaluation',
                'completed_at' => $assignment->completed_at
            ], 422);
        }

        // Mark as in progress if pending
        if ($assignment->status === 'pending') {
            $assignment->update(['status' => 'in_progress']);
        }

        // Get evaluator name for display
        $evaluatorName = $assignment->evaluatorUser ? $assignment->evaluatorUser->name : 'Your Manager';

        // Get existing responses if any (for save & continue)
        $existingResponses = EvaluationResponse::where('evaluation_assignment_id', $assignment->id)
            ->get()
            ->keyBy('question_id')
            ->map(function ($response) {
                return $response->answer;
            });

        return response()->json([
            'data' => [
                'assignment_id' => $assignment->id,
                'event' => [
                    'id' => $event->id,
                    'name' => $event->name,
                    'description' => $event->description,
                    'is_anonymous' => $event->is_anonymous,
                    'end_date' => $event->end_date,
                ],
                'questionnaire' => $event->questionnaire,
                'evaluator_name' => $evaluatorName,
                'existing_responses' => $existingResponses,
                'status' => $assignment->status,
            ]
        ]);
    }

    /**
     * Submit evaluation responses
     */
    public function submit(Request $request, string $token)
    {
        $assignment = EvaluationAssignment::with(['evaluationEvent'])
            ->where('access_token', $token)
            ->first();

        if (!$assignment) {
            return response()->json([
                'message' => 'Invalid or expired evaluation link'
            ], 404);
        }

        $event = $assignment->evaluationEvent;

        // Validate event is active
        if ($event->status !== 'active') {
            return response()->json([
                'message' => 'This evaluation is no longer active'
            ], 422);
        }

        // Validate within date range
        if (!now()->between($event->start_date, $event->end_date)) {
            return response()->json([
                'message' => 'This evaluation is outside the valid date range'
            ], 422);
        }

        // Validate already completed
        if ($assignment->status === 'completed') {
            return response()->json([
                'message' => 'This evaluation has already been submitted'
            ], 422);
        }

        $validated = $request->validate([
            'responses' => 'required|array',
            'responses.*.question_id' => 'required|uuid',
            'responses.*.answer' => 'required',
            'responses.*.score' => 'nullable|numeric',
            'is_final' => 'nullable|boolean', // true = submit, false = save draft
        ]);

        DB::beginTransaction();
        try {
            // Delete existing responses (for re-submission)
            EvaluationResponse::where('evaluation_assignment_id', $assignment->id)->delete();

            // Save new responses
            foreach ($validated['responses'] as $response) {
                EvaluationResponse::create([
                    'evaluation_assignment_id' => $assignment->id,
                    'evaluation_event_id' => $event->id,
                    'question_id' => $response['question_id'],
                    'answer' => $response['answer'],
                    'score' => $response['score'] ?? null,
                ]);
            }

            // Update assignment status
            if ($request->get('is_final', true)) {
                $assignment->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => $request->get('is_final', true) 
                    ? 'Evaluation submitted successfully' 
                    : 'Responses saved as draft',
                'status' => $assignment->fresh()->status,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to save responses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get pending evaluations for current user
     */
    public function getMyPendingEvaluations(Request $request)
    {
        $currentUser = Auth::user();

        // Find the staff member record for this user
        $staffMember = DB::table('evaluation_staff')
            ->where('email', $currentUser->email)
            ->orWhere('user_id', $currentUser->id)
            ->whereNull('deleted_at')
            ->first();

        if (!$staffMember) {
            return response()->json([
                'data' => [],
                'count' => 0,
                'message' => 'No staff profile found'
            ]);
        }

        // Query evaluation_triggered table for pending/in-progress evaluations where this staff is the evaluator
        $triggeredEvaluations = DB::table('evaluation_triggered')
            ->where('evaluator_id', $staffMember->id)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->orderBy('triggered_at', 'desc')
            ->get()
            ->map(function ($triggered) use ($staffMember) {
                // Decode subordinates JSON and responses
                $subordinates = json_decode($triggered->subordinates, true) ?? [];
                $responses = json_decode($triggered->responses, true) ?? [];
                
                // Count completed vs total subordinates
                $totalSubordinates = count($subordinates);
                $completedSubordinates = 0;
                
                foreach ($subordinates as $subordinate) {
                    $subordinateId = $subordinate['id'] ?? 'unknown';
                    if (isset($responses[$subordinateId])) {
                        $completedSubordinates++;
                    }
                }
                
                // Determine overall status
                // All completed -> 'completed'
                // Some completed -> 'in_progress'  
                // None completed -> 'pending'
                $taskStatus = $triggered->status;
                if ($completedSubordinates === $totalSubordinates) {
                    $taskStatus = 'completed';
                } elseif ($completedSubordinates > 0) {
                    $taskStatus = 'in_progress';
                }
                
                // Return one task per evaluation (not per subordinate)
                return [
                    'id' => $triggered->id,
                    'access_token' => $triggered->access_token,
                    'event_name' => $triggered->template_name,
                    'event_description' => 'Evaluate ' . $totalSubordinates . ' team member(s)',
                    'evaluator_name' => $triggered->evaluator_name,
                    'is_my_task' => true,
                    'status' => $taskStatus,
                    'due_date' => $triggered->end_date,
                    'sent_at' => $triggered->triggered_at,
                    'triggered_id' => $triggered->id,
                    'subordinates_count' => $totalSubordinates,
                    'completed_count' => $completedSubordinates,
                    'subordinates' => $subordinates,
                    'completed_at' => $taskStatus === 'completed' ? $triggered->completed_at : null
                ];
            });

        return response()->json([
            'data' => $triggeredEvaluations->values(),
            'count' => $triggeredEvaluations->count(),
        ]);
    }

    /**
     * Get completed evaluations for current user
     */
    public function getMyCompletedEvaluations(Request $request)
    {
        $currentUser = Auth::user();

        $assignments = EvaluationAssignment::with(['evaluationEvent'])
            ->where(function ($query) use ($currentUser) {
                $query->where(function ($q) use ($currentUser) {
                    $q->where('evaluatee_type', 'user')
                      ->where('evaluatee_id', $currentUser->id);
                });
            })
            ->where('status', 'completed')
            ->orderBy('completed_at', 'desc')
            ->get()
            ->map(function ($assignment) {
                return [
                    'id' => $assignment->id,
                    'event_name' => $assignment->evaluationEvent->name,
                    'completed_at' => $assignment->completed_at,
                ];
            });

        return response()->json([
            'data' => $assignments,
            'count' => $assignments->count(),
        ]);
    }
}
