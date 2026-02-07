<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== TESTING DASHBOARD ENDPOINTS ===" . PHP_EOL . PHP_EOL;

// Test global statistics
echo "1. Global Platform Statistics:" . PHP_EOL;
$controller = new App\Http\Controllers\Api\DashboardController();
$globalStats = $controller->globalStatistics();
$globalData = json_decode($globalStats->getContent(), true);

echo "   Organizations: " . $globalData['organizations'] . PHP_EOL;
echo "   Group Heads: " . $globalData['group_heads'] . PHP_EOL;
echo "   Programs: " . $globalData['programs'] . PHP_EOL;
echo "   Activities: " . $globalData['activities'] . PHP_EOL;
echo "   Participants: " . $globalData['participants'] . PHP_EOL;
echo "   Responses: " . $globalData['responses'] . PHP_EOL;
echo "   Platform Engagement: " . $globalData['platform_engagement'] . "%" . PHP_EOL;
echo PHP_EOL;

// Test organization performance
echo "2. Organization Performance:" . PHP_EOL;
$orgPerformance = $controller->organizationPerformance();
$orgData = json_decode($orgPerformance->getContent(), true);

foreach ($orgData['data'] as $org) {
    echo "   " . $org['name'] . ":" . PHP_EOL;
    echo "     - Group Heads: " . $org['group_heads_count'] . PHP_EOL;
    echo "     - Programs: " . $org['programs_count'] . PHP_EOL;
    echo "     - Participants: " . $org['participants_count'] . PHP_EOL;
    echo "     - Responses: " . $org['responses_count'] . PHP_EOL;
    echo "     - Effectiveness: " . $org['effectiveness'] . "%" . PHP_EOL;
    echo PHP_EOL;
}

echo "=== TEST COMPLETE ===" . PHP_EOL;
