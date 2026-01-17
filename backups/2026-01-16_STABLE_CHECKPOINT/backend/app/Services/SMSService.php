<?php

namespace App\Services;

use App\Models\Notification;
use Illuminate\Support\Str;

class SMSService
{
    /**
     * Send SMS (placeholder for future implementation)
     * Can be integrated with Twilio, AWS SNS, or other SMS providers
     */
    public function send($to, $message, $metadata = [])
    {
        // Placeholder - log as pending for future implementation
        $notification = Notification::create([
            'id' => Str::uuid(),
            'type' => 'sms',
            'event' => $metadata['event'] ?? 'sms_sent',
            'participant_id' => $metadata['participant_id'] ?? null,
            'recipient_phone' => $to,
            'message' => $message,
            'status' => 'pending',
            'metadata' => array_merge($metadata, ['note' => 'SMS service not configured']),
        ]);

        return [
            'success' => false,
            'message' => 'SMS service is not configured. Notification logged for future processing.',
            'notification_id' => $notification->id,
        ];
    }

    /**
     * Send activity invitation SMS
     */
    public function sendActivityInvitation($participant, $activity)
    {
        $message = "You're invited to {$activity->name}. Starts on {$activity->start_date->format('M j, Y')}. Visit: " . env('APP_URL') . "/activities/{$activity->id}";

        return $this->send(
            $participant->phone,
            $message,
            [
                'event' => 'activity_created',
                'participant_id' => $participant->id,
                'activity_id' => $activity->id,
                'program_id' => $activity->program_id,
            ]
        );
    }

    /**
     * Send activity reminder SMS
     */
    public function sendActivityReminder($participant, $activity)
    {
        $message = "Reminder: {$activity->name} starts on {$activity->start_date->format('M j, Y')}. Don't miss it!";

        return $this->send(
            $participant->phone,
            $message,
            [
                'event' => 'activity_reminder',
                'participant_id' => $participant->id,
                'activity_id' => $activity->id,
                'program_id' => $activity->program_id,
            ]
        );
    }
}
