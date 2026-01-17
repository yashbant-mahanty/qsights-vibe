<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Find an activity with participants
$activity = \App\Models\Activity::with(['participants'])->first();

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
        'name' => 'Test User',
        'email' => 'yashbantm@gmail.com',
        'type' => 'individual',
        'status' => 'active',
    ]);
    
    $activity->participants()->attach($participant->id, ['status' => 'invited']);
    echo "Created test participant\n";
} else {
    echo "Using participant: {$participant->name} ({$participant->email})\n";
}

// Simulate notification sending (like from the app)
$controller = new \App\Http\Controllers\Api\NotificationController();

// Create a mock request
$request = new \Illuminate\Http\Request();
$request->merge([
    'activity_id' => $activity->id,
    'notification_type' => 'invitation',
    'participant_ids' => [$participant->id],
]);

echo "\n🔄 Simulating notification send...\n";

// Get the personalized content (this should generate a token)
$frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');

// Generate token
$accessToken = \App\Models\ActivityAccessToken::generateToken($activity->id, $participant->id);
$tokenUrl = "{$frontendUrl}/activities/take/{$activity->id}?token={$accessToken->token}";

echo "\n✅ Token generated!\n";
echo "Token URL: {$tokenUrl}\n";
echo "Participant: {$participant->name} ({$participant->email})\n";
echo "Expires: " . ($accessToken->expires_at ? $accessToken->expires_at->format('Y-m-d H:i:s') : 'Never') . "\n";
echo "\n📧 This URL will be embedded in notification emails\n";
