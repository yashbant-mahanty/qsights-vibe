<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\GeneratedEventLink;
use App\Models\Participant;
use App\Models\Response;
use Illuminate\Http\Request;

class PublicActivityController extends Controller
{
    private const OTHER_OPTION_VALUE = '__other__';
    private const OTHER_TEXT_MAX_LEN = 1000;

    /**
     * Extract "Other" free-text from an answer payload.
     *
     * Supported incoming shapes per question:
     * - scalar: "Option A"
     * - array: ["A", "B"]
     * - assoc: { value: "__other__", other_text: "..." }
     * - assoc: { value_array: ["A", "__other__"], other_text: "..." }
     *
     * @return array{0:mixed,1:?string} [normalizedValue, otherText]
     */
    private function extractOtherPayload(mixed $answerValue): array
    {
        $otherText = null;

        if (is_array($answerValue) && array_key_exists('other_text', $answerValue)) {
            $otherTextRaw = $answerValue['other_text'] ?? null;
            if (is_string($otherTextRaw)) {
                $trimmed = trim($otherTextRaw);
                $otherText = $trimmed !== '' ? $trimmed : null;
            }

            if (array_key_exists('value_array', $answerValue)) {
                $answerValue = $answerValue['value_array'];
            } elseif (array_key_exists('value', $answerValue)) {
                $answerValue = $answerValue['value'];
            }
        }

        return [$answerValue, $otherText];
    }

    private function validateOtherTextOrFail(?string $otherText): void
    {
        if ($otherText === null) {
            throw new \InvalidArgumentException('Other text is required.');
        }

        if (mb_strlen($otherText) > self::OTHER_TEXT_MAX_LEN) {
            throw new \InvalidArgumentException('Other text is too long.');
        }
    }

    /**
     * Get or create an anonymous participant for generated links
     * Anonymous participants have IDs like: anon_TAG_TIMESTAMP
     */
    private function getOrCreateAnonymousParticipant(string $anonymousId, $activityId)
    {
        // Extract tag from anonymous ID (format: anon_TAG_TIMESTAMP)
        $parts = explode('_', $anonymousId);
        $tag = count($parts) >= 2 ? $parts[1] : 'unknown';
        
        // Check if we already have a participant for this anonymous ID
        // We store the anonymous_id in additional_data
        $participant = Participant::whereJsonContains('additional_data->anonymous_session_id', $anonymousId)->first();
        
        if ($participant) {
            // Ensure participant is linked to activity
            if (!$participant->activities()->where('activities.id', $activityId)->exists()) {
                $participant->activities()->attach($activityId, ['joined_at' => now()]);
            }
            return $participant;
        }
        
        // Create new anonymous participant
        $participant = Participant::create([
            'name' => 'Anonymous (' . $tag . ')',
            'email' => $anonymousId . '@anonymous.qsights.local', // Fake email for anonymous
            'is_guest' => true,
            'status' => 'active',
            'additional_data' => [
                'participant_type' => 'anonymous_generated_link',
                'anonymous_session_id' => $anonymousId,
                'generated_link_tag' => $tag,
            ],
        ]);
        
        // Attach to activity
        $participant->activities()->attach($activityId, ['joined_at' => now()]);
        
        \Log::info('Created anonymous participant for generated link', [
            'participant_id' => $participant->id,
            'anonymous_id' => $anonymousId,
            'tag' => $tag,
            'activity_id' => $activityId
        ]);
        
        return $participant;
    }
    
    /**
     * Check if participant_id is an anonymous generated link ID
     */
    private function isAnonymousParticipantId($participantId): bool
    {
        return is_string($participantId) && str_starts_with($participantId, 'anon_');
    }

