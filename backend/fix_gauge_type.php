<?php
/**
 * Fix gaugeType setting - "gradient" is not a valid gaugeType
 * Valid values are: "semi-circle" or "full-circle"
 */

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$activityId = 'a0e38a13-5419-4a53-8062-864ee4becd11';

echo "Fixing gaugeType for activity: $activityId\n\n";

// Get questionnaire_id for activity
$activity = DB::table('activities')->where('id', $activityId)->first();

if (!$activity) {
    echo "Activity not found!\n";
    exit(1);
}

echo "Found activity: {$activity->name}\n";
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
    
    $settings = json_decode($question->settings, true);
    
    echo "Current gaugeType: " . ($settings['gaugeType'] ?? 'NOT SET') . "\n";
    
    // Fix: "gradient" is not a valid gaugeType - change to "semi-circle"
    if (isset($settings['gaugeType']) && $settings['gaugeType'] === 'gradient') {
        $settings['gaugeType'] = 'semi-circle';
        
        // Update in database
        DB::table('questions')
            ->where('id', $question->id)
            ->update(['settings' => json_encode($settings)]);
        
        echo "FIXED: Changed gaugeType from 'gradient' to 'semi-circle'\n";
    } else {
        echo "No fix needed\n";
    }
    
    echo "\n";
}

echo "Done!\n";
