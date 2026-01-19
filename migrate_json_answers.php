#!/usr/bin/env php
<?php

/**
 * CRITICAL FIX: Migrate JSON answers data to answers table
 * This ensures Question-wise Analysis displays correctly
 */

require __DIR__ . '/backend/vendor/autoload.php';

$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

echo "\n========================================\n";
echo "MIGRATING ANSWERS FROM JSON TO TABLE\n";
echo "========================================\n\n";

// Get all responses that have JSON answers but no answer records
// Use raw SQL for PostgreSQL JSON column comparison
$responses = DB::table('responses')
    ->whereNotNull('answers')
    ->whereRaw("answers::text != 'null'")
    ->whereRaw("answers::text != '{}'")
    ->get();

echo "Found {$responses->count()} responses with JSON answers data\n\n";

$migratedCount = 0;
$skippedCount = 0;
$errorCount = 0;

foreach ($responses as $response) {
    // Check if this response already has answer records
    $existingAnswers = DB::table('answers')
        ->where('response_id', $response->id)
        ->count();
    
    if ($existingAnswers > 0) {
        echo "⏭️  Response {$response->id}: Already has {$existingAnswers} answer records, skipping\n";
        $skippedCount++;
        continue;
    }
    
    // Parse JSON answers
    $answersJson = $response->answers;
    $answersArray = json_decode($answersJson, true);
    
    if (empty($answersArray) || !is_array($answersArray)) {
        echo "⚠️  Response {$response->id}: Invalid JSON format, skipping\n";
        $errorCount++;
        continue;
    }
    
    echo "📝 Response {$response->id}: Migrating " . count($answersArray) . " answers...\n";
    
    try {
        DB::beginTransaction();
        
        foreach ($answersArray as $questionId => $value) {
            // Cast UUIDs properly for PostgreSQL
            DB::statement("
                INSERT INTO answers (id, response_id, question_id, value, value_array, created_at, updated_at)
                VALUES (
                    ?::uuid,
                    ?::uuid,
                    ?::uuid,
                    ?,
                    ?::json,
                    ?,
                    ?
                )
            ", [
                (string) Str::uuid(),
                $response->id,
                (string) $questionId,
                is_array($value) ? null : $value,
                is_array($value) ? json_encode($value) : null,
                $response->created_at ?? now(),
                $response->updated_at ?? now(),
            ]);
        }
        
        DB::commit();
        echo "   ✅ Migrated " . count($answersArray) . " answers\n";
        $migratedCount++;
        
    } catch (\Exception $e) {
        DB::rollBack();
        echo "   ❌ ERROR: " . $e->getMessage() . "\n";
        $errorCount++;
    }
}

echo "\n========================================\n";
echo "MIGRATION COMPLETE\n";
echo "========================================\n\n";
echo "✅ Successfully migrated: $migratedCount responses\n";
echo "⏭️  Skipped (already migrated): $skippedCount responses\n";
echo "❌ Errors: $errorCount responses\n";
echo "\nTotal answer records created: " . DB::table('answers')->count() . "\n\n";
