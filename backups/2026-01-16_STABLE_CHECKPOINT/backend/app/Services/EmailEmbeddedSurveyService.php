<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Question;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

/**
 * Service to send email-embedded surveys
 */
class EmailEmbeddedSurveyService
{
    private EmailResponseTokenService $tokenService;

    public function __construct(EmailResponseTokenService $tokenService)
    {
        $this->tokenService = $tokenService;
    }

    /**
     * Send email-embedded survey to recipients
     * 
     * @param Activity $activity
     * @param Question $question The single question to embed
     * @param array $recipients Array of email addresses
     * @param string|null $fallbackUrl Optional fallback URL for web version
     * @param array $emailConfig Optional email configuration (subject, from_name, preheader, header_text, footer_text)
     */
    public function sendEmbeddedSurvey(
        Activity $activity,
        Question $question,
        array $recipients,
        ?string $fallbackUrl = null,
        array $emailConfig = []
    ): array {
        $sent = 0;
        $failed = 0;
        $failedEmails = [];

        // Get question options
        $options = $this->prepareOptions($activity, $question, $recipients[0]);

        // Prepare email configuration with defaults
        $subject = $emailConfig['subject'] ?? "Quick Survey: {$activity->name}";
        $fromName = $emailConfig['from_name'] ?? $activity->manager_name ?? config('mail.from.name');
        $preheader = $emailConfig['preheader'] ?? "We'd love your quick feedback";
        $headerText = $emailConfig['header_text'] ?? null;
        $footerText = $emailConfig['footer_text'] ?? "Thank you for your feedback!";

        foreach ($recipients as $email) {
            try {
                // Generate unique options for this recipient
                $recipientOptions = $this->prepareOptions($activity, $question, $email);
                
                // Get participant name for personalization
                $participantName = $this->getParticipantName($email, $activity->id);
                
                // Replace placeholders in header text
                $personalizedHeader = $headerText ? str_replace('{{name}}', $participantName, $headerText) : null;

                Mail::send('emails.embedded-question', [
                    'activity' => $activity,
                    'question' => $question,
                    'options' => $recipientOptions,
                    'fallbackUrl' => $fallbackUrl ?? url("/activities/{$activity->id}/take"),
                    'preheader' => $preheader,
                    'headerText' => $personalizedHeader,
                    'footerText' => $footerText,
                    'participantName' => $participantName,
                ], function ($message) use ($email, $activity, $subject, $fromName) {
                    $message->to($email)
                        ->subject($subject)
                        ->from(
                            $activity->sender_email ?? config('mail.from.address'),
                            $fromName
                        );
                });

                $sent++;
            } catch (\Exception $e) {
                $failed++;
                $failedEmails[] = $email;
                Log::error('Failed to send email-embedded survey', [
                    'email' => $email,
                    'activity_id' => $activity->id,
                    'question_id' => $question->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return [
            'sent' => $sent,
            'failed' => $failed,
            'failed_emails' => $failedEmails,
        ];
    }
    
    /**
     * Get participant name by email
     */
    private function getParticipantName(string $email, int $activityId): string
    {
        $participant = \App\Models\ActivityParticipant::where('email', $email)
            ->where('activity_id', $activityId)
            ->first();
        
        return $participant?->name ?? explode('@', $email)[0];
    }

    /**
     * Prepare options with submission URLs
     */
    private function prepareOptions(Activity $activity, Question $question, string $recipientEmail): array
    {
        $options = [];

        // Handle different question types
        if (in_array($question->type, ['single_choice', 'multiple_choice', 'radio', 'select'])) {
            // Get options from question
            $questionOptions = is_array($question->options) ? $question->options : [];
            
            foreach ($questionOptions as $option) {
                $optionText = is_string($option) ? $option : ($option['text'] ?? $option['label'] ?? $option['option_text'] ?? '');
                
                $options[] = [
                    'text' => $optionText,
                    'url' => $this->tokenService->generateSubmissionUrl(
                        $activity->id,
                        $question->id,
                        $recipientEmail,
                        $optionText
                    ),
                ];
            }
        } elseif (in_array($question->type, ['yes_no', 'yesno'])) {
            $options = [
                [
                    'text' => '✅ Yes',
                    'url' => $this->tokenService->generateSubmissionUrl(
                        $activity->id,
                        $question->id,
                        $recipientEmail,
                        'Yes'
                    ),
                ],
                [
                    'text' => '❌ No',
                    'url' => $this->tokenService->generateSubmissionUrl(
                        $activity->id,
                        $question->id,
                        $recipientEmail,
                        'No'
                    ),
                ],
            ];
        } elseif (in_array($question->type, ['rating', 'scale'])) {
            // Get max rating from settings or validation (default 5)
            $maxRating = $question->settings['max'] ?? $question->validation['max'] ?? 5;
            
            for ($i = 1; $i <= $maxRating; $i++) {
                $options[] = [
                    'text' => "{$i}",
                    'url' => $this->tokenService->generateSubmissionUrl(
                        $activity->id,
                        $question->id,
                        $recipientEmail,
                        (string) $i
                    ),
                ];
            }
        }

        return $options;
    }

    /**
     * Send email-embedded survey for first question of activity's questionnaire
     */
    public function sendForActivity(Activity $activity, array $recipients): array
    {
        // Get first question from questionnaire
        $question = $this->getFirstQuestion($activity);

        if (!$question) {
            throw new \Exception('No questions found in activity questionnaire');
        }

        return $this->sendEmbeddedSurvey($activity, $question, $recipients);
    }

    /**
     * Get first suitable question from activity
     */
    private function getFirstQuestion(Activity $activity): ?Question
    {
        if (!$activity->questionnaire) {
            return null;
        }

        foreach ($activity->questionnaire->sections as $section) {
            foreach ($section->questions as $question) {
                // Only single-choice, rating, yes/no are supported
                if (in_array($question->type, ['single_choice', 'radio', 'rating', 'yes_no'])) {
                    return $question;
                }
            }
        }

        return null;
    }
}
