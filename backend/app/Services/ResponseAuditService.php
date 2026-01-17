<?php

namespace App\Services;

use App\Models\Response;
use App\Models\ResponseAuditLog;
use App\Models\Answer;
use App\Models\SystemSetting;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ResponseAuditService
{
    /**
     * Log response data to audit table (secondary backup)
     * This is called AFTER primary response save is successful
     * 
     * @param Response $response
     * @param array $answers Array of Answer models or answer data
     * @param string $source Source of submission (web, email, qr, anonymous)
     * @return bool Success status
     */
    public function logResponse(Response $response, array $answers, string $source = 'web'): bool
    {
        try {
            // Check if backup is enabled
            if (!$this->isBackupEnabled()) {
                Log::debug('ResponseAuditService: Backup disabled, skipping');
                return true; // Not an error, just disabled
            }

            // Check if we should include anonymous responses
            if ($this->isAnonymous($response) && !$this->includeAnonymous()) {
                Log::debug('ResponseAuditService: Skipping anonymous response (disabled in settings)');
                return true;
            }

            // Log each answer as a separate audit record
            foreach ($answers as $answerData) {
                $this->logSingleAnswer($response, $answerData, $source);
            }

            Log::info('ResponseAuditService: Successfully logged response', [
                'response_id' => $response->id,
                'answers_count' => count($answers),
                'source' => $source
            ]);

            return true;

        } catch (\Exception $e) {
            // CRITICAL: Never block primary flow if backup fails
            Log::error('ResponseAuditService: Failed to log response (non-blocking)', [
                'response_id' => $response->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Return false but don't throw - this is a backup function
            return false;
        }
    }

    /**
     * Log a single answer to the audit table
     */
    protected function logSingleAnswer(Response $response, $answerData, string $source): void
    {
        // Handle both Answer model and array data
        if ($answerData instanceof Answer) {
            $questionId = $answerData->question_id;
            $answerValue = $answerData->value;
            $answerValueArray = $answerData->value_array;
            $answerFilePath = $answerData->file_path;
            $answerTranslations = $answerData->value_translations;
        } else {
            $questionId = $answerData['question_id'];
            $answerValue = $answerData['value'] ?? null;
            $answerValueArray = $answerData['value_array'] ?? null;
            $answerFilePath = $answerData['file_path'] ?? null;
            $answerTranslations = $answerData['value_translations'] ?? null;
        }

        // Extract option_id if it's a radio/checkbox question
        $optionId = $this->extractOptionId($answerValue, $answerValueArray);

        ResponseAuditLog::create([
            'id' => Str::uuid(),
            'response_id' => $response->id,
            'user_id' => $this->getUserId($response),
            'participant_id' => $response->participant_id,
            'event_id' => $response->activity_id,
            'questionnaire_id' => $response->activity->questionnaire_id ?? null,
            'question_id' => $questionId,
            'option_id' => $optionId,
            'answer_value' => $answerValue,
            'answer_value_array' => $answerValueArray,
            'answer_file_path' => $answerFilePath,
            'answer_translations' => $answerTranslations,
            'source' => $source,
            'submitted_at' => $response->submitted_at ?? now(),
        ]);
    }

    /**
     * Determine the user_id from response
     */
    protected function getUserId(Response $response): ?string
    {
        // If participant exists, get their user_id
        if ($response->participant_id) {
            $participant = $response->participant;
            return $participant ? $participant->user_id : null;
        }
        
        return null;
    }

    /**
     * Check if response is anonymous
     */
    protected function isAnonymous(Response $response): bool
    {
        return is_null($response->participant_id) && !empty($response->guest_identifier);
    }

    /**
     * Extract option ID from answer value (for MCQ/radio questions)
     * This is a simplified version - enhance based on your option storage
     */
    protected function extractOptionId($answerValue, $answerValueArray): ?string
    {
        // If you store option IDs in your questions, implement logic here
        // For now, return null - can be enhanced later
        return null;
    }

    /**
     * Check if backup is enabled in settings
     */
    protected function isBackupEnabled(): bool
    {
        try {
            $setting = SystemSetting::getValue('data_safety_enable_response_backup');
            return filter_var($setting, FILTER_VALIDATE_BOOLEAN);
        } catch (\Exception $e) {
            // Default to enabled if setting doesn't exist
            return true;
        }
    }

    /**
     * Check if anonymous responses should be included
     */
    protected function includeAnonymous(): bool
    {
        try {
            $setting = SystemSetting::getValue('data_safety_include_anonymous');
            return filter_var($setting, FILTER_VALIDATE_BOOLEAN);
        } catch (\Exception $e) {
            // Default to included
            return true;
        }
    }

    /**
     * Get statistics about audit logs
     */
    public function getStatistics(array $filters = []): array
    {
        $query = ResponseAuditLog::query();

        if (isset($filters['event_id'])) {
            $query->where('event_id', $filters['event_id']);
        }

        if (isset($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to']);
        }

        return [
            'total_logs' => $query->count(),
            'anonymous_count' => (clone $query)->anonymous()->count(),
            'authenticated_count' => (clone $query)->authenticated()->count(),
            'by_source' => (clone $query)
                ->select('source', DB::raw('count(*) as count'))
                ->groupBy('source')
                ->pluck('count', 'source')
                ->toArray(),
        ];
    }
}
