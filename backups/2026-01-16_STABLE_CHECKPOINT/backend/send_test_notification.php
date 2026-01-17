<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Find the QSights-Survey-2025 activity
$activity = \App\Models\Activity::where('name', 'LIKE', '%Survey%')->first();

if (!$activity) {
    echo "Survey activity not found, using first activity\n";
    $activity = \App\Models\Activity::first();
}

if (!$activity) {
    echo "No activities found.\n";
    exit(1);
}

echo "Activity: {$activity->name} (ID: {$activity->id})\n";

// Get or create a participant
$participant = $activity->participants()->first();

if (!$participant) {
    $participant = \App\Models\Participant::create([
        'id' => \Illuminate\Support\Str::uuid(),
        'name' => 'Yashbant M',
        'email' => 'yashbantm@gmail.com',
        'type' => 'individual',
        'status' => 'active',
    ]);
    
    $activity->participants()->attach($participant->id, ['status' => 'invited']);
    echo "Created test participant\n";
} else {
    // Update participant email if needed
    $participant->email = 'yashbantm@gmail.com';
    $participant->name = 'Yashbant M';
    $participant->save();
    echo "Using participant: {$participant->name} ({$participant->email})\n";
}

// Send the notification via EmailService
$emailService = new \App\Services\EmailService();
$result = $emailService->sendActivityInvitation($participant, $activity);

if ($result['success']) {
    echo "\n✅ Email sent successfully!\n";
    echo "Status Code: {$result['status_code']}\n";
    echo "Notification ID: {$result['notification_id']}\n";
    
    // Get the token
    $token = \App\Models\ActivityAccessToken::where('activity_id', $activity->id)
        ->where('participant_id', $participant->id)
        ->latest()
        ->first();
    
    if ($token) {
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
        $tokenUrl = "{$frontendUrl}/activities/take/{$activity->id}?token={$token->token}";
        echo "\n🔗 Token URL in email:\n{$tokenUrl}\n";
        echo "\nExpires: " . ($token->expires_at ? $token->expires_at->format('Y-m-d H:i:s') : 'Never') . "\n";
        echo "\n📧 Check your email at: yashbantm@gmail.com\n";
    }
} else {
    echo "\n❌ Failed to send email\n";
    echo "Error: " . ($result['error'] ?? 'Unknown error') . "\n";
}