    /**
     * Get public activity details (no authentication required)
     */
    public function show(Request $request, $id)
    {
        // Load questionnaire with sections, questions and references
        $query = Activity::with(['questionnaire.sections.questions.references', 'program']);
        
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
        // Check notification settings
        $notificationSettings = $activity->settings['notifications'] ?? [];
        $welcomeEmailEnabled = $notificationSettings['welcome_email_enabled'] ?? false; // default disabled
        
        if ($welcomeEmailEnabled && !$isPreview && !$request->input('is_anonymous', false) && $participant->email && filter_var($participant->email, FILTER_VALIDATE_EMAIL)) {
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
        // Custom validation - handle anonymous participants specially
        $participantId = $request->input('participant_id');
        $isAnonymous = $this->isAnonymousParticipantId($participantId);
        
        if ($isAnonymous) {
            // For anonymous participants, skip the exists:participants,id validation
            $request->validate([
                'participant_id' => 'required|string',
                'answers' => 'required',
                'comments' => 'sometimes|array', // Optional comments for questions
                'is_preview' => 'sometimes|boolean',
                'token' => 'sometimes|nullable|string', // Generated link token
            ]);
        } else {
            $request->validate([
                'participant_id' => 'required|exists:participants,id',
                'answers' => 'required',
                'comments' => 'sometimes|array', // Optional comments for questions
                'is_preview' => 'sometimes|boolean',
                'token' => 'sometimes|nullable|string', // Generated link token
            ]);
        }
        
        // Store the token for later use after successful submission
        $generatedLinkToken = $request->input('token');
        
        // Get comments from request (keyed by question_id)
        $questionComments = $request->input('comments', []);

        $activity = Activity::with('questionnaire.sections.questions')->findOrFail($activityId);
        
        // Get or create participant (handles anonymous participants)
        if ($isAnonymous) {
            $participant = $this->getOrCreateAnonymousParticipant($participantId, $activityId);
        } else {
            $participant = Participant::findOrFail($request->participant_id);
        }
        
        $isPreview = $request->input('is_preview', false);
        $autoSubmitted = (bool) ($request->input('auto_submitted', false));
        
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
                    // If client sent {value/value_array, other_text}, keep full payload so we can persist other_text
                    if (isset($answer['other_text']) && (isset($answer['value']) || isset($answer['value_array']))) {
                        $normalizedAnswers[$questionId] = $answer;
                    } else {
                        $normalizedAnswers[$questionId] = $answer['value'] ?? $answer['value_array'] ?? $answer;
                    }
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

        // Validate "Other" free-text for manual submissions (auto-submits may be incomplete)
        if (!$autoSubmitted && is_array($normalizedAnswers)) {
            foreach ($normalizedAnswers as $questionId => $answerValue) {
                [$normalizedValue, $otherText] = $this->extractOtherPayload($answerValue);

                $isOtherSelected = false;
                if (is_string($normalizedValue) && $normalizedValue === self::OTHER_OPTION_VALUE) {
                    $isOtherSelected = true;
                } elseif (is_array($normalizedValue) && in_array(self::OTHER_OPTION_VALUE, $normalizedValue, true)) {
                    $isOtherSelected = true;
                }

                if ($isOtherSelected) {
                    try {
                        $this->validateOtherTextOrFail($otherText);
                    } catch (\InvalidArgumentException $e) {
                        return response()->json([
                            'message' => 'Validation error',
                            'errors' => [
                                $questionId => [$e->getMessage()],
                            ],
                        ], 422);
                    }
                }
            }
        }

        // For preview mode, update existing preview response or create new one
        if ($isPreview) {
            // Find existing preview response for this participant and activity
            $existingPreviewResponse = Response::where('activity_id', $activityId)
                ->where('participant_id', $participant->id)
                ->where('is_preview', true)
                ->first();

            // Keep response.answers JSON backward compatible (do not store other_text objects)
            $legacyAnswers = [];
            if (is_array($normalizedAnswers)) {
                foreach ($normalizedAnswers as $questionId => $answerValue) {
                    [$normalizedValue] = $this->extractOtherPayload($answerValue);
                    $legacyAnswers[$questionId] = $normalizedValue;
                }
            }
            
            $responseData = [
                'activity_id' => $activityId,
                'participant_id' => $participant->id,
                'answers' => $legacyAnswers,
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
                            [$answerValue, $otherText] = $this->extractOtherPayload($answerValue);

                            // Check if answer has enhanced value display mode structure
                            $isEnhancedPayload = is_array($answerValue) && isset($answerValue['value_type']);
                            
                            // Get comment for this question (if comment is enabled and provided)
                            $commentText = null;
                            $commentedAt = null;
                            if ($question->is_comment_enabled && isset($questionComments[$questionId]) && !empty($questionComments[$questionId])) {
                                $commentText = substr($questionComments[$questionId], 0, 1000); // Max 1000 chars
                                $commentedAt = now();
                            }
                            
                            if ($isEnhancedPayload) {
                                // Store enhanced payload as JSON in value column
                                \App\Models\Answer::create([
                                    'response_id' => $response->id,
                                    'question_id' => $questionId,
                                    'value' => json_encode($answerValue),
                                    'value_array' => null,
                                    'other_text' => null,
                                    'comment_text' => $commentText,
                                    'commented_at' => $commentedAt,
                                ]);
                            } else {
                                // Legacy behavior for standard answers
                                \App\Models\Answer::create([
                                    'response_id' => $response->id,
                                    'question_id' => $questionId,
                                    'value' => is_array($answerValue) ? null : $answerValue,
                                    'value_array' => is_array($answerValue) ? $answerValue : null,
                                    'other_text' => $otherText,
                                    'comment_text' => $commentText,
                                    'commented_at' => $commentedAt,
                                ]);
                            }
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
            $sctTotalScore = 0;
            $sctMaxPossibleScore = 0;
            $sctQuestionCount = 0;
            
            \Log::info('Assessment Scoring Started', [
                'activity_id' => $activityId,
                'participant_id' => $participant->id,
                'submitted_answers' => $normalizedAnswers
            ]);
            
            foreach ($activity->questionnaire->sections as $section) {
                foreach ($section->questions as $question) {
                    // Handle SCT Likert questions with weighted scoring
                    if ($question->type === 'sct_likert' && isset($question->settings['scores']) && is_array($question->settings['scores'])) {
                        $sctQuestionCount++;
                        $questionId = $question->id;
                        $userAnswer = $normalizedAnswers[$questionId] ?? null;
                        $questionOptions = $question->options ?? [];
                        $scores = $question->settings['scores'];
                        
                        // Support both responseType (new) and choiceType (legacy)
                        $responseType = $question->settings['responseType'] ?? $question->settings['choiceType'] ?? 'single';
                        $choiceType = $responseType; // For backward compatibility
                        $normalizeMultiSelect = $question->settings['normalizeMultiSelect'] ?? true;
                        
                        // Calculate max possible score for this question
                        $maxScore = !empty($scores) ? max($scores) : 0;
                        $sctMaxPossibleScore += $maxScore;
                        
                        \Log::info('SCT Question Scoring', [
                            'question_id' => $questionId,
                            'question_text' => $question->text,
                            'user_answer' => $userAnswer,
                            'scores_config' => $scores,
                            'response_type' => $responseType,
                            'max_score' => $maxScore
                        ]);
                        
                        if ($userAnswer !== null) {
                            $questionScore = 0;
                            
                            if ($responseType === 'likert') {
                                // Likert Scale: userAnswer is a numeric value (1-based index)
                                // Convert to 0-based index to access the scores array
                                $selectedPoint = is_numeric($userAnswer) ? intval($userAnswer) : null;
                                
                                if ($selectedPoint !== null && $selectedPoint >= 1 && $selectedPoint <= count($scores)) {
                                    $index = $selectedPoint - 1; // Convert to 0-based index
                                    $questionScore = $scores[$index];
                                }
                                
                                \Log::info('SCT Likert Score', [
                                    'selected_point' => $selectedPoint,
                                    'index' => $index ?? null,
                                    'score' => $questionScore
                                ]);
                            } elseif ($choiceType === 'multi') {
                                // Multi-select: sum scores of all selected options
                                $userAnswerArray = is_array($userAnswer) ? $userAnswer : [$userAnswer];
                                $selectedScores = [];
                                
                                foreach ($userAnswerArray as $answer) {
                                    $index = array_search($answer, $questionOptions);
                                    if ($index !== false && isset($scores[$index])) {
                                        $selectedScores[] = $scores[$index];
                                    }
                                }
                                
                                if (!empty($selectedScores)) {
                                    $questionScore = array_sum($selectedScores);
                                    
                                    // Normalize if enabled (divide by number of selections)
                                    if ($normalizeMultiSelect && count($selectedScores) > 1) {
                                        $questionScore = $questionScore / count($selectedScores);
                                    }
                                }
                                
                                \Log::info('SCT Multi-select Score', [
                                    'selected_scores' => $selectedScores,
                                    'sum' => array_sum($selectedScores),
                                    'normalized' => $normalizeMultiSelect,
                                    'final_score' => $questionScore
                                ]);
                            } else {
                                // Single choice: use the score of the selected option
                                $index = array_search($userAnswer, $questionOptions);
                                if ($index !== false && isset($scores[$index])) {
                                    $questionScore = $scores[$index];
                                }
                                
                                \Log::info('SCT Single-choice Score', [
                                    'selected_index' => $index,
                                    'score' => $questionScore
                                ]);
                            }
                            
                            $sctTotalScore += $questionScore;
                        }
                    }
                    // Only count questions that have correct answers defined
                    else if (isset($question->settings['correctAnswers']) && is_array($question->settings['correctAnswers'])) {
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
                'correct_answers' => $correctAnswers,
                'sct_question_count' => $sctQuestionCount,
                'sct_total_score' => $sctTotalScore,
                'sct_max_possible' => $sctMaxPossibleScore
            ]);
            
            // Calculate combined score from traditional Q&A and SCT questions
            if ($totalQuestions > 0 || $sctQuestionCount > 0) {
                $traditionalScore = 0;
                $sctScore = 0;
                
                // Calculate traditional question score (correct/incorrect)
                if ($totalQuestions > 0) {
                    $traditionalScore = ($correctAnswers / $totalQuestions) * 100;
                    $correctAnswersCount = $correctAnswers;
                }
                
                // Calculate SCT score (weighted scoring)
                if ($sctQuestionCount > 0 && $sctMaxPossibleScore > 0) {
                    $sctScore = ($sctTotalScore / $sctMaxPossibleScore) * 100;
                }
                
                // Combine scores proportionally if both types exist
                if ($totalQuestions > 0 && $sctQuestionCount > 0) {
                    $totalWeight = $totalQuestions + $sctQuestionCount;
                    $traditionalWeight = $totalQuestions / $totalWeight;
                    $sctWeight = $sctQuestionCount / $totalWeight;
                    $score = ($traditionalScore * $traditionalWeight) + ($sctScore * $sctWeight);
                } else if ($sctQuestionCount > 0) {
                    // Only SCT questions
                    $score = $sctScore;
                } else {
                    // Only traditional questions
                    $score = $traditionalScore;
                }
                
                \Log::info('Final Score Calculation', [
                    'traditional_score' => $traditionalScore,
                    'sct_score' => $sctScore,
                    'combined_score' => $score
                ]);
                
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

        // Keep response.answers JSON backward compatible (do not store other_text objects)
        $legacyAnswers = [];
        if (is_array($normalizedAnswers)) {
            foreach ($normalizedAnswers as $questionId => $answerValue) {
                [$normalizedValue] = $this->extractOtherPayload($answerValue);
                $legacyAnswers[$questionId] = $normalizedValue;
            }
        }

        // Update response to submitted status (preserves started_at from first save)
        $response->fill([
            'activity_id' => $activityId,
            'participant_id' => $participant->id,
            'answers' => $legacyAnswers, // Keep for backward compatibility
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
                        [$answerValue, $otherText] = $this->extractOtherPayload($answerValue);

                        // Check if answer has enhanced value display mode structure
                        $isEnhancedPayload = is_array($answerValue) && isset($answerValue['value_type']);
                        
                        // Get comment for this question (if comment is enabled and provided)
                        $commentText = null;
                        $commentedAt = null;
                        if ($question->is_comment_enabled && isset($questionComments[$questionId]) && !empty($questionComments[$questionId])) {
                            $commentText = substr($questionComments[$questionId], 0, 1000); // Max 1000 chars
                            $commentedAt = now();
                        }
                        
                        if ($isEnhancedPayload) {
                            // Store enhanced payload as JSON in value column
                            // updateOrCreate = UPDATE if exists, INSERT if not
                            \App\Models\Answer::updateOrCreate(
                                [
                                    'response_id' => $response->id,
                                    'question_id' => $questionId,
                                ],
                                [
                                    'value' => json_encode($answerValue),
                                    'value_array' => null,
                                    'other_text' => null,
                                    'comment_text' => $commentText,
                                    'commented_at' => $commentedAt,
                                ]
                            );
                        } else {
                            // Legacy behavior for standard answers
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
                                    'other_text' => $otherText,
                                    'comment_text' => $commentText,
                                    'commented_at' => $commentedAt,
                                ]
                            );
                        }
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
        // Check notification settings
        $notificationSettings = $activity->settings['notifications'] ?? [];
        $thankYouEmailEnabled = $notificationSettings['thank_you_email_enabled'] ?? false; // default disabled
        
        if ($thankYouEmailEnabled && $participant->email && filter_var($participant->email, FILTER_VALIDATE_EMAIL)) {
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

        // CRITICAL: Mark generated link as used if token was provided
        // This updates the status, used_at, participant, and response_id
        if (!empty($generatedLinkToken)) {
            \Log::info('Attempting to mark generated link as used', [
                'token_preview' => substr($generatedLinkToken, 0, 20) . '...',
                'participant_id' => $participant->id,
                'response_id' => $response->id,
            ]);
            try {
                $generatedLink = GeneratedEventLink::where('token', $generatedLinkToken)->first();
                if ($generatedLink) {
                    \Log::info('Found generated link', [
                        'link_id' => $generatedLink->id,
                        'current_status' => $generatedLink->status,
                        'tag' => $generatedLink->tag,
                    ]);
                    if ($generatedLink->status === 'unused') {
                        $generatedLink->markAsUsed($participant->id, $response->id);
                        \Log::info('Generated link marked as used', [
                            'token_preview' => substr($generatedLinkToken, 0, 20) . '...',
                            'link_id' => $generatedLink->id,
                            'participant_id' => $participant->id,
                            'response_id' => $response->id,
                            'tag' => $generatedLink->tag,
                            'new_status' => 'used',
                        ]);
                    } else {
                        \Log::info('Generated link already used/expired', [
                            'link_id' => $generatedLink->id,
                            'status' => $generatedLink->status,
                        ]);
                    }
                } else {
                    \Log::warning('Generated link not found for token', [
                        'token_preview' => substr($generatedLinkToken, 0, 20) . '...',
                    ]);
                }
            } catch (\Exception $e) {
                \Log::error('Failed to mark generated link as used', [
                    'token_preview' => substr($generatedLinkToken, 0, 20) . '...',
                    'error' => $e->getMessage()
                ]);
                // Don't fail the submission if link marking fails
            }
        } else {
            \Log::debug('No generated link token provided in submission');
        }

        return response()->json([
            'data' => [
                'response' => $response,
                'response_id' => $response->id, // Added for easier frontend access
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
        // Custom validation - handle anonymous participants specially
        $participantId = $request->input('participant_id');
        $isAnonymous = $this->isAnonymousParticipantId($participantId);
        
        if ($isAnonymous) {
            // For anonymous participants, skip the exists:participants,id validation
            $request->validate([
                'participant_id' => 'required|string',
                'answers' => 'required|array',
            ]);
        } else {
            $request->validate([
                'participant_id' => 'required|exists:participants,id',
                'answers' => 'required|array',
            ]);
        }

        $activity = Activity::with('questionnaire.sections.questions.references')->findOrFail($activityId);
        
        // Get or create participant (handles anonymous participants)
        if ($isAnonymous) {
            $participant = $this->getOrCreateAnonymousParticipant($participantId, $activityId);
        } else {
            $participant = Participant::findOrFail($request->participant_id);
        }

        // Normalize answers (array of objects or associative array)
        $normalizedAnswers = [];
        $answers = $request->answers;
        if (is_array($answers)) {
            $firstItem = reset($answers);
            if (is_array($firstItem) && isset($firstItem['question_id'])) {
                foreach ($answers as $answer) {
                    $questionId = $answer['question_id'];
                    if (isset($answer['other_text']) && (isset($answer['value']) || isset($answer['value_array']))) {
                        $normalizedAnswers[$questionId] = $answer;
                    } else {
                        $normalizedAnswers[$questionId] = $answer['value'] ?? $answer['value_array'] ?? $answer;
                    }
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
        $legacyAnswers = [];
        foreach ($normalizedAnswers as $questionId => $answerValue) {
            [$normalizedValue] = $this->extractOtherPayload($answerValue);
            $legacyAnswers[$questionId] = $normalizedValue;
        }
        $existingAnswers = $response->answers ?? [];
        $response->answers = array_merge($existingAnswers, $legacyAnswers);
        
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

            [$answerValue, $otherText] = $this->extractOtherPayload($answerValue);

            // Check if answer has enhanced value display mode structure
            $isEnhancedPayload = is_array($answerValue) && isset($answerValue['value_type']);
            
            if ($isEnhancedPayload) {
                // Store enhanced payload as JSON in value column
                $answer->value = json_encode($answerValue);
                $answer->value_array = null;
                $answer->other_text = null;
            } else {
                // Legacy behavior for standard answers
                // Update the answer value (handles back navigation / answer changes)
                if (is_array($answerValue)) {
                    $answer->value = null;
                    $answer->value_array = $answerValue;
                } else {
                    $answer->value = $answerValue;
                    $answer->value_array = null;
                }

                $answer->other_text = $otherText;
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
        try {
            $activity = Activity::find($activityId);
            
            if (!$activity) {
                return response()->json([
                    'data' => null,
                    'message' => 'Activity not found'
                ], 404);
            }
            
            // Handle anonymous participants
            $isAnonymous = $this->isAnonymousParticipantId($participantId);
            
            if ($isAnonymous) {
                // For anonymous participants, try to find existing participant
                $participant = Participant::whereJsonContains('additional_data->anonymous_session_id', $participantId)->first();
                
                if (!$participant) {
                    // No progress saved yet for this anonymous session
                    return response()->json([
                        'data' => null,
                        'message' => 'No progress found for this session'
                    ], 404);
                }
            } else {
                $participant = Participant::find($participantId);
                
                if (!$participant) {
                    return response()->json([
                        'data' => null,
                        'message' => 'Participant not found'
                    ], 404);
                }
            }

            // Verify participant is linked to this activity
            if (!$participant->activities()->where('activities.id', $activityId)->exists()) {
                return response()->json([
                    'message' => 'Participant not authorized for this activity'
                ], 403);
            }

            // Find in-progress response
            $response = Response::with('answers')
                ->where('activity_id', $activityId)
                ->where('participant_id', $participant->id)
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
        $otherTexts = [];
        foreach ($response->answers as $answer) {
            $answers[$answer->question_id] = $answer->value_array ?? $answer->value;

            if (!empty($answer->other_text)) {
                $otherTexts[$answer->question_id] = $answer->other_text;
            }
        }

        return response()->json([
            'data' => [
                'has_progress' => true,
                'response_id' => $response->id,
                'answers' => $answers,
                'other_texts' => $otherTexts,
                'last_saved_at' => $response->last_saved_at,
                'started_at' => $response->started_at,
            ],
            'message' => 'Progress loaded successfully'
        ]);
        } catch (\Exception $e) {
            \Log::error('Failed to load progress', [
                'activity_id' => $activityId,
                'participant_id' => $participantId,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'data' => null,
                'message' => 'Failed to load progress: ' . $e->getMessage()
            ], 500);
        }
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

    /**
     * Submit a poll answer and return aggregated results
     * This is for instant poll feedback - stores the answer and returns live results
     */
    public function pollAnswer(Request $request, $activityId)
    {
        $validated = $request->validate([
            'participant_id' => 'required',
            'question_id' => 'required',
            'answer' => 'required',
        ]);

        $activity = Activity::with(['questionnaire.sections.questions'])->find($activityId);
        
        if (!$activity) {
            return response()->json(['error' => 'Activity not found'], 404);
        }

        $participantId = $validated['participant_id'];
        $questionId = $validated['question_id'];
        $answer = $validated['answer'];

        // Handle anonymous participants - still save their answers for aggregation
        $isAnonymous = is_string($participantId) && str_starts_with($participantId, 'anon_');
        
        // Get or create response for this participant (including anonymous)
        if ($isAnonymous) {
            // For anonymous users, look up by guest_identifier
            $response = Response::where('activity_id', $activityId)
                ->where('guest_identifier', $participantId)
                ->first();
            
            if (!$response) {
                $response = Response::create([
                    'id' => \Illuminate\Support\Str::uuid(),
                    'activity_id' => $activityId,
                    'participant_id' => null,
                    'guest_identifier' => $participantId,
                    'status' => 'in_progress',
                    'started_at' => now(),
                ]);
            }
        } else {
            // For registered users, look up by participant_id
            $response = Response::where('activity_id', $activityId)
                ->where('participant_id', $participantId)
                ->first();
            
            if (!$response) {
                $response = Response::create([
                    'id' => \Illuminate\Support\Str::uuid(),
                    'activity_id' => $activityId,
                    'participant_id' => $participantId,
                    'status' => 'in_progress',
                    'started_at' => now(),
                ]);
            }
        }

        // Upsert the answer for this question
        // CRITICAL FIX: Check if answer already exists to prevent duplicate submissions
        $existingAnswer = \DB::table('answers')
            ->where('response_id', $response->id)
            ->where('question_id', $questionId)
            ->first();
        
        if ($existingAnswer) {
            // Answer already submitted - DO NOT allow resubmission
            return response()->json([
                'error' => 'Already Submitted',
                'message' => 'You have already submitted your response for this question.'
            ], 400);
        }
        
        try {
            \DB::table('answers')->insert([
                'response_id' => $response->id,
                'question_id' => $questionId,
                'value' => is_array($answer) ? null : $answer,
                'value_array' => is_array($answer) ? json_encode($answer) : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            \Log::warning('Failed to save poll answer', [
                'error' => $e->getMessage(),
                'response_id' => $response->id,
                'question_id' => $questionId,
            ]);
        }

        // Get the question to understand options
        $question = null;
        foreach ($activity->questionnaire->sections as $section) {
            foreach ($section->questions as $q) {
                if ($q->id == $questionId) {
                    $question = $q;
                    break 2;
                }
            }
        }

        if (!$question) {
            return response()->json(['error' => 'Question not found'], 404);
        }

        // Aggregate all answers for this question across all responses for this activity
        $answerCounts = \DB::table('answers')
            ->join('responses', 'answers.response_id', '=', 'responses.id')
            ->where('responses.activity_id', $activityId)
            ->where('answers.question_id', $questionId)
            ->select(
                \DB::raw('COALESCE(answers.value, answers.value_array::text) as answer_value'),
                \DB::raw('COUNT(*) as count')
            )
            ->groupBy(\DB::raw('COALESCE(answers.value, answers.value_array::text)'))
            ->get();

        // Build results based on question type
        $results = [];
        $totalVotes = $answerCounts->sum('count');

        // Get options based on question type
        if ($question->type === 'rating') {
            $maxRating = $question->settings['scale'] ?? $question->max_value ?? 5;
            $options = array_map(fn($i) => (string)$i, range(1, $maxRating));
        } else {
            // Multiple choice, single choice, checkbox, etc.
            $options = collect($question->options ?? [])->map(function ($opt) {
                return is_array($opt) ? ($opt['value'] ?? $opt['text'] ?? $opt['label'] ?? $opt) : $opt;
            })->toArray();
        }

        // Build results for each option
        foreach ($options as $option) {
            $optionStr = (string)$option;
            $count = 0;
            
            foreach ($answerCounts as $row) {
                $storedValue = $row->answer_value;
                // Handle JSON encoded arrays
                if (str_starts_with($storedValue, '[') || str_starts_with($storedValue, '{')) {
                    $decoded = json_decode($storedValue, true);
                    if (is_array($decoded)) {
                        if (in_array($optionStr, $decoded) || in_array($option, $decoded)) {
                            $count += $row->count;
                        }
                    }
                } else {
                    if ((string)$storedValue === $optionStr) {
                        $count += $row->count;
                    }
                }
            }

            $percentage = $totalVotes > 0 ? ($count / $totalVotes) * 100 : 0;
            $results[] = [
                'option' => $optionStr,
                'count' => $count,
                'percentage' => round($percentage, 1),
            ];
        }

        // Sort by percentage descending
        usort($results, fn($a, $b) => $b['percentage'] <=> $a['percentage']);

        return response()->json([
            'success' => true,
            'data' => [
                'results' => $results,
                'total_votes' => $totalVotes,
                'question_id' => $questionId,
            ]
        ]);
    }

    /**
     * Get current poll results without submitting
     * Used when user revisits a submitted poll question
     */
    public function getPollResults(Request $request, $activityId, $questionId)
    {
        try {
            // Validate UUID format
            if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $activityId)) {
                return response()->json(['error' => 'Activity not found'], 404);
            }
            
            $activity = Activity::with(['questionnaire.sections.questions'])->find($activityId);
        
        if (!$activity) {
            return response()->json(['error' => 'Activity not found'], 404);
        }

        // Get the question to understand options
        $question = null;
        foreach ($activity->questionnaire->sections as $section) {
            foreach ($section->questions as $q) {
                if ($q->id == $questionId) {
                    $question = $q;
                    break 2;
                }
            }
        }

        if (!$question) {
            return response()->json(['error' => 'Question not found'], 404);
        }

        // Aggregate all answers for this question across all responses for this activity
        $answerCounts = \DB::table('answers')
            ->join('responses', 'answers.response_id', '=', 'responses.id')
            ->where('responses.activity_id', $activityId)
            ->where('answers.question_id', $questionId)
            ->select(
                \DB::raw('COALESCE(answers.value, answers.value_array::text) as answer_value'),
                \DB::raw('COUNT(*) as count')
            )
            ->groupBy(\DB::raw('COALESCE(answers.value, answers.value_array::text)'))
            ->get();

        // Build results based on question type
        $results = [];
        $totalVotes = $answerCounts->sum('count');

        // Get options based on question type
        if ($question->type === 'rating') {
            $maxRating = $question->settings['scale'] ?? $question->max_value ?? 5;
            $options = array_map(fn($i) => (string)$i, range(1, $maxRating));
        } else {
            // Multiple choice, single choice, checkbox, etc.
            $options = collect($question->options ?? [])->map(function ($opt) {
                return is_array($opt) ? ($opt['value'] ?? $opt['text'] ?? $opt['label'] ?? $opt) : $opt;
            })->toArray();
        }

        // Build results for each option
        foreach ($options as $option) {
            $optionStr = (string)$option;
            $count = 0;
            
            foreach ($answerCounts as $row) {
                $storedValue = $row->answer_value;
                // Handle JSON encoded arrays
                if (str_starts_with($storedValue, '[') || str_starts_with($storedValue, '{')) {
                    $decoded = json_decode($storedValue, true);
                    if (is_array($decoded)) {
                        if (in_array($optionStr, $decoded) || in_array($option, $decoded)) {
                            $count += $row->count;
                        }
                    }
                } else {
                    if ((string)$storedValue === $optionStr) {
                        $count += $row->count;
                    }
                }
            }

            $percentage = $totalVotes > 0 ? ($count / $totalVotes) * 100 : 0;
            $results[] = [
                'option' => $optionStr,
                'count' => $count,
                'percentage' => round($percentage, 1),
            ];
        }

        // Sort by percentage descending
        usort($results, fn($a, $b) => $b['percentage'] <=> $a['percentage']);

        return response()->json([
            'success' => true,
            'data' => [
                'results' => $results,
                'total_votes' => $totalVotes,
                'question_id' => $questionId,
            ]
        ]);
        } catch (\Exception $e) {
            \Log::error('getPollResults error: ' . $e->getMessage(), [
                'activityId' => $activityId,
                'questionId' => $questionId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch poll results: ' . $e->getMessage()
            ], 500);
        }
    }
}
