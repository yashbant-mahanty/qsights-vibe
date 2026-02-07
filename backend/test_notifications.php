<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Activity;
use App\Models\Participant;
use App\Models\Notification;
use App\Services\NotificationService;
use App\Services\EmailService;
use App\Services\SMSService;

echo "=== QSights Notification System Test ===\n\n";

// Get test activity and participant
$activity = Activity::with('program')->first();
$participant = Participant::where('email_notifications', true)->first();

if (!$activity || !$participant) {
    echo "Error: No activity or participant found for testing.\n";
    exit(1);
}

echo "Test Activity: {$activity->name}\n";
echo "Test Participant: {$participant->name} ({$participant->email})\n\n";

// Test 1: Email Service (will fail without valid SendGrid key, but will log notification)
echo "Test 1: Email Service\n";
echo "----------------------\n";
$emailService = new EmailService();

try {
    $result = $emailService->sendActivityInvitation($participant, $activity);
    echo "Result: " . ($result['success'] ? 'SUCCESS' : 'FAILED') . "\n";
    echo "Notification ID: {$result['notification_id']}\n";
    if (isset($result['error'])) {
        echo "Error: {$result['error']}\n";
    }
} catch (Exception $e) {
    echo "Exception: {$e->getMessage()}\n";
}

echo "\n";

// Test 2: SMS Service (placeholder)
echo "Test 2: SMS Service (Placeholder)\n";
echo "-----------------------------------\n";
$smsService = new SMSService();
$result = $smsService->sendActivityInvitation($participant, $activity);
echo "Result: " . ($result['success'] ? 'SUCCESS' : 'PENDING') . "\n";
echo "Message: {$result['message']}\n";
echo "Notification ID: {$result['notification_id']}\n\n";

// Test 3: Check logged notifications
echo "Test 3: Notification Logs\n";
echo "--------------------------\n";
$notifications = Notification::where('participant_id', $participant->id)
    ->orderBy('created_at', 'desc')
    ->limit(5)
    ->get();

echo "Total notifications for {$participant->name}: " . $notifications->count() . "\n";
foreach ($notifications as $notif) {
    echo "  - [{$notif->type}] {$notif->event}: {$notif->status} (ID: {$notif->id})\n";
    if ($notif->error_message) {
        echo "    Error: {$notif->error_message}\n";
    }
}

echo "\n";

// Test 4: Notification Service
echo "Test 4: NotificationService (Orchestrator)\n";
echo "-------------------------------------------\n";
$notificationService = new NotificationService($emailService, $smsService);

// Get all participants from the activity's program
$participants = $activity->program->participants()->where('status', 'active')->limit(3)->get();
echo "Sending notifications to {$participants->count()} participants...\n";

$results = $notificationService->notifyActivityCreated($activity, $participants);
echo "Email: {$results['email']['sent']} sent, {$results['email']['failed']} failed\n";
echo "SMS: {$results['sms']['sent']} sent, {$results['sms']['failed']} failed\n";

echo "\n=== Test Complete ===\n";
