<?php
/**
 * Script to update dial gauge settings for activity a0e38a13-5419-4a53-8062-864ee4becd11
 * This will:
 * 1. Set blue gradient colors
 * 2. Remove labels (Poor, Average, Excellent)
 * 3. Remove instruction text
 */

require __DIR__.'/vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Bootstrap Laravel
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$activityId = 'a0e38a13-5419-4a53-8062-864ee4becd11';

try {
    echo "Fetching activity...\n";
    
    $activity = DB::table('activities')
        ->where('id', $activityId)
        ->first();
    
    if (!$activity) {
        echo "Activity not found!\n";
        exit(1);
    }
    
    echo "Found activity with ID: {$activity->id}\n";
    
    if (!$activity->questionnaire_id) {
        echo "Activity has no questionnaire!\n";
        exit(1);
    }
    
    echo "Fetching questions for questionnaire {$activity->questionnaire_id}...\n";
    
    // Get all sections for this questionnaire
    $sections = DB::table('sections')
        ->where('questionnaire_id', $activity->questionnaire_id)
        ->get();
    
    $updated = false;
    
    foreach ($sections as $section) {
        // Get all questions for this section
        $questions = DB::table('questions')
            ->where('section_id', $section->id)
            ->where('type', 'dial_gauge')
            ->get();
        
        foreach ($questions as $question) {
            echo "Found dial_gauge question: {$question->title}\n";
            
            $settings = json_decode($question->settings, true) ?: [];
            
            // Update color stops to blue gradient
            $settings['colorStops'] = [
                ['percent' => 0, 'color' => '#1e3a5f'],
                ['percent' => 25, 'color' => '#2563eb'],
                ['percent' => 50, 'color' => '#60a5fa'],
                ['percent' => 75, 'color' => '#93c5fd'],
                ['percent' => 100, 'color' => '#dbeafe'],
            ];
            
            // Remove labels
            $settings['labels'] = [];
            
            // Set empty instruction text
            $settings['instructionText'] = '';
            
            // Update the question
            DB::table('questions')
                ->where('id', $question->id)
                ->update([
                    'settings' => json_encode($settings, JSON_UNESCAPED_UNICODE),
                    'updated_at' => now()
                ]);
            
            echo "Updated settings for question: {$question->title}\n";
            $updated = true;
        }
    }
    
    if ($updated) {
        echo "\n✅ Successfully updated questionnaire!\n";
        echo "Changes:\n";
        echo "- Applied blue gradient colors\n";
        echo "- Removed labels (Poor, Average, Excellent)\n";
        echo "- Removed instruction text\n";
    } else {
        echo "\n⚠️  No dial_gauge questions found in this questionnaire\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
