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

        // Get assignments where current user is the evaluatee
        $assignments = EvaluationAssignment::with([
            'evaluationEvent',
            'evaluatorUser',
        ])
        ->where(function ($query) use ($currentUser) {
            $query->where(function ($q) use ($currentUser) {
                $q->where('evaluatee_type', 'user')
                  ->where('evaluatee_id', $currentUser->id);
            });
        })
        ->whereIn('status', ['pending', 'in_progress'])
        ->whereHas('evaluationEvent', function ($q) {
            $q->where('status', 'active')
              ->where('end_date', '>=', now());
        })
        ->get()
        ->map(function ($assignment) {
            return [
                'id' => $assignment->id,
                'access_token' => $assignment->access_token,
                'event_name' => $assignment->evaluationEvent->name,
                'event_description' => $assignment->evaluationEvent->description,
                'evaluator_name' => $assignment->evaluatorUser ? $assignment->evaluatorUser->name : 'Manager',
                'status' => $assignment->status,
                'due_date' => $assignment->evaluationEvent->end_date,
                'sent_at' => $assignment->sent_at,
            ];
        });

        return response()->json([
            'data' => $assignments,
            'count' => $assignments->count(),
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
