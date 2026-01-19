#!/usr/bin/env php
<?php

/**
 * CRITICAL: Check Response Data for Event a0d962df
 * Investigating why Event List shows 2 responses but Question-wise Analysis shows 0
 */

require __DIR__ . '/backend/vendor/autoload.php';

$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$activityId = 'a0d962df';  // Advance Event

echo "\n========================================\n";
echo "CRITICAL DATA INVESTIGATION\n";
echo "Event: Advance Event ($activityId)\n";
echo "========================================\n\n";

// 1. Check responses table
echo "1. RESPONSES TABLE:\n";
echo "-------------------\n";
$responses = DB::table('responses')
    ->where('activity_id', 'like', $activityId . '%')
    ->get();

echo "Total responses found: " . $responses->count() . "\n\n";

foreach ($responses as $i => $response) {
    echo "Response " . ($i + 1) . ":\n";
    echo "  ID: " . $response->id . "\n";
    echo "  Activity ID: " . $response->activity_id . "\n";
    echo "  Participant ID: " . ($response->participant_id ?? 'NULL (guest)') . "\n";
    echo "  Status: " . $response->status . "\n";
    echo "  Is Preview: " . ($response->is_preview ? 'YES' : 'NO') . "\n";
    echo "  Created: " . $response->created_at . "\n";
    echo "  Submitted: " . ($response->submitted_at ?? 'NULL') . "\n";
    
    // Check if answers column has data
    $answersJson = $response->answers;
    $answersArray = json_decode($answersJson, true);
    echo "  Answers (JSON column): " . (empty($answersJson) || $answersJson === 'null' ? 'EMPTY/NULL' : 'HAS DATA') . "\n";
    if (!empty($answersJson) && $answersJson !== 'null') {
        echo "    Content: " . substr($answersJson, 0, 200) . "...\n";
    }
    echo "\n";
}

// 2. Check answers table (relationship)
echo "\n2. ANSWERS TABLE (Relationship):\n";
echo "---------------------------------\n";

$responseIds = $responses->pluck('id')->toArray();
if (!empty($responseIds)) {
    $answers = DB::table('answers')
        ->whereIn('response_id', $responseIds)
        ->get();
    
    echo "Total answer records found: " . $answers->count() . "\n\n";
    
    $answersByResponse = $answers->groupBy('response_id');
    foreach ($responses as $i => $response) {
        $responseAnswers = $answersByResponse->get($response->id, collect());
        echo "Response " . ($i + 1) . " ($response->id): " . $responseAnswers->count() . " answer records\n";
        
        if ($responseAnswers->count() > 0) {
            foreach ($responseAnswers as $answer) {
                echo "  - Question: " . $answer->question_id . "\n";
                echo "    Value: " . ($answer->value ?? 'NULL') . "\n";
                echo "    Value Array: " . ($answer->value_array ?? 'NULL') . "\n";
            }
        }
    }
} else {
    echo "No responses to check answers for.\n";
}

// 3. Check response_backups table (if exists)
echo "\n\n3. RESPONSE_BACKUPS TABLE:\n";
echo "---------------------------\n";

$tableExists = DB::select("SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'response_backups'
)");

if ($tableExists[0]->exists) {
    echo "✅ response_backups table EXISTS\n\n";
    
    $backups = DB::table('response_backups')
        ->where('activity_id', 'like', $activityId . '%')
        ->get();
    
    echo "Total backup records found: " . $backups->count() . "\n\n";
    
    foreach ($backups as $i => $backup) {
        echo "Backup " . ($i + 1) . ":\n";
        echo "  ID: " . $backup->id . "\n";
        echo "  Response ID: " . $backup->response_id . "\n";
        echo "  Activity ID: " . $backup->activity_id . "\n";
        echo "  Question ID: " . $backup->question_id . "\n";
        echo "  Value: " . ($backup->value ?? 'NULL') . "\n";
        echo "  Value Array: " . ($backup->value_array ?? 'NULL') . "\n";
        echo "  Created: " . $backup->created_at . "\n";
        echo "\n";
    }
} else {
    echo "❌ response_backups table DOES NOT EXIST\n";
    echo "Note: Backup data would be in 'response_backups' table if Data Safety feature is enabled.\n";
}

// 4. Check participants for this activity
echo "\n\n4. PARTICIPANTS:\n";
echo "----------------\n";

$participants = DB::table('activity_participants')
    ->where('activity_id', 'like', $activityId . '%')
    ->where('is_preview', false)
    ->get();

echo "Total participants: " . $participants->count() . "\n\n";

foreach ($participants as $i => $participant) {
    echo "Participant " . ($i + 1) . ":\n";
    echo "  ID: " . $participant->participant_id . "\n";
    echo "  Status: " . $participant->status . "\n";
    echo "  Is Guest: " . ($participant->is_guest ? 'YES' : 'NO') . "\n";
    echo "  Is Preview: " . ($participant->is_preview ? 'YES' : 'NO') . "\n";
    
    // Find their response
    $theirResponse = $responses->firstWhere('participant_id', $participant->participant_id);
    if ($theirResponse) {
        echo "  Has Response: YES (ID: {$theirResponse->id}, Status: {$theirResponse->status})\n";
    } else {
        echo "  Has Response: NO\n";
    }
    echo "\n";
}

echo "\n========================================\n";
echo "DIAGNOSIS COMPLETE\n";
echo "========================================\n\n";

echo "CRITICAL CHECKS:\n";
echo "- Are responses being loaded? " . ($responses->count() > 0 ? "✅ YES ({$responses->count()} found)" : "❌ NO") . "\n";
echo "- Do responses have answer data? Check 'Answers (JSON column)' and 'ANSWERS TABLE' sections above\n";
echo "- Is backup table available? Check 'RESPONSE_BACKUPS TABLE' section above\n";
echo "\n";
