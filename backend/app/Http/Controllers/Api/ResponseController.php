<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Response;
use App\Models\Answer;
use App\Models\Activity;
use App\Models\Question;
use App\Services\ResponseAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ResponseController extends Controller
{
    private const OTHER_OPTION_VALUE = '__other__';

    protected $responseAuditService;

    public function __construct(ResponseAuditService $responseAuditService)
    {
        $this->responseAuditService = $responseAuditService;
    }

    /**
     * Start a new response or get existing in-progress response
     */
    public function start(Request $request, string $activityId)
    {
        $validated = $request->validate([
            'participant_id' => 'nullable|uuid|exists:participants,id',
            'guest_identifier' => 'nullable|string|max:255',
            'language' => 'nullable|string|max:10',
            'metadata' => 'nullable|array',
        ]);

        $activity = Activity::with('questionnaire.sections.questions')->findOrFail($activityId);

        // Check if activity allows responses
        if (!$activity->canAcceptResponses()) {
            return response()->json([
                'message' => 'Activity is not accepting responses',
                'status' => $activity->getComputedStatus()
            ], 403);
        }

        // Check for guest access
        if (!isset($validated['participant_id']) && !$activity->allow_guests) {
            return response()->json([
                'message' => 'This activity does not allow guest submissions'
            ], 403);
        }

        // Check for duplicate submission
        $existingResponse = $this->findExistingResponse($activityId, $validated);
        
        if ($existingResponse && $existingResponse->isSubmitted()) {
            return response()->json([
                'message' => 'You have already submitted a response for this activity',
                'response' => $existingResponse->load('answers.question')
            ], 409);
        }

        // Return existing in-progress response or create new one
        if ($existingResponse && $existingResponse->isInProgress()) {
            $existingResponse->load('answers.question');
            return response()->json([
                'message' => 'Resuming existing response',
                'response' => $existingResponse,
                'is_resume' => true
            ]);
        }

        // Count total questions
        $totalQuestions = $activity->questionnaire
            ? $activity->questionnaire->sections->sum(function($section) {
                return $section->questions->count();
            })
            : 0;

        // Create new response
        $response = Response::create([
            'id' => Str::uuid(),
            'activity_id' => $activityId,
            'participant_id' => $validated['participant_id'] ?? null,
            'guest_identifier' => $validated['guest_identifier'] ?? null,
            'status' => 'in_progress',
            'language' => $validated['language'] ?? 'en',
            'total_questions' => $totalQuestions,
            'started_at' => Carbon::now(),
            'metadata' => $validated['metadata'] ?? null,
        ]);

        $response->load(['activity.questionnaire.sections.questions', 'answers']);

        return response()->json([
            'message' => 'Response started successfully',
            'response' => $response,
            'is_resume' => false
        ], 201);
    }

    /**
     * Save progress (auto-save or manual save)
     */
    public function saveProgress(Request $request, string $responseId)
    {
        $response = Response::findOrFail($responseId);

        if ($response->isSubmitted()) {
            return response()->json([
                'message' => 'Cannot update a submitted response'
            ], 400);
        }

        $validated = $request->validate([
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|uuid|exists:questions,id',
            'answers.*.value' => 'nullable',
            'answers.*.value_array' => 'nullable|array',
            'answers.*.other_text' => 'nullable|string',
            'answers.*.value_translations' => 'nullable|array',
            'answers.*.time_spent' => 'nullable|integer',
            'auto_save' => 'nullable|boolean',
        ]);

        DB::beginTransaction();
        try {
            foreach ($validated['answers'] as $answerData) {
                $question = Question::find($answerData['question_id']);
                
                // Find or create answer
                $answer = Answer::firstOrNew([
                    'response_id' => $responseId,
                    'question_id' => $answerData['question_id'],
                ]);

                // Track if this is an update
                $isUpdate = $answer->exists;

                if (!$answer->exists) {
                    $answer->id = Str::uuid();
                }

                // Set value based on question type
                if (isset($answerData['value_array'])) {
                    $answer->setValue($answerData['value_array'], $question->type);
                } elseif (isset($answerData['value'])) {
                    $answer->setValue($answerData['value'], $question->type);
                }

                // Store/clear other_text based on whether "Other" was selected
                $hasOtherSelected = false;
                if (array_key_exists('value', $answerData) && $answerData['value'] === self::OTHER_OPTION_VALUE) {
                    $hasOtherSelected = true;
                }
                if (array_key_exists('value_array', $answerData) && is_array($answerData['value_array']) && in_array(self::OTHER_OPTION_VALUE, $answerData['value_array'], true)) {
                    $hasOtherSelected = true;
                }

                if ($hasOtherSelected) {
                    $otherText = is_string($answerData['other_text'] ?? null) ? trim($answerData['other_text']) : '';
                    // Allow empty other_text during progress saves; keep null in DB when empty
                    $answer->other_text = $otherText !== '' ? $otherText : null;
                } else {
                    $answer->other_text = null;
                }

                // Handle multilingual translations
                if (isset($answerData['value_translations'])) {
                    $answer->value_translations = $answerData['value_translations'];
                }

                // Update time spent
                if (isset($answerData['time_spent'])) {
                    $answer->time_spent = $answerData['time_spent'];
                }

                // Increment revision count if updating
                if ($isUpdate) {
                    $answer->incrementRevision();
                } else {
                    $answer->save();
                }
            }

            // Update progress metrics
            $response->updateProgress();
            
            // DUAL-SAVE: Also sync answers to JSON column for backup/redundancy
            $this->syncAnswersToJsonColumn($response);

            // Mark as auto-saved if requested
            if ($request->boolean('auto_save')) {
                $response->autoSave();
            }

            DB::commit();

            $response->load(['answers.question', 'activity']);

            return response()->json([
                'message' => 'Progress saved successfully',
                'response' => $response,
                'auto_saved' => $request->boolean('auto_save')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to save progress',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Submit final response
     */
    public function submit(Request $request, string $responseId)
    {
        $response = Response::with('activity.questionnaire.sections.questions')->findOrFail($responseId);

        if ($response->isSubmitted()) {
            return response()->json([
                'message' => 'Response already submitted',
                'submitted_at' => $response->submitted_at
            ], 400);
        }

        $validated = $request->validate([
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|uuid|exists:questions,id',
            'answers.*.value' => 'nullable',
            'answers.*.value_array' => 'nullable|array',
            'answers.*.other_text' => 'nullable|string',
            'answers.*.value_translations' => 'nullable|array',
            'answers.*.time_spent' => 'nullable|integer',
        ]);

        DB::beginTransaction();
        try {
            // Save all answers first
            foreach ($validated['answers'] as $answerData) {
                $question = Question::find($answerData['question_id']);
                
                $answer = Answer::firstOrNew([
                    'response_id' => $responseId,
                    'question_id' => $answerData['question_id'],
                ]);

                $isUpdate = $answer->exists;

                if (!$answer->exists) {
                    $answer->id = Str::uuid();
                }

                if (isset($answerData['value_array'])) {
                    $answer->setValue($answerData['value_array'], $question->type);
                } elseif (isset($answerData['value'])) {
                    $answer->setValue($answerData['value'], $question->type);
                }

                // Enforce other_text when submitting with "Other" selected
                $hasOtherSelected = false;
                if (array_key_exists('value', $answerData) && $answerData['value'] === self::OTHER_OPTION_VALUE) {
                    $hasOtherSelected = true;
                }
                if (array_key_exists('value_array', $answerData) && is_array($answerData['value_array']) && in_array(self::OTHER_OPTION_VALUE, $answerData['value_array'], true)) {
                    $hasOtherSelected = true;
                }

                if ($hasOtherSelected) {
                    $otherText = is_string($answerData['other_text'] ?? null) ? trim($answerData['other_text']) : '';
                    if ($otherText === '') {
                        DB::rollBack();
                        return response()->json([
                            'message' => 'Other selected but other_text is missing',
                            'errors' => [
                                'answers' => ['Please specify your response for Other.'],
                            ],
                        ], 422);
                    }
                    $answer->other_text = $otherText;
                } else {
                    $answer->other_text = null;
                }

                if (isset($answerData['value_translations'])) {
                    $answer->value_translations = $answerData['value_translations'];
                }

                if (isset($answerData['time_spent'])) {
                    $answer->time_spent = $answerData['time_spent'];
                }

                if ($isUpdate) {
                    $answer->incrementRevision();
                } else {
                    $answer->save();
                }
            }

            // Validate required questions
            $requiredQuestions = Question::whereHas('section.questionnaire', function($q) use ($response) {
                $q->where('id', $response->activity->questionnaire_id);
            })->where('is_required', true)->pluck('id');

            $answeredQuestionIds = Answer::where('response_id', $responseId)->pluck('question_id');
            $missingRequired = $requiredQuestions->diff($answeredQuestionIds);

            if ($missingRequired->count() > 0) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Please answer all required questions',
                    'missing_questions' => $missingRequired->values()
                ], 422);
            }

            // Mark as submitted
            $response->updateProgress();
            
            // DUAL-SAVE: Sync answers to JSON column for backup before final submission
            $this->syncAnswersToJsonColumn($response);
            
            $response->markAsSubmitted();

            DB::commit();

            // AUDIT LOGGING: Log to secondary backup (async, non-blocking)
            // This happens AFTER primary save is committed
            try {
                $allAnswers = Answer::where('response_id', $responseId)->get();
                $source = $request->input('source', 'web'); // Can be passed from frontend
                $this->responseAuditService->logResponse($response, $allAnswers->toArray(), $source);
            } catch (\Exception $e) {
                // Log error but don't fail the request
                \Log::warning('ResponseController: Audit logging failed (non-critical)', [
                    'response_id' => $responseId,
                    'error' => $e->getMessage()
                ]);
            }

            $response->load(['answers.question', 'activity', 'participant']);

            return response()->json([
                'message' => 'Response submitted successfully',
                'response' => $response
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to submit response',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get response progress
     */
    public function getProgress(string $responseId)
    {
        $response = Response::with(['answers.question', 'activity.questionnaire.sections.questions'])
            ->findOrFail($responseId);

        return response()->json([
            'response' => $response,
            'progress' => [
                'total_questions' => $response->total_questions,
                'answered_questions' => $response->answered_questions,
                'completion_percentage' => $response->completion_percentage,
                'status' => $response->status,
                'last_saved_at' => $response->last_saved_at,
            ]
        ]);
    }

    /**
     * Resume an in-progress response
     */
    public function resume(Request $request, string $activityId)
    {
        $validated = $request->validate([
            'participant_id' => 'nullable|uuid|exists:participants,id',
            'guest_identifier' => 'nullable|string|max:255',
        ]);

        $response = $this->findExistingResponse($activityId, $validated);

        if (!$response) {
            return response()->json([
                'message' => 'No response found to resume'
            ], 404);
        }

        if ($response->isSubmitted()) {
            return response()->json([
                'message' => 'Response already submitted',
                'response' => $response->load('answers.question')
            ], 400);
        }

        $response->load(['answers.question', 'activity.questionnaire.sections.questions']);

        return response()->json([
            'message' => 'Resumed response successfully',
            'response' => $response
        ]);
    }

    /**
     * Get all responses for an activity (admin/moderator)
     */
    public function index(Request $request, string $activityId)
    {
        // Get activity to access participants
        $activity = Activity::findOrFail($activityId);
        
        // Get valid participant IDs - simplified to match ActivityController response count logic
        // Include ALL active participants (both registered and guest), exclude only preview
        // Use qualified column names for clarity (all columns are in participants table)
        $validParticipantIds = $activity->participants()
            ->where('participants.is_preview', false) // Exclude preview participants
            ->where('participants.status', 'active') // Only active participants
            ->whereNull('participants.deleted_at') // Not deleted
            ->pluck('participants.id')
            ->toArray();

        $query = Response::with(['participant', 'activity', 'answers.question'])
            ->byActivity($activityId)
            ->where('is_preview', false) // Exclude preview responses
            ->where(function($q) use ($validParticipantIds) {
                // Include responses from valid participants OR guest responses (null participant_id)
                $q->whereIn('participant_id', $validParticipantIds)
                  ->orWhereNull('participant_id');
            });

        // Filter by status
        if ($request->has('status')) {
            $status = $request->status;
            if ($status === 'submitted') {
                $query->submitted();
            } elseif ($status === 'in_progress') {
                $query->inProgress();
            }
        }

        // Filter by participant
        if ($request->has('participant_id')) {
            $query->byParticipant($request->participant_id);
        }

        $responses = $query->paginate($request->input('per_page', 15));

        // Transform responses to ensure answers are properly formatted for the frontend
        // The frontend expects: [{question_id: 'uuid', value: 'answer', value_array: [...]}]
        $responses->getCollection()->transform(function ($response) {
            // CRITICAL: The Response model has both:
            // 1. answers (JSON column) - legacy format: {"question_id": "answer_text"} or {"105": "Doctor"}
            // 2. answers() relationship - proper Answer records with value/value_array
            
            if ($response->relationLoaded('answers')) {
                $answersRelation = $response->getRelation('answers');
                
                // If it's a Laravel Collection, convert to array
                if (is_object($answersRelation) && method_exists($answersRelation, 'values')) {
                    $answersArray = $answersRelation->values()->map(function ($ans) {
                        return [
                            'question_id' => $ans['question_id'] ?? null,
                            'value' => $ans['value'] ?? null,
                            'value_array' => $ans['value_array'] ?? null,
                            'other_text' => $ans['other_text'] ?? null,
                        ];
                    })->toArray();
                    
                    // If relationship has data, use it
                    if (!empty($answersArray)) {
                        $response->setRelation('answers', $answersArray);
                        return $response;
                    }
                }
                
                // If relationship is empty, try to use the JSON column data
                // This is for backward compatibility with legacy data
                if (empty($answersRelation) || (is_object($answersRelation) && $answersRelation->isEmpty())) {
                    // Get the raw JSON column value
                    $jsonAnswers = $response->getRawOriginal('answers');
                    
                    if (!empty($jsonAnswers)) {
                        $parsedAnswers = is_string($jsonAnswers) ? json_decode($jsonAnswers, true) : $jsonAnswers;
                        
                        if (!empty($parsedAnswers) && is_array($parsedAnswers)) {
                            // Convert legacy format to expected format
                            // Legacy: {"question_id_or_number": "answer_value"}
                            // Expected: [{question_id: "uuid", value: "answer", value_array: null}]
                            $formattedAnswers = [];
                            foreach ($parsedAnswers as $questionId => $value) {
                                $formattedAnswers[] = [
                                    'question_id' => (string) $questionId,
                                    'value' => is_array($value) ? null : $value,
                                    'value_array' => is_array($value) ? $value : null,
                                    'other_text' => null,
                                ];
                            }
                            $response->setRelation('answers', $formattedAnswers);
                        }
                    }
                }
            }
            return $response;
        });

        return response()->json($responses);
    }

    /**
     * Get statistics for activity responses
     */
    public function statistics(string $activityId)
    {
        // Get activity to access participants
        $activity = Activity::findOrFail($activityId);
        
        // SIMPLIFIED APPROACH: Count ALL non-preview responses for this activity
        // Include both registered participants AND guest responses
        $baseQuery = Response::byActivity($activityId)
            ->where('is_preview', false);
        
        $total = $baseQuery->count();
        $submitted = (clone $baseQuery)->submitted()->count();
        $inProgress = (clone $baseQuery)->inProgress()->count();
        
        // Count guest/anonymous responses (responses without participant_id OR marked as guest)
        $guestResponses = Response::byActivity($activityId)
            ->where('is_preview', false)
            ->where(function($q) {
                $q->whereNull('participant_id')
                  ->orWhereNotNull('guest_identifier');
            })
            ->count();

        $avgCompletion = (clone $baseQuery)->avg('completion_percentage');

        return response()->json([
            'total_responses' => $total,
            'submitted' => $submitted,
            'in_progress' => $inProgress,
            'guest_responses' => $guestResponses,
            'registered_responses' => $total - $guestResponses,
            'average_completion' => round($avgCompletion ?? 0, 2),
            'average_time_per_question' => 0, // Time tracking not implemented yet
        ]);
    }

    /**
     * Find existing response for participant or guest
     */
    private function findExistingResponse($activityId, $validated)
    {
        if (isset($validated['participant_id'])) {
            return Response::byActivity($activityId)
                ->byParticipant($validated['participant_id'])
                ->where('is_preview', false)
                ->first();
        }

        if (isset($validated['guest_identifier'])) {
            return Response::byActivity($activityId)
                ->byGuest($validated['guest_identifier'])
                ->where('is_preview', false)
                ->first();
        }

        return null;
    }

    /**
     * DUAL-SAVE: Sync answers from Answer table to JSON column for redundancy/backup
     * This ensures data is stored in both places for disaster recovery
     * Format: {"question_id": "answer_value"} or {"question_id": ["array", "values"]}
     */
    private function syncAnswersToJsonColumn(Response $response): void
    {
        try {
            // Reload answers relationship to get fresh data
            $response->load('answers');
            
            $jsonAnswers = [];
            foreach ($response->answers as $answer) {
                // Use question_id as key, store value or value_array
                $questionId = (string) $answer->question_id;
                
                // Prioritize value_array for multi-select/checkbox/matrix questions
                if (!empty($answer->value_array)) {
                    $jsonAnswers[$questionId] = $answer->value_array;
                } elseif ($answer->value !== null && $answer->value !== '') {
                    $jsonAnswers[$questionId] = $answer->value;
                }
            }
            
            // Only update if we have answers
            if (!empty($jsonAnswers)) {
                // Use raw DB update to avoid model events/casts interference
                DB::table('responses')
                    ->where('id', $response->id)
                    ->update(['answers' => json_encode($jsonAnswers)]);
                
                \Log::info("DUAL-SAVE: Synced " . count($jsonAnswers) . " answers to JSON column for response {$response->id}");
            }
        } catch (\Exception $e) {
            // Log error but don't fail the main operation
            \Log::error("DUAL-SAVE failed for response {$response->id}: " . $e->getMessage());
        }
    }

    /**
     * Delete a response (for orphaned/invalid responses)
     */
    public function destroy(string $activityId, string $responseId)
    {
        try {
            // Find the response
            $response = Response::where('activity_id', $activityId)
                ->where('id', $responseId)
                ->firstOrFail();

            // Delete associated answers first
            Answer::where('response_id', $responseId)->delete();

            // Delete the response
            $response->delete();

            return response()->json([
                'message' => 'Response deleted successfully'
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Response not found'
            ], 404);
        } catch (\Exception $e) {
            \Log::error("Failed to delete response {$responseId}: " . $e->getMessage());
            return response()->json([
                'message' => 'Failed to delete response',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
