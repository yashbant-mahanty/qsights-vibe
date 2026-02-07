<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Cleaning up responses with invalid/deleted question IDs...\n\n";

$allResponses = App\Models\Response::all();
$deletedCount = 0;
$validCount = 0;
$emptyCount = 0;

foreach($allResponses as $response) {
    $answersJson = $response->getAttributes()['answers'];
    $answers = json_decode($answersJson, true);
    
    if ($answers === null || empty($answers)) {
        echo "Deleting empty response: {$response->id}\n";
        $response->delete();
        $emptyCount++;
        $deletedCount++;
        continue;
    }
    
    if (is_array($answers)) {
        $hasInvalidQuestions = false;
        $invalidQuestions = [];
        
        foreach(array_keys($answers) as $questionId) {
            $question = App\Models\Question::find($questionId);
            if (!$question) {
                $hasInvalidQuestions = true;
                $invalidQuestions[] = $questionId;
            }
        }
        
        if ($hasInvalidQuestions) {
            echo "Deleting response {$response->id} with invalid questions:\n";
            foreach($invalidQuestions as $qid) {
                echo "  - {$qid}\n";
            }
            $response->delete();
            $deletedCount++;
        } else {
            $validCount++;
        }
    }
}

echo "\n=== Summary ===\n";
echo "Empty responses deleted: {$emptyCount}\n";
echo "Invalid responses deleted: " . ($deletedCount - $emptyCount) . "\n";
echo "Total deleted: {$deletedCount}\n";
echo "Valid responses: {$validCount}\n";
echo "\nCleanup complete!\n";
