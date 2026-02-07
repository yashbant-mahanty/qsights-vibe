<?php

namespace App\Services;

use App\Models\NotificationLog;
use App\Models\SystemSetting;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class NotificationLogService
{
    /**
     * Create a new notification log entry
     * 
     * @param array $data Notification data
     * @return NotificationLog|null
     */
    public function createLog(array $data): ?NotificationLog
    {
        try {
            // Check if logging is enabled
            if (!$this->isLoggingEnabled()) {
                Log::debug('NotificationLogService: Logging disabled, skipping');
                return null;
            }

            // Prepare log data
            $logData = [
                'id' => Str::uuid(),
                'user_id' => $data['user_id'] ?? null,
                'participant_id' => $data['participant_id'] ?? null,
                'anonymous_token' => $data['anonymous_token'] ?? null,
                'recipient_email' => $data['recipient_email'] ?? null,
                'recipient_phone' => $data['recipient_phone'] ?? null,
                'event_id' => $data['event_id'] ?? null,
                'questionnaire_id' => $data['questionnaire_id'] ?? null,
                'notification_type' => $data['notification_type'] ?? null,
                'channel' => $data['channel'] ?? 'email',
                'provider' => $data['provider'] ?? 'SendGrid',
                'provider_message_id' => $data['provider_message_id'] ?? null,
                'subject' => $data['subject'] ?? null,
                'message_preview' => $this->getMessagePreview($data['message'] ?? ''),
                'metadata' => $data['metadata'] ?? null,
                'status' => 'queued',
                'queued_at' => now(),
            ];

            $notificationLog = NotificationLog::create($logData);

            Log::info('NotificationLogService: Created notification log', [
                'log_id' => $notificationLog->id,
                'channel' => $logData['channel'],
                'recipient' => $logData['recipient_email'] ?? $logData['recipient_phone']
            ]);

            return $notificationLog;

        } catch (\Exception $e) {
            // Never block notification sending if logging fails
            Log::error('NotificationLogService: Failed to create log (non-blocking)', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return null;
        }
    }

    /**
     * Update notification status to 'sent'
     */
    public function markAsSent($logId, string $providerMessageId = null): bool
    {
        try {
            $log = NotificationLog::find($logId);
            if ($log) {
                $log->markAsSent($providerMessageId);
                return true;
            }
            return false;
        } catch (\Exception $e) {
            Log::error('NotificationLogService: Failed to mark as sent', [
                'log_id' => $logId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Update notification status to 'failed'
     */
    public function markAsFailed($logId, string $errorMessage = null): bool
    {
        try {
            $log = NotificationLog::find($logId);
            if ($log) {
                $log->markAsFailed($errorMessage);
                return true;
            }
            return false;
        } catch (\Exception $e) {
            Log::error('NotificationLogService: Failed to mark as failed', [
                'log_id' => $logId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Handle webhook event from provider (e.g., SendGrid)
     */
    public function handleWebhook(string $providerMessageId, string $eventType, array $eventData = []): bool
    {
        try {
            // Find notification log by provider message ID
            $log = NotificationLog::where('provider_message_id', $providerMessageId)->first();
            
            if (!$log) {
                Log::warning('NotificationLogService: Notification log not found for webhook', [
                    'provider_message_id' => $providerMessageId,
                    'event_type' => $eventType
                ]);
                return false;
            }

            // Add webhook event to log
            $log->addWebhookEvent([
                'event_type' => $eventType,
                'data' => $eventData,
                'timestamp' => now()->toIso8601String()
            ]);

            // Update status based on event type
            switch (strtolower($eventType)) {
                case 'delivered':
                    $log->markAsDelivered();
                    break;
                    
                case 'open':
                case 'opened':
                    $log->markAsOpened();
                    break;
                    
                case 'click':
                case 'clicked':
                    $log->markAsClicked();
                    break;
                    
                case 'bounce':
                case 'bounced':
                    $log->markAsBounced($eventData['reason'] ?? null);
                    break;
                    
                case 'dropped':
                case 'failed':
                    $log->markAsFailed($eventData['reason'] ?? null);
                    break;
            }

            Log::info('NotificationLogService: Webhook processed', [
                'log_id' => $log->id,
                'event_type' => $eventType,
                'status' => $log->status
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('NotificationLogService: Failed to handle webhook', [
                'provider_message_id' => $providerMessageId,
                'event_type' => $eventType,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Get notification statistics for an event/activity
     */
    public function getStatistics(string $eventId): array
    {
        try {
            $logs = NotificationLog::where('event_id', $eventId)->get();

            return [
                'total' => $logs->count(),
                'sent' => $logs->where('status', 'sent')->count(),
                'delivered' => $logs->where('status', 'delivered')->count(),
                'opened' => $logs->where('status', 'opened')->count(),
                'clicked' => $logs->where('status', 'clicked')->count(),
                'bounced' => $logs->where('status', 'bounced')->count(),
                'failed' => $logs->where('status', 'failed')->count(),
                'by_channel' => $logs->groupBy('channel')->map->count()->toArray(),
                'avg_delivery_time' => $this->calculateAverageDeliveryTime($logs),
                'avg_open_time' => $this->calculateAverageOpenTime($logs),
            ];

        } catch (\Exception $e) {
            Log::error('NotificationLogService: Failed to get statistics', [
                'event_id' => $eventId,
                'error' => $e->getMessage()
            ]);
            
            return [];
        }
    }

    /**
     * Calculate average delivery time in seconds
     */
    protected function calculateAverageDeliveryTime($logs): ?float
    {
        $deliveryTimes = $logs
            ->filter(fn($log) => $log->getTimeToDeliver() !== null)
            ->pluck('time_to_deliver')
            ->filter();

        return $deliveryTimes->count() > 0 ? $deliveryTimes->avg() : null;
    }

    /**
     * Calculate average open time in seconds
     */
    protected function calculateAverageOpenTime($logs): ?float
    {
        $openTimes = $logs
            ->filter(fn($log) => $log->getTimeToOpen() !== null)
            ->map(fn($log) => $log->getTimeToOpen())
            ->filter();

        return $openTimes->count() > 0 ? $openTimes->avg() : null;
    }

    /**
     * Get message preview (first 500 characters)
     */
    protected function getMessagePreview(string $message): ?string
    {
        if (!$this->shouldLogContent()) {
            return null;
        }

        // Strip HTML tags and get first 500 characters
        $text = strip_tags($message);
        return mb_substr($text, 0, 500);
    }

    /**
     * Check if logging is enabled in settings
     */
    protected function isLoggingEnabled(): bool
    {
        try {
            $setting = SystemSetting::getValue('data_safety_enable_notification_logging');
            return filter_var($setting, FILTER_VALIDATE_BOOLEAN);
        } catch (\Exception $e) {
            // Default to enabled
            return true;
        }
    }

    /**
     * Check if message content should be logged
     */
    protected function shouldLogContent(): bool
    {
        try {
            $setting = SystemSetting::getValue('data_safety_log_notification_content');
            return filter_var($setting, FILTER_VALIDATE_BOOLEAN);
        } catch (\Exception $e) {
            // Default to enabled
            return true;
        }
    }
}
