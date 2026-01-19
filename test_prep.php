<?php
require __DIR__ . '/backend/vendor/autoload.php';
$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "\n========================================\n";
echo "TEST CASE PREPARATION\n";
echo "========================================\n\n";

// RESPONSES TABLE (links to answers)
echo "--- RESPONSES TABLE STRUCTURE ---\n";
$columns = DB::select("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'responses' ORDER BY ordinal_position");
foreach ($columns as $col) {
    echo "{$col->column_name} ({$col->data_type}) - Null: {$col->is_nullable}\n";
}

echo "\n--- SAMPLE RESPONSES (Latest 5) ---\n";
$responses = DB::table('responses')
    ->orderBy('created_at', 'DESC')
    ->limit(5)
    ->get();
foreach ($responses as $response) {
    print_r($response);
}

// Get complete picture: Response + Answers
echo "\n--- COMPLETE RESPONSE EXAMPLE ---\n";
$sampleResponse = DB::table('responses')
    ->orderBy('created_at', 'DESC')
    ->first();

if ($sampleResponse) {
    echo "Response ID: {$sampleResponse->id}\n";
    echo "User ID: " . ($sampleResponse->user_id ?? 'NULL') . "\n";
    echo "Participant ID: " . ($sampleResponse->participant_id ?? 'NULL') . "\n";
    echo "Anonymous Token: " . ($sampleResponse->anonymous_token ?? 'NULL') . "\n";
    echo "Activity ID: {$sampleResponse->activity_id}\n";
    echo "Questionnaire ID: {$sampleResponse->questionnaire_id}\n";
    echo "Created: {$sampleResponse->created_at}\n";
    
    // Get answers for this response
    echo "\nAnswers for this response:\n";
    $answers = DB::table('answers')
        ->where('response_id', $sampleResponse->id)
        ->get();
    
    foreach ($answers as $answer) {
        echo "  - Question ID: {$answer->question_id}\n";
        echo "    Value: " . ($answer->value ?? 'NULL') . "\n";
        echo "    Value Array: " . ($answer->value_array ?? 'NULL') . "\n\n";
    }
}

// Get a testable activity
echo "\n--- RECOMMENDED TEST ACTIVITY ---\n";
$testActivity = DB::table('activities')
    ->where('status', 'live')
    ->whereNotNull('questionnaire_id')
    ->orderBy('created_at', 'DESC')
    ->first();

if ($testActivity) {
    echo "Activity ID: {$testActivity->id}\n";
    echo "Name: {$testActivity->name}\n";
    echo "Type: {$testActivity->type}\n";
    echo "Status: {$testActivity->status}\n";
    echo "Questionnaire ID: {$testActivity->questionnaire_id}\n";
    echo "Allow Guests: " . ($testActivity->allow_guests ? 'YES' : 'NO') . "\n";
    
    // Count existing responses
    $responseCount = DB::table('responses')
        ->where('activity_id', $testActivity->id)
        ->count();
    echo "Existing Responses: {$responseCount}\n";
    
    // Check questions
    $questionCount = DB::table('questions')
        ->where('questionnaire_id', $testActivity->questionnaire_id)
        ->count();
    echo "Questions in Questionnaire: {$questionCount}\n";
}

// Check participants
echo "\n--- PARTICIPANTS FOR TESTING ---\n";
$participants = DB::table('participants')
    ->select('id', 'user_id', 'first_name', 'last_name', 'email')
    ->limit(3)
    ->get();

foreach ($participants as $participant) {
    echo "Participant ID: {$participant->id} - {$participant->first_name} {$participant->last_name} ({$participant->email})\n";
}
