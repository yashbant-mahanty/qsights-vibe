<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== EVENT DATA ANALYSIS ===" . PHP_EOL . PHP_EOL;

$events = [
    ['id' => 'a0d962df-c62e-4a4e-8fbf-22925cc4b9b9', 'name' => 'Advance Event'],
    ['id' => 'a0d81515-68bb-4ae3-96c5-83ba9a4ad49c', 'name' => 'Email-Embedded-Event'],
];

foreach ($events as $evt) {
    echo "🔹 {$evt['name']}" . PHP_EOL;
    
    $responses = DB::table('responses')
        ->where('activity_id', $evt['id'])
        ->where('is_preview', false)
        ->get();
    
    echo "  Total Responses: " . $responses->count() . PHP_EOL;
    
    foreach ($responses as $response) {
        echo "  Response ID: " . substr($response->id, 0, 8) . "..." . PHP_EOL;
        
        // Check answers table
        $answerCount = DB::table('answers')->where('response_id', $response->id)->count();
        echo "    Answers table: {$answerCount} records" . PHP_EOL;
        
        // Check JSON column
        $jsonAnswers = json_decode($response->answers, true);
        $jsonCount = is_array($jsonAnswers) ? count($jsonAnswers) : 0;
        echo "    JSON column: {$jsonCount} answers" . PHP_EOL;
        
        if ($jsonCount > 0 && $answerCount == 0) {
            echo "    ⚠️ NEEDS MIGRATION: Has JSON but no answer records!" . PHP_EOL;
        }
    }
    
    echo PHP_EOL;
}
