<?php
/**
 * Compare dial gauge settings between two activities
 */

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$brokenActivityId = 'a0e38a13-5419-4a53-8062-864ee4becd11';
$workingActivityId = 'a0d962df-a30c-406c-920d-6758e71b3315';

echo "=== COMPARING DIAL GAUGE SETTINGS ===\n\n";

foreach ([$brokenActivityId => 'BROKEN', $workingActivityId => 'WORKING'] as $activityId => $label) {
    echo "=== $label ACTIVITY: $activityId ===\n";
    
    $activity = DB::table('activities')->where('id', $activityId)->first();
    
    if (!$activity) {
        echo "Activity not found!\n\n";
        continue;
    }
    
    echo "Activity Name: {$activity->name}\n";
    echo "Questionnaire ID: {$activity->questionnaire_id}\n\n";
    
    // Find dial_gauge questions
    $questions = DB::table('questions')
        ->join('sections', 'questions.section_id', '=', 'sections.id')
        ->where('sections.questionnaire_id', $activity->questionnaire_id)
        ->where('questions.type', 'dial_gauge')
        ->select('questions.*')
        ->get();
    
    echo "Found " . count($questions) . " dial_gauge questions\n\n";
    
    foreach ($questions as $question) {
        echo "Question ID: {$question->id}\n";
        echo "Question Text: {$question->text}\n\n";
        
        $settings = json_decode($question->settings, true);
        
        echo "FULL SETTINGS:\n";
        echo json_encode($settings, JSON_PRETTY_PRINT) . "\n\n";
        
        echo "---\n\n";
    }
}
