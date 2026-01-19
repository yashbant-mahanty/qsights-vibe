<?php

/**
 * Migrate JSON answers to answers table for specific events
 * Usage: php migrate_event_answers.php
 */

// Must be run from backend directory
$backendDir = '/var/www/QSightsOrg2.0/backend';
chdir($backendDir);

require $backendDir.'/vendor/autoload.php';
$app = require_once $backendDir.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== MIGRATING JSON ANSWERS FOR EVENTS ===" . PHP_EOL . PHP_EOL;

$eventIds = [
    'a0d962df-c62e-4a4e-8fbf-22925cc4b9b9', // Advance Event
    'a0d81515-68bb-4ae3-96c5-83ba9a4ad49c', // Email-Embedded-Event
];

$totalMigrated = 0;
$totalErrors = 0;

foreach ($eventIds as $eventId) {
    $activity = DB::table('activities')->where('id', $eventId)->first();
    echo "📋 Processing: " . ($activity->name ?? 'Unknown') . PHP_EOL;
    
    $responses = DB::table('responses')
        ->where('activity_id', $eventId)
        ->where('is_preview', false)
        ->get();
    
    echo "   Found {$responses->count()} responses" . PHP_EOL;
    
    foreach ($responses as $response) {
        try {
            // Check if already has answer records
            $existingAnswers = DB::table('answers')->where('response_id', $response->id)->count();
            
            if ($existingAnswers > 0) {
                echo "   ✓ Response " . substr($response->id, 0, 8) . " already has {$existingAnswers} answers" . PHP_EOL;
                continue;
            }
            
            // Get JSON answers
            $jsonAnswers = json_decode($response->answers, true);
            
            if (empty($jsonAnswers) || !is_array($jsonAnswers)) {
                echo "   ⚠ Response " . substr($response->id, 0, 8) . " has no JSON answers" . PHP_EOL;
                continue;
            }
            
            echo "   🔄 Migrating " . count($jsonAnswers) . " answers for response " . substr($response->id, 0, 8) . PHP_EOL;
            
            // Get max answer ID to continue sequence
            $maxId = DB::table('answers')->max('id') ?? 0;
            $currentId = $maxId;
            
            $insertedCount = 0;
            foreach ($jsonAnswers as $questionId => $value) {
                $currentId++;
                
                DB::table('answers')->insert([
                    'id' => $currentId,
                    'response_id' => $response->id,
                    'question_id' => $questionId,
                    'value' => is_array($value) ? null : $value,
                    'value_array' => is_array($value) ? json_encode($value) : null,
                    'created_at' => $response->created_at ?? now(),
                    'updated_at' => now(),
                    'deleted_at' => null,
                ]);
                
                $insertedCount++;
            }
            
            echo "   ✅ Inserted {$insertedCount} answer records" . PHP_EOL;
            $totalMigrated += $insertedCount;
            
        } catch (\Exception $e) {
            echo "   ❌ Error for response " . substr($response->id, 0, 8) . ": " . $e->getMessage() . PHP_EOL;
            $totalErrors++;
        }
    }
    
    echo PHP_EOL;
}

echo "=== MIGRATION COMPLETE ===" . PHP_EOL;
echo "Total answers migrated: {$totalMigrated}" . PHP_EOL;
echo "Total errors: {$totalErrors}" . PHP_EOL;
