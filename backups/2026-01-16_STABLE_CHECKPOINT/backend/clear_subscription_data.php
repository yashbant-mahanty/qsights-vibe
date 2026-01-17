<?php

/**
 * Clear Subscription Data Script
 * 
 * This script clears all subscription-related data from activities
 * Run with: php clear_subscription_data.php
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Activity;
use Illuminate\Support\Facades\DB;

echo "\n================================\n";
echo "CLEAR SUBSCRIPTION DATA\n";
echo "================================\n\n";

// Get current activities with subscription data
$activitiesWithSubscription = Activity::whereNotNull('subscription_price')
    ->whereNull('deleted_at')
    ->get();

if ($activitiesWithSubscription->isEmpty()) {
    echo "✓ No activities found with subscription data.\n";
    echo "  Database is already clean.\n\n";
    exit(0);
}

echo "Found " . $activitiesWithSubscription->count() . " activities with subscription data:\n";
echo "-----------------------------------\n";

foreach ($activitiesWithSubscription as $activity) {
    echo "- " . $activity->name . "\n";
    echo "  Config: ₹" . number_format($activity->configuration_price ?? 0, 2) . "\n";
    echo "  Subscription: ₹" . number_format($activity->subscription_price ?? 0, 2) . "\n";
    echo "  Tax: " . ($activity->tax_percentage ?? 0) . "%\n";
    echo "  Participants: " . ($activity->number_of_participants ?? 0) . "\n\n";
}

// Calculate current totals
$totalConfig = $activitiesWithSubscription->sum('configuration_price');
$totalSubscription = $activitiesWithSubscription->sum('subscription_price');
$totalTax = $activitiesWithSubscription->sum(function($a) {
    return (($a->subscription_price ?? 0) * ($a->tax_percentage ?? 0)) / 100;
});
$grandTotal = $totalConfig + $totalSubscription + $totalTax;

echo "Current Total Revenue: ₹" . number_format($grandTotal, 2) . "\n";
echo "================================\n\n";

// Ask for confirmation
echo "This will clear the following fields from all activities:\n";
echo "- subscription_price\n";
echo "- configuration_price\n";
echo "- tax_percentage\n";
echo "- subscription_frequency\n";
echo "- number_of_participants\n";
echo "- configuration_date\n\n";

echo "Are you sure you want to proceed? (yes/no): ";
$handle = fopen("php://stdin", "r");
$line = fgets($handle);
$confirmation = trim(strtolower($line));
fclose($handle);

if ($confirmation !== 'yes') {
    echo "\n✗ Operation cancelled.\n\n";
    exit(0);
}

echo "\nClearing subscription data...\n";

try {
    DB::beginTransaction();
    
    $updated = Activity::whereNotNull('subscription_price')
        ->update([
            'subscription_price' => null,
            'configuration_price' => null,
            'tax_percentage' => null,
            'subscription_frequency' => null,
            'number_of_participants' => null,
            'configuration_date' => null,
        ]);
    
    DB::commit();
    
    echo "✓ Successfully cleared subscription data from {$updated} activities.\n";
    echo "  Dashboard will now show ₹0.00 for all subscription metrics.\n\n";
    
} catch (\Exception $e) {
    DB::rollBack();
    echo "✗ Error: " . $e->getMessage() . "\n\n";
    exit(1);
}

echo "================================\n";
echo "CLEANUP COMPLETE\n";
echo "================================\n\n";
