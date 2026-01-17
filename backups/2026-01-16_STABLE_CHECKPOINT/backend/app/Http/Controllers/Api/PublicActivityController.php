<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Participant;
use App\Models\Response;
use Illuminate\Http\Request;

class PublicActivityController extends Controller
{
    /**
     * Get public activity details (no authentication required)
     */
    public function show(Request $request, $id)
    {
        // Load questionnaire with sections and questions - questions already have translations as JSON field
        $query = Activity::with(['questionnaire.sections.questions', 'program']);
        
        // If preview mode is enabled, show any status
        $isPreview = $request->query('preview') === 'true';
        
        if (!$isPreview) {
            $query->where('status', 'live');
        }
        
        $activity = $query->findOrFail($id);

        return response()->json([
            'data' => $activity
        ]);
    }

    /**
     * Register participant from activity link
     */
    public function registerParticipant(Request $request, $activityId)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'is_anonymous' => 'sometimes|boolean',
            'is_preview' => 'sometimes|boolean',
            'preview_user_role' => 'sometimes|nullable|string',
            'preview_user_email' => 'sometimes|nullable|string',
        ]);

        $activity = Activity::with('program')->findOrFail($activityId);
        
        // Allow preview mode to work even when activity is not live
        $isPreview = $request->input('is_preview', false);
        
        if (!$isPreview && $activity->status !== 'live') {
            return response()->json([
                'message' => 'This activity is not currently active'
            ], 403);
        }

        // Extract additional form data
        $additionalData = $request->input('additional_data', []);
        
        // Mark as anonymous if flag is set
        if ($request->input('is_anonymous', false)) {
            $additionalData['participant_type'] = 'anonymous';
        }
        
        // Handle preview mode
        if ($isPreview) {
            $additionalData['participant_type'] = 'preview';
            
            // For preview mode, find or create participant based on preview user email
            $previewEmail = $request->input('preview_user_email');
            $previewRole = $request->input('preview_user_role');
            
            $participant = Participant::where('email', $previewEmail)
                ->where('is_preview', true)
                ->first();
            
            if (!$participant) {
                $participant = Participant::create([
                    'name' => $request->name,
                    'email' => $previewEmail,
                    'is_guest' => false,
                    'is_preview' => true,
                    'preview_user_role' => $previewRole,
                    'preview_user_email' => $previewEmail,
                    'status' => 'active',
                    'additional_data' => $additionalData,
                ]);
            } else {
                // Update existing preview participant
                $participant->update([
                    'name' => $request->name,
                    'preview_user_role' => $previewRole,
                    'additional_data' => $additionalData,
                ]);
            }
            
            // Attach to activity if not already attached
            if (!$participant->activities()->where('activities.id', $activityId)->exists()) {
                $participant->activities()->attach($activityId, ['joined_at' => now()]);
            }
        } else {
            $participant = Participant::findOrCreateFromActivityLink(
                $request->name,
                $request->email,
                $activityId,
                $additionalData
            );
        }

        // Check existing submissions/in-progress (non-preview unless explicitly preview)
        $existingSubmitted = Response::where('activity_id', $activityId)
            ->where('participant_id', $participant->id)
            ->where('status', 'submitted')
            ->where('is_preview', $isPreview)
            ->orderByDesc('submitted_at')
            ->first();

        $existingInProgress = Response::where('activity_id', $activityId)
            ->where('participant_id', $participant->id)
            ->where('status', 'in_progress')
            ->where('is_preview', $isPreview)
            ->orderByDesc('updated_at')
            ->first();

        if ($existingSubmitted) {
            return response()->json([
                'data' => [
                    'participant_id' => $participant->id,
                    'participant_code' => $participant->guest_code,
                    'is_guest' => $participant->is_guest,
                    'activity' => $activity,
                    'has_submitted' => true,
                    'attempt_count' => 1,
                    'can_retake' => false,
                    'retakes_remaining' => 0,
                    'time_limit_enabled' => $activity->time_limit_enabled,
                    'time_limit_minutes' => $activity->time_limit_minutes,
                    'existing_response' => [
                        'id' => $existingSubmitted->id,
                        'answers' => $existingSubmitted->answers,
                        'completed_at' => $existingSubmitted->completed_at,
                        'status' => $existingSubmitted->status,
                        'attempt_number' => $existingSubmitted->attempt_number,
                        'score' => $existingSubmitted->score,
                        'assessment_result' => $existingSubmitted->assessment_result,
                        'correct_answers_count' => $existingSubmitted->correct_answers_count,
                    ],
                    'existing_in_progress' => $existingInProgress ? [
                        'id' => $existingInProgress->id,
                        'last_saved_at' => $existingInProgress->last_saved_at,
                        'started_at' => $existingInProgress->started_at,
                    ] : null,
                ],
                'message' => 'You have already completed this activity'
            ], 409);
        }

        // Send welcome email to participant (skip for anonymous and preview) only if not already submitted
        if (!$isPreview && !$request->input('is_anonymous', false) && $participant->email && filter_var($participant->email, FILTER_VALIDATE_EMAIL)) {
            try {
                $emailService = app(\App\Services\EmailService::class);
                $emailService->sendActivityInvitation($participant, $activity);
                \Log::info('Welcome email sent to participant', [
                    'participant_id' => $participant->id,
                    'email' => $participant->email,
                    'activity_id' => $activityId
                ]);
            } catch (\Exception $e) {
                \Log::error('Failed to send welcome email', [
                    'participant_id' => $participant->id,
                    'email' => $participant->email,
                    'error' => $e->getMessage()
                ]);
                // Don't fail registration if email fails
            }
        }

        return response()->json([
            'data' => [
                'participant_id' => $participant->id,
                'participant_code' => $participant->guest_code,
                'is_guest' => $participant->is_guest,
                'activity' => $activity,
                'has_submitted' => false,
                'attempt_count' => 0,
                'can_retake' => false,
                'retakes_remaining' => null,
                'time_limit_enabled' => $activity->time_limit_enabled,
                'time_limit_minutes' => $activity->time_limit_minutes,
                'existing_response' => $existingInProgress ? [
                    'id' => $existingInProgress->id,
                    'last_saved_at' => $existingInProgress->last_saved_at,
                    'started_at' => $existingInProgress->started_at,
                ] : null,
            ],
            'message' => 'Registered successfully'
        ]);
    }

    /**
     * Submit response (no authentication required for guests)
     */
    public function submitResponse(Request $request, $activityId)
    {
        $request->validate([
            'participant_id' => 'required|exists:participants,id',
            'answers' => 'required',
            'is_preview' => 'sometimes|boolean',
        ]);

        $activity = Activity::with('questionnaire.sections.questions')->findOrFail($activityId);
        $participant = Participant::findOrFail($request->participant_id);
        $isPreview = $request->input('is_preview', false);
        
        // Normalize answers format - handle both array of objects and associative array
        $answers = $request->answers;
        $normalizedAnswers = [];
        
        if (is_array($answers)) {
            // Check if it's an array of objects with question_id field
            $firstItem = reset($answers);
            if (is_array($firstItem) && isset($firstItem['question_id'])) {
                // Format: [{ question_id: 'uuid', value: 'x' }, ...]
                // Convert to associative array: { 'uuid': 'x', ... }
                foreach ($answers as $answer) {
                    $questionId = $answer['question_id'];
                    $normalizedAnswers[$questionId] = $answer['value'] ?? $answer['value_array'] ?? $answer;
                }
            } else {
                // Already in associative array format: { 'uuid': 'x', ... }
                $normalizedAnswers = $answers;
            }
        }
        
        \Log::info('Normalized answers format', [
            'original_type' => gettype($answers),
            'original_sample' => is_array($answers) ? array_slice($answers, 0, 2, true) : $answers,
            'normalized_count' => count($normalizedAnswers),
            'normalized_sample' => array_slice($normalizedAnswers, 0, 2, true)
        ]);

        // Verify participant is linked to this activity
        if (!$participant->activities()->where('activities.id', $activityId)->exists()) {
            return response()->json([
                'message' => 'Participant not authorized for this activity'
            ], 403);
        }

        // For preview mode, update existing preview response or create new one
        if ($isPreview) {
            // Find existing preview response for this participant and activity
            $existingPreviewResponse = Response::where('activity_id', $activityId)
                ->where('participant_id', $participant->id)
                ->where('is_preview', true)
                ->first();
            
            $responseData = [
                'activity_id' => $activityId,
                'participant_id' => $participant->id,
                'answers' => $normalizedAnswers,
                'status' => 'submitted',
                'is_preview' => true,
                'completed_at' => now(),
                'submitted_at' => now(),
            ];
            
            if ($existingPreviewResponse) {
                // Update existing preview response
                $existingPreviewResponse->update($responseData);
                $response = $existingPreviewResponse;
                
                // Delete old Answer records for preview
                \App\Models\Answer::where('response_id', $response->id)->delete();
            } else {
                // Create new preview response
                $response = Response::create($responseData);
            }
            
            // Create Answer records for preview (for analytics even in preview mode)
            if (is_array($normalizedAnswers)) {
                foreach ($normalizedAnswers as $questionId => $answerValue) {
                    try {
                        $question = \App\Models\Question::find($questionId);
                        if ($question) {
                            \App\Models\Answer::create([
                                'response_id' => $response->id,
                                'question_id' => $questionId,
                                'value' => is_array($answerValue) ? null : $answerValue,
                                'value_array' => is_array($answerValue) ? $answerValue : null,
                            ]);
                        }
                    } catch (\Exception $e) {
                        \Log::warning('Failed to create preview Answer record', [
                            'response_id' => $response->id,
                            'question_id' => $questionId,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            }
            
            return response()->json([
                'message' => 'Preview response saved successfully',
                'data' => [
                    'response_id' => $response->id,
                    'is_preview' => true,
                ]
            ]);
        }

        // Hard stop: one participant = one submission per activity (non-preview)
        $existingSubmitted = Response::where('activity_id', $activityId)
            ->where('participant_id', $participant->id)
            ->where('status', 'submitted')
            ->where('is_preview', false)
            ->orderByDesc('submitted_at')
            ->first();

        if ($existingSubmitted) {
            return response()->json([
                'message' => 'You have already submitted your response for this activity.',
                'data' => [
                    'already_submitted' => true,
                    'submitted_at' => $existingSubmitted->completed_at,
                    'score' => $existingSubmitted->score,
                    'assessment_result' => $existingSubmitted->assessment_result,
                    'response_id' => $existingSubmitted->id,
                ]
            ], 409);
        }

        $attemptNumber = 1;
        
        // Calculate score for assessments
        $score = null;
        $assessmentResult = null;
        $correctAnswersCount = 0;
        
        if ($activity->type === 'assessment' && $activity->questionnaire) {
            $totalQuestions = 0;
            $correctAnswers = 0;
            
            \Log::info('Assessment Scoring Started', [
                'activity_id' => $activityId,
                'participant_id' => $participant->id,
                'submitted_answers' => $normalizedAnswers
            ]);
            
            foreach ($activity->questionnaire->sections as $section) {
                foreach ($section->questions as $question) {
                    // Only count questions that have correct answers defined
                    if (isset($question->settings['correctAnswers']) && is_array($question->settings['correctAnswers'])) {
                        $totalQuestions++;
                        $questionId = $question->id;
                        $userAnswer = $normalizedAnswers[$questionId] ?? null;
                        
                        \Log::info('Checking Question', [
                            'question_id' => $questionId,
                            'question_type' => $question->type,
                            'question_text' => $question->text,
                            'correct_answers_config' => $question->settings['correctAnswers'],
                            'user_answer' => $userAnswer,
                            'question_options' => $question->options ?? []
                        ]);
                        
                        // correctAnswers are stored as indices (0, 1, 2, 3)
                        // user answers are the actual option text values
                        // We need to convert user answers to indices for comparison
                        $correctIndices = $question->settings['correctAnswers'];
                        $questionOptions = $question->options ?? [];
                        
                        // Check if answer is correct based on question type
                        if ($question->type === 'multiple_choice' || $question->type === 'checkbox' || $question->type === 'multiselect' || $question->type === 'multiple_choice_multiple') {
                            // Multi-select questions
                            $userAnswerArray = is_array($userAnswer) ? $userAnswer : ($userAnswer ? [$userAnswer] : []);
                            
                            // Convert user answer text to indices
                            $userIndices = [];
                            foreach ($userAnswerArray as $answer) {
                                $index = array_search($answer, $questionOptions);
                                if ($index !== false) {
                                    $userIndices[] = $index;
                                }
                            }
                            
                            // Sort both arrays to compare
                            sort($correctIndices);
                            sort($userIndices);
                            
                            \Log::info('Multi-select comparison', [
                                'correct_indices' => $correctIndices,
                                'user_indices' => $userIndices,
                                'match' => $correctIndices === $userIndices
                            ]);
                            
                            if ($correctIndices === $userIndices) {
                                $correctAnswers++;
                            }
                        } else {
                            // Single choice questions (radio, etc.)
                            // Convert user answer text to index
                            $userIndex = array_search($userAnswer, $questionOptions);
                            
                            \Log::info('Single choice comparison', [
                                'correct_indices' => $correctIndices,
                                'user_index' => $userIndex,
                                'match' => in_array($userIndex, $correctIndices)
                            ]);
                            
                            if ($userIndex !== false && in_array($userIndex, $correctIndices)) {
                                $correctAnswers++;
                            }
                        }
                    }
                }
            }
            
            \Log::info('Assessment Scoring Complete', [
                'total_questions' => $totalQuestions,
                'correct_answers' => $correctAnswers
            ]);
            
            if ($totalQuestions > 0) {
                $score = ($correctAnswers / $totalQuestions) * 100;
                $correctAnswersCount = $correctAnswers;
                
                // Determine pass/fail based on pass_percentage
                if ($activity->pass_percentage !== null) {
                    $assessmentResult = $score >= $activity->pass_percentage ? 'pass' : 'fail';
                } else {
                    $assessmentResult = 'pending';
                }
            }
        }

        // CRITICAL: Find existing in-progress response (from incremental saves)
        // If found → UPDATE to submitted | If not found → CREATE new submitted
        // This merges all incrementally saved answers with final submission
        $response = Response::firstOrNew([
            'activity_id' => $activityId,
            'participant_id' => $participant->id,
            'status' => 'in_progress', // Find existing in-progress response
        ]);

        // Update response to submitted status (preserves started_at from first save)
        $response->fill([
            'activity_id' => $activityId,
            'participant_id' => $participant->id,
            'answers' => $normalizedAnswers, // Keep for backward compatibility
            'status' => 'submitted', // Mark as submitted
            'attempt_number' => $attemptNumber,
            'score' => $score,
            'assessment_result' => $assessmentResult,
            'correct_answers_count' => $correctAnswersCount,
            'started_at' => $request->started_at ? \Carbon\Carbon::parse($request->started_at) : ($response->started_at ?? now()),
            'completed_at' => now(),
            'submitted_at' => now(),
            'time_expired_at' => $request->time_expired_at ? \Carbon\Carbon::parse($request->time_expired_at) : null,
            'auto_submitted' => $request->auto_submitted ?? false,
            'is_preview' => false, // Regular responses are not preview
        ]);
        
        // CRITICAL: SAVE response BEFORE creating Answer records
        // Without this, $response->id will be NULL and Answer inserts will fail
        $response->save();
        
        // CRITICAL: Upsert Answer records (merges with incremental saves)
        // If answer exists from saveProgress → UPDATE with final value
        // If new answer (user changed mind after back navigation) → INSERT
        // Key: response_id + question_id (DB unique constraint enforced)
        if (is_array($normalizedAnswers)) {
            foreach ($normalizedAnswers as $questionId => $answerValue) {
                try {
                    $question = \App\Models\Question::find($questionId);
                    if ($question) {
                        // updateOrCreate = UPDATE if exists, INSERT if not
                        // This handles back navigation and answer changes perfectly
                        \App\Models\Answer::updateOrCreate(
                            [
                                'response_id' => $response->id,
                                'question_id' => $questionId,
                            ],
                            [
                                'value' => is_array($answerValue) ? null : $answerValue,
                                'value_array' => is_array($answerValue) ? $answerValue : null,
                            ]
                        );
                    }
                } catch (\Exception $e) {
                    \Log::warning('Failed to upsert Answer record', [
                        'response_id' => $response->id,
                        'question_id' => $questionId,
                        'error' => $e->getMessage()
                    ]);
                }
            }
        }

        // Send thank you/confirmation email to participant
        if ($participant->email && filter_var($participant->email, FILTER_VALIDATE_EMAIL)) {
            try {
                // Calculate total questions for email
                $totalQuestionsCount = 0;
                if ($activity->questionnaire) {
                    foreach ($activity->questionnaire->sections as $section) {
                        $totalQuestionsCount += $section->questions->count();
                    }
                }
                
                $emailService = app(\App\Services\EmailService::class);
                $emailService->sendThankYouEmail($participant, $activity, [
                    'score' => $score,
                    'assessment_result' => $assessmentResult,
                    'correct_answers_count' => $correctAnswersCount,
                    'total_questions' => $totalQuestionsCount,
                    'attempt_number' => $attemptNumber,
                ]);
                \Log::info('Thank you email sent to participant', [
                    'participant_id' => $participant->id,
                    'email' => $participant->email,
                    'activity_id' => $activityId,
                    'response_id' => $response->id
                ]);
            } catch (\Exception $e) {
                \Log::error('Failed to send thank you email', [
                    'participant_id' => $participant->id,
                    'email' => $participant->email,
                    'error' => $e->getMessage()
                ]);
                // Don't fail submission if email fails
            }
        }

        // Calculate retakes remaining for assessments
        $retakesRemaining = null;
        if ($activity->type === 'assessment' && $activity->max_retakes !== null) {
            // After this submission, how many retakes are left?
            // If max_retakes is 3, total attempts allowed is 4 (1 initial + 3 retakes)
            // attemptNumber 1: retakes_remaining = 3 (3 - 1 + 1 = 3)
            // attemptNumber 2: retakes_remaining = 2 (3 - 2 + 1 = 2)
            // attemptNumber 3: retakes_remaining = 1 (3 - 3 + 1 = 1)
            // attemptNumber 4: retakes_remaining = 0 (3 - 4 + 1 = 0)
            $retakesRemaining = 0;
        }

        // Calculate total questions for response
        $totalQuestionsCount = 0;
        if ($activity->type === 'assessment' && $activity->questionnaire) {
            foreach ($activity->questionnaire->sections as $section) {
                foreach ($section->questions as $question) {
                    if (isset($question->settings['correctAnswers']) && is_array($question->settings['correctAnswers'])) {
                        $totalQuestionsCount++;
                    }
                }
            }
        }

        // Determine if participant can retake
        // If max_retakes is null (unlimited), can always retake
        // If max_retakes is set, can retake if attemptNumber < (max_retakes + 1)
        // Example: max_retakes = 3 means total 4 attempts allowed (1 initial + 3 retakes)
        //   After attempt 1: can_retake = true (1 < 4)
        //   After attempt 4: can_retake = false (4 >= 4)
        $canRetake = false;

        return response()->json([
            'data' => [
                'response' => $response,
                'attempt_number' => $attemptNumber,
                'score' => $score,
                'assessment_result' => $assessmentResult,
                'correct_answers_count' => $correctAnswersCount,
                'total_questions' => $totalQuestionsCount,
                'retakes_remaining' => $retakesRemaining,
                'can_retake' => $canRetake,
            ],
            'message' => 'Response submitted successfully'
        ]);
    }

    /**
     * Save progress incrementally (stores answers per question)
     */
    public function saveProgress(Request $request, $activityId)
    {
        $request->validate([
            'participant_id' => 'required|exists:participants,id',
            'answers' => 'required|array',
        ]);

        $activity = Activity::with('questionnaire.sections.questions')->findOrFail($activityId);
        $participant = Participant::findOrFail($request->participant_id);

        // Normalize answers (array of objects or associative array)
        $normalizedAnswers = [];
        $answers = $request->answers;
        if (is_array($answers)) {
            $firstItem = reset($answers);
            if (is_array($firstItem) && isset($firstItem['question_id'])) {
                foreach ($answers as $answer) {
                    $questionId = $answer['question_id'];
                    $normalizedAnswers[$questionId] = $answer['value'] ?? $answer['value_array'] ?? $answer;
                }
            } else {
                $normalizedAnswers = $answers;
            }
        }

        // Verify participant is linked to this activity
        if (!$participant->activities()->where('activities.id', $activityId)->exists()) {
            return response()->json([
                'message' => 'Participant not authorized for this activity'
            ], 403);
        }

        // Stop progress saves once submitted
        $submittedResponse = Response::where('activity_id', $activityId)
            ->where('participant_id', $participant->id)
            ->where('status', 'submitted')
            ->where('is_preview', false)
            ->first();

        if ($submittedResponse) {
            return response()->json([
                'message' => 'Submission already completed. Progress cannot be updated.',
                'data' => [
                    'response_id' => $submittedResponse->id,
                    'submitted_at' => $submittedResponse->submitted_at,
                ]
            ], 409);
        }

        // CRITICAL: One participant × one activity = one in-progress Response
        // Find existing in-progress response OR create new one
        // Key: activity_id + participant_id + status='in_progress'
        $response = Response::firstOrCreate(
            [
                'activity_id' => $activityId,
                'participant_id' => $participant->id,
                'status' => 'in_progress', // Only find in-progress responses
            ],
            [
                'activity_id' => $activityId,
                'participant_id' => $participant->id,
                'answers' => [],
                'status' => 'in_progress',
                'started_at' => now(),
            ]
        );

        // Update last_saved_at timestamp
        $response->last_saved_at = now();
        
        // Merge new answers with existing answers in JSON (for backward compatibility)
        $existingAnswers = $response->answers ?? [];
        $response->answers = array_merge($existingAnswers, $normalizedAnswers);
        
        $response->save();

        // CRITICAL: One response × one question = one Answer record
        // If participant goes BACK and changes answer → UPDATE existing record
        // Key: response_id + question_id (enforced by DB unique constraint)
        foreach ($normalizedAnswers as $questionId => $answerValue) {
            // Find existing answer or create new (DB constraint prevents duplicates)
            $answer = \App\Models\Answer::firstOrNew([
                'response_id' => $response->id,
                'question_id' => $questionId,
            ]);

            // Update the answer value (handles back navigation / answer changes)
            if (is_array($answerValue)) {
                $answer->value = null;
                $answer->value_array = $answerValue;
            } else {
                $answer->value = $answerValue;
                $answer->value_array = null;
            }

            $answer->save(); // INSERT if new, UPDATE if exists
        }

        return response()->json([
            'data' => [
                'response_id' => $response->id,
                'last_saved_at' => $response->last_saved_at,
                'answers_count' => count($response->answers),
            ],
            'message' => 'Progress saved successfully'
        ]);
    }

    /**
     * Load existing progress for a participant
     */
    public function loadProgress(Request $request, $activityId, $participantId)
    {
        $activity = Activity::findOrFail($activityId);
        $participant = Participant::findOrFail($participantId);

        // Verify participant is linked to this activity
        if (!$participant->activities()->where('activities.id', $activityId)->exists()) {
            return response()->json([
                'message' => 'Participant not authorized for this activity'
            ], 403);
        }

        // Find in-progress response
        $response = Response::with('answers')
            ->where('activity_id', $activityId)
            ->where('participant_id', $participantId)
            ->where('status', 'in_progress')
            ->first();

        if (!$response) {
            return response()->json([
                'data' => [
                    'has_progress' => false,
                    'answers' => [],
                ],
                'message' => 'No progress found'
            ]);
        }

        // Convert Answer records to question_id => value format
        $answers = [];
        foreach ($response->answers as $answer) {
            $answers[$answer->question_id] = $answer->value_array ?? $answer->value;
        }

        return response()->json([
            'data' => [
                'has_progress' => true,
                'response_id' => $response->id,
                'answers' => $answers,
                'last_saved_at' => $response->last_saved_at,
                'started_at' => $response->started_at,
            ],
            'message' => 'Progress loaded successfully'
        ]);
    }

    /**
     * Validate an access token and return participant/activity data
     */
    public function validateAccessToken($token)
    {
        $validation = \App\Models\ActivityAccessToken::validateToken($token);

        if (!$validation['valid']) {
            return response()->json([
                'valid' => false,
                'error' => $validation['error'],
                'already_completed' => $validation['already_completed'] ?? false
            ], 400);
        }

        return response()->json([
            'valid' => true,
            'data' => [
                'activity_id' => $validation['activity']->id,
                'activity_name' => $validation['activity']->name,
                'activity_status' => $validation['activity']->status,
                'participant' => [
                    'id' => $validation['participant']->id,
                    'name' => $validation['participant']->name,
                    'email' => $validation['participant']->email,
                    'phone' => $validation['participant']->phone,
                    'additional_data' => $validation['participant']->additional_data,
                    'status' => $validation['participant']->status,
                ],
                'token_id' => $validation['token_id']
            ]
        ]);
    }

    /**
     * Mark a token as used (when participant completes the activity)
     */
    public function markTokenAsUsed($token)
    {
        $accessToken = \App\Models\ActivityAccessToken::where('token', $token)->first();

        if (!$accessToken) {
            return response()->json([
                'success' => false,
                'error' => 'Invalid token'
            ], 400);
        }

        $accessToken->markAsUsed();

        return response()->json([
            'success' => true,
            'message' => 'Token marked as used'
        ]);
    }
}
