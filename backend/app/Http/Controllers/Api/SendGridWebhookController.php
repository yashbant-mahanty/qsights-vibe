<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationEvent;
use App\Models\Notification;
use App\Models\Participant;
use App\Models\User;
use App\Services\NotificationLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SendGridWebhookController extends Controller
{
    protected $notificationLogService;

    public function __construct(NotificationLogService $notificationLogService)
    {
        $this->notificationLogService = $notificationLogService;
    }

    /**
     * Handle SendGrid webhook events
     * This endpoint receives delivery, open, click, bounce, etc. events from SendGrid
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function handle(Request $request)
    {
        try {
            $events = $request->all();
            
            Log::info('SendGrid Webhook Received', [
                'event_count' => count($events),
                'raw_payload' => $events
            ]);

            $processedCount = 0;
            $errorCount = 0;

            foreach ($events as $event) {
                try {
                    $this->processEvent($event);
                    $processedCount++;
                } catch (\Exception $e) {
                    $errorCount++;
                    Log::error('Failed to process SendGrid event', [
                        'event' => $event,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            Log::info('SendGrid Webhook Processing Complete', [
                'processed' => $processedCount,
                'errors' => $errorCount
            ]);

            return response()->json([
                'success' => true,
                'processed' => $processedCount,
                'errors' => $errorCount
            ], 200);

        } catch (\Exception $e) {
            Log::error('SendGrid Webhook Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * Process a single SendGrid event
     * 
     * @param array $event
     * @return void
     */
    protected function processEvent(array $event)
    {
        // Extract event data
        $eventType = $event['event'] ?? null;
        $email = $event['email'] ?? null;
        $timestamp = $event['timestamp'] ?? time();
        $sendgridMessageId = $event['sg_message_id'] ?? null;

        if (!$eventType || !$email) {
            Log::warning('Invalid SendGrid event - missing required fields', ['event' => $event]);
            return;
        }

        // Find the notification by SendGrid message ID or email
        $notification = null;
        if ($sendgridMessageId) {
            $notification = Notification::where('sendgrid_message_id', $sendgridMessageId)->first();
        }
        
        // If not found by message ID, try to find by email and recent timestamp
        if (!$notification) {
            $notification = Notification::where('recipient_email', $email)
                ->where('created_at', '>=', now()->subHours(24))
                ->orderBy('created_at', 'desc')
                ->first();
        }

        // Find participant by email
        $participant = Participant::where('email', $email)->first();
        
        // Find user by email
        $user = User::where('email', $email)->first();

        // Extract program and activity info from custom args or metadata
        $programName = $event['program_name'] ?? null;
        $programId = $event['program_id'] ?? null;
        $activityName = $event['activity_name'] ?? null;
        $activityId = $event['activity_id'] ?? null;

        // If we have a notification, try to get program/activity from its metadata
        if ($notification && $notification->metadata) {
            $metadata = $notification->metadata;
            $programName = $programName ?? $metadata['program_name'] ?? null;
            $programId = $programId ?? $metadata['program_id'] ?? null;
            $activityName = $activityName ?? $metadata['activity_name'] ?? null;
            $activityId = $activityId ?? $metadata['activity_id'] ?? null;
        }

        // Create notification event record (existing table)
        NotificationEvent::create([
            'notification_id' => $notification ? $notification->id : null,
            'sendgrid_message_id' => $sendgridMessageId,
            'event_type' => $eventType,
            'email' => $email,
            'participant_id' => $participant ? $participant->id : null,
            'user_id' => $user ? $user->id : null,
            'program_name' => $programName,
            'program_id' => $programId,
            'activity_name' => $activityName,
            'activity_id' => $activityId,
            'event_timestamp' => date('Y-m-d H:i:s', $timestamp),
            'ip_address' => $event['ip'] ?? null,
            'user_agent' => $event['useragent'] ?? null,
            'url' => $event['url'] ?? null,
            'reason' => $event['reason'] ?? null,
            'raw_data' => $event,
        ]);

        // Also update notification log (new audit system)
        if ($sendgridMessageId) {
            try {
                // Extract base message ID (before the dot if present)
                $baseMessageId = strpos($sendgridMessageId, '.') !== false 
                    ? substr($sendgridMessageId, 0, strpos($sendgridMessageId, '.'))
                    : $sendgridMessageId;
                
                $this->notificationLogService->handleWebhook(
                    $baseMessageId,
                    $eventType,
                    [
                        'email' => $email,
                        'timestamp' => $timestamp,
                        'reason' => $event['reason'] ?? null,
                        'response' => $event['response'] ?? null,
                        'ip' => $event['ip'] ?? null,
                        'useragent' => $event['useragent'] ?? null,
                        'url' => $event['url'] ?? null,
                        'raw_event' => $event,
                    ]
                );
            } catch (\Exception $e) {
                // Log but don't fail - this is supplementary logging
                Log::warning('Failed to update notification log from webhook', [
                    'sg_message_id' => $sendgridMessageId,
                    'error' => $e->getMessage()
                ]);
            }
        }

        Log::info('SendGrid event processed', [
            'event_type' => $eventType,
            'email' => $email,
            'notification_id' => $notification ? $notification->id : null,
            'participant_id' => $participant ? $participant->id : null,
            'program_name' => $programName
        ]);
    }
}
