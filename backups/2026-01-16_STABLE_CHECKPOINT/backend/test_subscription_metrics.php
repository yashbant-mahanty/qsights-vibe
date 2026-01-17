<?php

/**
 * Test script for subscription metrics endpoint
 * Run with: php test_subscription_metrics.php
 */

require __DIR__ . '/vendor/autoload.php';

use App\Models\Activity;

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== Testing Subscription Metrics ===\n\n";

// Get activities with subscription data
$activities = Activity::where('status', '!=', 'draft')
    ->whereNull('deleted_at')
    ->whereNotNull('subscription_price')
    ->get();

echo "Activities with subscription data: " . $activities->count() . "\n\n";

if ($activities->count() > 0) {
    // Show sample data
    echo "Sample activities:\n";
    foreach ($activities->take(5) as $activity) {
        echo "- {$activity->name}\n";
        echo "  Subscription Price: ₹" . number_format($activity->subscription_price, 2) . "\n";
        echo "  Frequency: {$activity->subscription_frequency}\n";
        echo "  Tax: {$activity->tax_percentage}%\n";
        echo "  Participants: {$activity->number_of_participants}\n\n";
    }
    
    // Calculate totals
    $totalRevenue = $activities->sum('subscription_price');
    $avgPrice = $activities->avg('subscription_price');
    $totalParticipants = $activities->sum('number_of_participants');
    $avgTax = $activities->whereNotNull('tax_percentage')->avg('tax_percentage');
    
    echo "\n=== Calculated Metrics ===\n";
    echo "Total Revenue: ₹" . number_format($totalRevenue, 2) . "\n";
    echo "Average Price: ₹" . number_format($avgPrice, 2) . "\n";
    echo "Total Participants: " . number_format($totalParticipants) . "\n";
    echo "Average Tax: " . number_format($avgTax, 2) . "%\n\n";
    
    // Frequency breakdown
    $frequencies = $activities->whereNotNull('subscription_frequency')
        ->groupBy('subscription_frequency')
        ->map(function ($group) {
            return [
                'count' => $group->count(),
                'total_revenue' => $group->sum('subscription_price'),
                'avg_price' => $group->avg('subscription_price'),
                'total_participants' => $group->sum('number_of_participants'),
            ];
        });
    
    if ($frequencies->count() > 0) {
        echo "=== Frequency Breakdown ===\n";
        foreach ($frequencies as $frequency => $data) {
            echo "\n{$frequency}:\n";
            echo "  Count: {$data['count']}\n";
            echo "  Total Revenue: ₹" . number_format($data['total_revenue'], 2) . "\n";
            echo "  Avg Price: ₹" . number_format($data['avg_price'], 2) . "\n";
            echo "  Total Participants: " . number_format($data['total_participants']) . "\n";
        }
    }
} else {
    echo "No activities with subscription data found.\n";
    echo "To test this feature, create activities with subscription details.\n";
}

echo "\n=== Test Complete ===\n";
