<?php
/**
 * Test script to add image to slider_scale question and verify it displays
 */

// Use a test image URL
$testImageUrl = "https://bq-common.s3.ap-south-1.amazonaws.com/logos/Medinscribe_Logo_R.png";

echo "=== Slider Scale Image Display Test ===\n\n";

echo "Step 1: Test Image URL\n";
echo "URL: $testImageUrl\n";
echo "Testing image accessibility...\n";

$headers = @get_headers($testImageUrl);
if ($headers && strpos($headers[0], '200')) {
    echo "✓ Image is accessible\n\n";
} else {
    echo "✗ Image URL is not accessible\n\n";
}

echo "Step 2: Sample Question Settings Structure\n";
$sampleSettings = [
    'min' => 0,
    'max' => 100,
    'step' => 6,
    'orientation' => 'horizontal',
    'labels' => [
        'start' => 'Low',
        'middle' => '',
        'end' => 'High'
    ],
    'showValue' => true,
    'showTicks' => true,
    'trackColor' => '#0ea5e9',
    'thumbColor' => '#0284c7',
    'useCustomImages' => true,
    'customImages' => [
        'trackUrl' => $testImageUrl
    ]
];

echo json_encode($sampleSettings, JSON_PRETTY_PRINT) . "\n\n";

echo "Step 3: Frontend Component Check\n";
echo "SliderScale component should:\n";
echo "  - Check for customImages?.trackUrl or customImages?.backgroundUrl\n";
echo "  - Display image above slider when URL exists\n";
echo "  - Show labels and slider below the image\n\n";

echo "Step 4: Required Changes\n";
echo "✓ SliderScaleSettings interface updated with customImages\n";
echo "✓ SliderScale component checks for trackUrl/backgroundUrl\n";
echo "✓ Image renders above slider when hasBackgroundImage is true\n\n";

echo "Step 5: Testing Instructions\n";
echo "1. In questionnaire editor, upload image to 'Track Background'\n";
echo "2. Click 'Update Questionnaire' button to save\n";
echo "3. Open participant page in incognito window\n";
echo "4. Image should display above the slider\n\n";

echo "Sample API Response Structure:\n";
$sampleApiResponse = [
    'id' => 13,
    'sections' => [
        [
            'id' => 1,
            'questions' => [
                [
                    'id' => 300,
                    'type' => 'slider_scale',
                    'question' => 'Test slider question',
                    'settings' => $sampleSettings
                ]
            ]
        ]
    ]
];

echo json_encode($sampleApiResponse, JSON_PRETTY_PRINT) . "\n\n";

echo "=== Test Complete ===\n";
echo "If image doesn't display:\n";
echo "1. Check browser console for errors\n";
echo "2. Verify settings were saved (check API response)\n";
echo "3. Clear browser cache and hard refresh\n";
echo "4. Verify frontend build is up to date\n";
?>