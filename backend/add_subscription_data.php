<?php

/**
 * Add Subscription Data to Missing Activities
 * This script adds subscription pricing to the 3 activities that are missing it
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Activity;
use Illuminate\Support\Facades\DB;

echo "\n================================\n";
echo "ADD SUBSCRIPTION DATA\n";
echo "================================\n\n";

// Define the 3 activities and their subscription data
$activitiesData = [
    [
        'name' => 'QSights Poll',
        'type' => 'poll',
        'configuration_price' => 1000.00,
        'subscription_price' => 8000.00,
        'tax_percentage' => 18.00,
        'subscription_frequency' => 'monthly',
        'number_of_participants' => 150,
        'configuration_date' => '2025-12-15',
    ],
    [
        'name' => 'Activity 2 - Program Test',
        'type' => 'assessment',
        'configuration_price' => 2000.00,
        'subscription_price' => 12000.00,
        'tax_percentage' => 18.00,
        'subscription_frequency' => 'quarterly',
        'number_of_participants' => 250,
        'configuration_date' => '2025-12-15',
    ],
    [
        'name' => 'QSights Survey on GitHub Copilot',
        'type' => 'survey',
        'configuration_price' => 800.00,
        'subscription_price' => 6000.00,
        'tax_percentage' => 18.00,
        'subscription_frequency' => 'weekly',
        'number_of_participants' => 80,
        'configuration_date' => '2025-12-15',
    ],
];

echo "Activities to update:\n";
echo "-----------------------------------\n";
foreach ($activitiesData as $data) {
    echo "- " . $data['name'] . " (" . ucfirst($data['type']) . ")\n";
}
echo "\n";

try {
    DB::beginTransaction();
    
    $updated = 0;
    foreach ($activitiesData as $data) {
        $activity = Activity::where('name', $data['name'])
            ->where('type', $data['type'])
            ->whereNull('deleted_at')
            ->first();
        
        if ($activity) {
            $activity->update([
                'configuration_price' => $data['configuration_price'],
                'subscription_price' => $data['subscription_price'],
                'tax_percentage' => $data['tax_percentage'],
                'subscription_frequency' => $data['subscription_frequency'],
                'number_of_participants' => $data['number_of_participants'],
                'configuration_date' => $data['configuration_date'],
            ]);
            
            echo "✓ Updated: " . $activity->name . "\n";
            echo "  Config: ₹" . number_format($data['configuration_price'], 2) . "\n";
            echo "  Subscription: ₹" . number_format($data['subscription_price'], 2) . "\n";
            echo "  Tax: " . $data['tax_percentage'] . "%\n";
            echo "  Participants: " . $data['number_of_participants'] . "\n";
            echo "  Frequency: " . ucfirst($data['subscription_frequency']) . "\n\n";
            
            $updated++;
        } else {
            echo "✗ Not found: " . $data['name'] . "\n\n";
        }
    }
    
    DB::commit();
    
    echo "================================\n";
    echo "✓ Successfully updated {$updated} activities!\n";
    echo "  Activity Breakdown will now show 8 items.\n";
    echo "================================\n\n";
    
} catch (\Exception $e) {
    DB::rollBack();
    echo "✗ Error: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Show summary
echo "New Totals:\n";
echo "-----------------------------------\n";
$allWithSubscription = Activity::whereNotNull('subscription_price')
    ->whereNull('deleted_at')
    ->count();
echo "Total activities with subscription: {$allWithSubscription}\n";

$totalRevenue = Activity::whereNotNull('subscription_price')
    ->whereNull('deleted_at')
    ->get()
    ->sum(function($a) {
        return ($a->configuration_price ?? 0) + ($a->subscription_price ?? 0) + 
               ((($a->subscription_price ?? 0) * ($a->tax_percentage ?? 0)) / 100);
    });
echo "Total Revenue: ₹" . number_format($totalRevenue, 2) . "\n";

$totalParticipants = Activity::whereNotNull('subscription_price')
    ->whereNull('deleted_at')
    ->sum('number_of_participants');
echo "Total Participants: " . number_format($totalParticipants) . "\n\n";
