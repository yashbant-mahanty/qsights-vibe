<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Find any activity
$activity = \App\Models\Activity::with(['program.organization', 'participants'])
    ->first();

if (!$activity) {
    echo "No activities found.\n";
    exit(1);
}

echo "Found activity: {$activity->name} (ID: {$activity->id})\n";
echo "Status: {$activity->status}\n";

// Get a participant or create a test one
$participant = $activity->participants()->first();

if (!$participant) {
    // Create a test participant
    $participant = \App\Models\Participant::create([
        'id' => \Illuminate\Support\Str::uuid(),
        'name' => 'Test Token User',
        'email' => 'yashbantm@gmail.com',
        'type' => 'individual',
        'status' => 'invited',
    ]);
    
    // Attach to activity
    $activity->participants()->attach($participant->id, [
        'status' => 'invited',
    ]);
    
    echo "Created test participant: {$participant->name} ({$participant->email})\n";
} else {
    echo "Using existing participant: {$participant->name} ({$participant->email})\n";
}

// Send invitation email (this will generate a token)
$emailService = new \App\Services\EmailService();
$result = $emailService->sendActivityInvitation($participant, $activity);

if ($result['success']) {
    echo "\n✅ Email sent successfully!\n";
    echo "Status Code: {$result['status_code']}\n";
    echo "Notification ID: {$result['notification_id']}\n";
    
    // Show the generated token
    $token = \App\Models\ActivityAccessToken::where('activity_id', $activity->id)
        ->where('participant_id', $participant->id)
        ->latest()
        ->first();
    
    if ($token) {
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
        $tokenUrl = "{$frontendUrl}/activities/take/{$activity->id}?token={$token->token}";
        echo "\n🔗 Token URL:\n{$tokenUrl}\n";
        echo "\nToken expires: " . ($token->expires_at ? $token->expires_at->format('Y-m-d H:i:s') : 'Never') . "\n";
        echo "\n📧 Check your email at: yashbantm@gmail.com\n";
    }
} else {
    echo "\n❌ Failed to send email\n";
    echo "Error: " . ($result['error'] ?? 'Unknown error') . "\n";
}
