<?php
/**
 * CRITICAL TESTING SCRIPT
 * End-to-End Validation: Response Saving + Notification Tracking
 */

require __DIR__ . '/backend/vendor/autoload.php';

$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "\n========================================\n";
echo "SYSTEM VALIDATION - DATABASE INSPECTION\n";
echo "========================================\n\n";

// TEST CASE 1: Check Events with Questionnaires
echo "--- ACTIVE EVENTS WITH QUESTIONNAIRES ---\n";
$events = DB::table('events')
    ->select('id', 'name', 'start_date', 'status', 'questionnaire_id')
    ->whereNotNull('questionnaire_id')
    ->where('status', 'active')
    ->orderBy('created_at', 'DESC')
    ->limit(5)
    ->get();

if ($events->isEmpty()) {
    echo "⚠️  NO ACTIVE EVENTS FOUND\n";
} else {
    foreach ($events as $event) {
        echo "Event ID: {$event->id}\n";
        echo "Name: {$event->name}\n";
        echo "Questionnaire ID: {$event->questionnaire_id}\n";
        echo "Status: {$event->status}\n";
        echo "---\n";
    }
}

// Check Answers Table Schema
echo "\n--- ANSWERS TABLE SCHEMA ---\n";
$answersColumns = DB::select("DESCRIBE answers");
foreach ($answersColumns as $col) {
    echo "{$col->Field} ({$col->Type}) - Null: {$col->Null}\n";
}

// Check sample answers
echo "\n--- SAMPLE ANSWERS (LATEST 5) ---\n";
$sampleAnswers = DB::table('answers')
    ->orderBy('created_at', 'DESC')
    ->limit(5)
    ->get();

if ($sampleAnswers->isEmpty()) {
    echo "⚠️  NO ANSWERS FOUND IN DATABASE\n";
} else {
    foreach ($sampleAnswers as $answer) {
        echo "Answer ID: {$answer->id}\n";
        echo "User ID: " . ($answer->user_id ?? 'NULL') . "\n";
        echo "Anonymous Token: " . ($answer->anonymous_token ?? 'NULL') . "\n";
        echo "Event ID: {$answer->event_id}\n";
        echo "Question ID: {$answer->question_id}\n";
        echo "Option ID: " . ($answer->option_id ?? 'NULL') . "\n";
        echo "Answer Value: " . ($answer->answer_value ?? 'NULL') . "\n";
        echo "Created: {$answer->created_at}\n";
        echo "---\n";
    }
}

// TEST CASE 2: Notification Tracking
echo "\n--- NOTIFICATION TRACKING TABLE SCHEMA ---\n";
$notifColumns = DB::select("DESCRIBE notification_tracking");
foreach ($notifColumns as $col) {
    echo "{$col->Field} ({$col->Type}) - Null: {$col->Null}\n";
}

// Check sample notifications
echo "\n--- SAMPLE NOTIFICATIONS (LATEST 5) ---\n";
$sampleNotifs = DB::table('notification_tracking')
    ->orderBy('created_at', 'DESC')
    ->limit(5)
    ->get();

if ($sampleNotifs->isEmpty()) {
    echo "⚠️  NO NOTIFICATIONS FOUND IN DATABASE\n";
} else {
    foreach ($sampleNotifs as $notif) {
        echo "Notification ID: {$notif->id}\n";
        echo "User ID: " . ($notif->user_id ?? 'NULL') . "\n";
        echo "Event ID: " . ($notif->event_id ?? 'NULL') . "\n";
        echo "Channel: {$notif->channel}\n";
        echo "Provider: {$notif->provider}\n";
        echo "Status: {$notif->status}\n";
        echo "Provider Message ID: " . ($notif->provider_message_id ?? 'NULL') . "\n";
        echo "Sent At: " . ($notif->sent_at ?? 'NULL') . "\n";
        echo "Delivered At: " . ($notif->delivered_at ?? 'NULL') . "\n";
        echo "Opened At: " . ($notif->opened_at ?? 'NULL') . "\n";
        echo "---\n";
    }
}

// Check Users
echo "\n--- SAMPLE USERS (FOR TESTING) ---\n";
$users = DB::table('users')
    ->select('id', 'name', 'email', 'role')
    ->limit(3)
    ->get();

foreach ($users as $user) {
    echo "User ID: {$user->id} - {$user->name} ({$user->email}) - Role: {$user->role}\n";
}

echo "\n========================================\n";
echo "VALIDATION COMPLETE\n";
echo "========================================\n\n";
