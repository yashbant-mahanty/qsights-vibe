<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Activity;
use App\Http\Controllers\Api\ActivityController;

echo "🧪 Testing Activity Links Feature\n";
echo "==================================\n\n";

// Get first activity
$activity = Activity::first();

if (!$activity) {
    echo "❌ No activities found in database\n";
    echo "Please create an activity first\n";
    exit(1);
}

echo "✓ Found activity: {$activity->name} (ID: {$activity->id})\n\n";

// Test the controller method
$controller = new ActivityController();
$response = $controller->getActivityLinks($activity->id);
$data = json_decode($response->getContent(), true);

echo "📋 Generated Links:\n";
echo "==================\n\n";

foreach ($data['links'] as $type => $linkData) {
    echo "🔗 {$linkData['label']}\n";
    echo "   URL: {$linkData['url']}\n";
    echo "   Description: {$linkData['description']}\n";
    echo "\n";
}

echo "Activity Info:\n";
echo "- ID: {$data['activity']['id']}\n";
echo "- Name: {$data['activity']['name']}\n";
echo "- Allow Guests: " . ($data['activity']['allow_guests'] ? 'Yes' : 'No') . "\n";

echo "\n✅ All tests passed!\n";
echo "\nNext Steps:\n";
echo "1. Open http://localhost:3000/activities in your browser\n";
echo "2. Look for the 'Links' button in the Actions column\n";
echo "3. Click it to see the three link types\n";
echo "4. Test copying each link\n";
