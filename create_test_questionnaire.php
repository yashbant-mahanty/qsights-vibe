<?php
require "vendor/autoload.php";
$app = require_once "bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Creating test questionnaire with all advanced question types...\n\n";

DB::beginTransaction();
try {
    // 1. Create the questionnaire
    $questionnaireId = DB::table('questionnaires')->insertGetId([
        'title' => 'Advanced Question Types Test - ' . date('Y-m-d H:i'),
        'description' => 'Test questionnaire demonstrating all advanced question types: Slider Scale, Dial Gauge, Likert Visual, NPS Scale, and Star Rating.',
        'type' => 'survey',
        'status' => 'draft',
        'display_mode' => 'one_at_a_time',
        'settings' => json_encode([
            'showProgressBar' => true,
            'showQuestionNumbers' => true,
            'allowBackNavigation' => true
        ]),
        'created_at' => now(),
        'updated_at' => now()
    ]);
    
    echo "Created questionnaire ID: {$questionnaireId}\n";
    
    // 2. Create a section
    $sectionId = DB::table('sections')->insertGetId([
        'questionnaire_id' => $questionnaireId,
        'title' => 'Advanced Questions Section',
        'description' => 'This section contains all advanced question types',
        'order' => 1,
        'created_at' => now(),
        'updated_at' => now()
    ]);
    
    echo "Created section ID: {$sectionId}\n";
    
    // 3. Create questions
    $questions = [
        [
            'type' => 'slider_scale',
            'title' => 'How satisfied are you with our service?',
            'description' => 'Drag the slider to indicate your satisfaction level',
            'order' => 1,
            'is_required' => true,
            'settings' => json_encode([
                'min' => 0,
                'max' => 100,
                'step' => 1,
                'minLabel' => 'Not Satisfied',
                'maxLabel' => 'Very Satisfied',
                'showValue' => true,
                'defaultValue' => 50,
                'useCustomImages' => false,
                'customImages' => []
            ])
        ],
        [
            'type' => 'dial_gauge',
            'title' => 'Rate your overall experience',
            'description' => 'Use the dial to rate your experience',
            'order' => 2,
            'is_required' => true,
            'settings' => json_encode([
                'min' => 0,
                'max' => 10,
                'segments' => [
                    ['label' => 'Poor', 'color' => '#ef4444', 'min' => 0, 'max' => 3],
                    ['label' => 'Average', 'color' => '#f59e0b', 'min' => 4, 'max' => 6],
                    ['label' => 'Good', 'color' => '#22c55e', 'min' => 7, 'max' => 10]
                ],
                'useCustomImages' => false,
                'customImages' => []
            ])
        ],
        [
            'type' => 'likert_visual',
            'title' => 'How do you feel about the product quality?',
            'description' => 'Select the visual that best represents your feeling',
            'order' => 3,
            'is_required' => true,
            'settings' => json_encode([
                'scale' => 5,
                'labels' => ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
                'visualType' => 'emoji',
                'useCustomImages' => false,
                'customImages' => []
            ])
        ],
        [
            'type' => 'nps_scale',
            'title' => 'How likely are you to recommend us to a friend?',
            'description' => 'Select a number from 0-10',
            'order' => 4,
            'is_required' => true,
            'settings' => json_encode([
                'leftLabel' => 'Not at all likely',
                'rightLabel' => 'Extremely likely',
                'showCategories' => true
            ])
        ],
        [
            'type' => 'star_rating',
            'title' => 'Rate our customer support',
            'description' => 'Click on the stars to rate',
            'order' => 5,
            'is_required' => true,
            'settings' => json_encode([
                'maxStars' => 5,
                'allowHalf' => true,
                'useCustomImages' => false,
                'customImages' => []
            ])
        ],
        [
            'type' => 'text',
            'title' => 'Any additional comments?',
            'description' => 'Share your thoughts with us',
            'order' => 6,
            'is_required' => false,
            'settings' => json_encode([
                'multiline' => true,
                'maxLength' => 500
            ])
        ]
    ];
    
    foreach ($questions as $q) {
        DB::table('questions')->insert([
            'questionnaire_id' => $questionnaireId,
            'section_id' => $sectionId,
            'type' => $q['type'],
            'title' => $q['title'],
            'description' => $q['description'],
            'order' => $q['order'],
            'is_required' => $q['is_required'],
            'settings' => $q['settings'],
            'nesting_level' => 0,
            'created_at' => now(),
            'updated_at' => now()
        ]);
        echo "  Created question: {$q['type']} - {$q['title']}\n";
    }
    
    DB::commit();
    
    echo "\n=== SUCCESS ===\n";
    echo "Questionnaire created with ID: {$questionnaireId}\n";
    echo "Section created with ID: {$sectionId}\n";
    echo "Total questions: " . count($questions) . "\n";
    echo "\nQuestion types included:\n";
    echo "  1. Slider Scale\n";
    echo "  2. Dial Gauge\n";
    echo "  3. Likert Visual\n";
    echo "  4. NPS Scale\n";
    echo "  5. Star Rating\n";
    echo "  6. Text (for comments)\n";
    echo "\nYou can view/edit the questionnaire at:\n";
    echo "  https://your-domain/questionnaires/{$questionnaireId}/edit\n";
    
} catch (Exception $e) {
    DB::rollBack();
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
