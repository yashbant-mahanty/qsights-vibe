<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Question;
use App\Services\EmailEmbeddedSurveyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EmailEmbeddedSurveyController extends Controller
{
    private EmailEmbeddedSurveyService $surveyService;

    public function __construct(EmailEmbeddedSurveyService $surveyService)
    {
        $this->surveyService = $surveyService;
    }

    /**
     * Send email-embedded survey to recipients
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function send(Request $request)
    {
        $validated = $request->validate([
            'activity_id' => 'required|exists:activities,id',
            'question_id' => 'required|integer|exists:questions,id',
            'emails' => 'required|array|min:1',
            'emails.*' => 'email',
            'email_config' => 'nullable|array',
            'email_config.subject' => 'nullable|string|max:255',
            'email_config.from_name' => 'nullable|string|max:100',
            'email_config.preheader' => 'nullable|string|max:255',
            'email_config.header_text' => 'nullable|string|max:500',
            'email_config.footer_text' => 'nullable|string|max:500',
        ]);

        try {
            $activity = Activity::findOrFail($validated['activity_id']);
            $question = Question::with('section')->findOrFail($validated['question_id']);

            // Verify the question belongs to the activity's questionnaire via section
            $questionQuestionnaireId = $question->section ? $question->section->questionnaire_id : null;
            
            if ($activity->questionnaire_id != $questionQuestionnaireId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Question does not belong to this activity\'s questionnaire',
                ], 400);
            }

            // Check if question type is embeddable (using 'type' field)
            $embeddableTypes = ['radio', 'single_select', 'yesno', 'rating', 'scale', 'select'];
            if (!in_array($question->type, $embeddableTypes)) {
                return response()->json([
                    'success' => false,
                    'message' => 'This question type cannot be embedded in email. Use radio, rating, scale, or yesno.',
                ], 400);
            }

            Log::info('Sending email-embedded survey', [
                'activity_id' => $activity->id,
                'activity_name' => $activity->name,
                'question_id' => $question->id,
                'question_title' => $question->title,
                'recipient_count' => count($validated['emails']),
                'has_email_config' => isset($validated['email_config']),
            ]);

            $emailConfig = $validated['email_config'] ?? [];

            $result = $this->surveyService->sendEmbeddedSurvey(
                $activity,
                $question,
                $validated['emails'],
                null, // fallbackUrl
                $emailConfig
            );

            Log::info('Email-embedded survey send completed', $result);

            return response()->json([
                'success' => true,
                'message' => "Email-embedded survey sent to {$result['sent']} recipient(s)",
                'sent_count' => $result['sent'],
                'failed_count' => $result['failed'],
                'failed_emails' => $result['failed_emails'] ?? [],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to send email-embedded survey', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send email-embedded survey: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get questions that can be embedded in email for an activity
     * 
     * @param Request $request
     * @param string $activityId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getEmbeddableQuestions(Request $request, string $activityId)
    {
        try {
            $activity = Activity::with('questionnaire.questions')->findOrFail($activityId);

            if (!$activity->questionnaire) {
                return response()->json([
                    'success' => true,
                    'questions' => [],
                    'message' => 'No questionnaire linked to this activity',
                ]);
            }

            $embeddableTypes = ['single_choice', 'radio', 'yes_no', 'rating'];
            $questions = $activity->questionnaire->questions
                ->filter(fn($q) => in_array($q->question_type, $embeddableTypes))
                ->values()
                ->map(function ($q) {
                    return [
                        'id' => $q->id,
                        'question_text' => $q->question_text,
                        'question_type' => $q->question_type,
                        'options' => $q->options ?? [],
                        'order' => $q->order,
                    ];
                });

            return response()->json([
                'success' => true,
                'questions' => $questions,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get embeddable questions', [
                'activity_id' => $activityId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get questions: ' . $e->getMessage(),
            ], 500);
        }
    }
}
