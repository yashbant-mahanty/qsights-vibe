#!/usr/bin/env php
<?php

require __DIR__ . '/backend/vendor/autoload.php';
$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "\n=== MIGRATING REMAINING JSON ANSWERS ===\n\n";

// Get responses that have JSON data but no answer records in the table
$responses = DB::table('responses')
    ->whereNotNull('answers')
    ->whereRaw("answers::text != 'null'")
    ->whereRaw("answers::text != '{}'")
    ->get();

echo "Found {$responses->count()} responses with JSON data\n\n";

$migratedCount = 0;
$skippedCount = 0;
$errorCount = 0;

foreach ($responses as $response) {
    // Check if already has answer records
    $existingCount = DB::table('answers')->where('response_id', $response->id)->count();
    
    if ($existingCount > 0) {
        $skippedCount++;
        continue;
    }
    
    $answersJson = $response->answers;
    $answersArray = json_decode($answersJson, true);
    
    if (empty($answersArray) || !is_array($answersArray)) {
        $errorCount++;
        continue;
    }
    
    echo "📝 Migrating response {$response->id}: " . count($answersArray) . " answers...";
    
    try {
        DB::beginTransaction();
        
        foreach ($answersArray as $questionId => $value) {
            DB::table('answers')->insert([
                'response_id' => $response->id,
                'question_id' => (int) $questionId, // Use bigint
                'value' => is_array($value) ? null : $value,
                'value_array' => is_array($value) ? json_encode($value) : null,
                'created_at' => $response->created_at ?? now(),
                'updated_at' => $response->updated_at ?? now(),
            ]);
        }
        
        DB::commit();
        echo " ✅\n";
        $migratedCount++;
        
    } catch (\Exception $e) {
        DB::rollBack();
        echo " ❌ ERROR: " . $e->getMessage() . "\n";
        $errorCount++;
    }
}

echo "\n=== MIGRATION COMPLETE ===\n";
echo "✅ Migrated: $migratedCount responses\n";
echo "⏭️  Skipped: $skippedCount responses\n";
echo "❌ Errors: $errorCount responses\n";
echo "\nTotal answers in table: " . DB::table('answers')->count() . "\n\n";
