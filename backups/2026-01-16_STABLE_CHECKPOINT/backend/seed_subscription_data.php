<?php

/**
 * Seed sample activities with subscription data
 * Run with: php seed_subscription_data.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Activity;
use App\Models\Program;
use App\Models\User;
use Illuminate\Support\Str;

echo "=== Seeding Sample Subscription Data ===\n\n";

// Get a super admin user
$superAdmin = User::where('role', 'super-admin')->first();
if (!$superAdmin) {
    echo "Error: No super-admin user found. Please create one first.\n";
    exit(1);
}

// Get or create a program
$program = Program::where('status', 'active')->first();
if (!$program) {
    echo "Error: No active program found. Please create one first.\n";
    exit(1);
}

echo "Using program: {$program->name}\n";
echo "Created by: {$superAdmin->name}\n\n";

// Sample subscription data
$subscriptionData = [
    [
        'name' => 'Annual Employee Engagement Survey',
        'subscription_frequency' => 'yearly',
        'subscription_price' => 50000.00,
        'tax_percentage' => 18.00,
        'number_of_participants' => 500,
    ],
    [
        'name' => 'Quarterly Customer Satisfaction Survey',
        'subscription_frequency' => 'quarterly',
        'subscription_price' => 15000.00,
        'tax_percentage' => 18.00,
        'number_of_participants' => 200,
    ],
    [
        'name' => 'Monthly Team Pulse Check',
        'subscription_frequency' => 'monthly',
        'subscription_price' => 5000.00,
        'tax_percentage' => 18.00,
        'number_of_participants' => 100,
    ],
    [
        'name' => 'Weekly Project Feedback',
        'subscription_frequency' => 'weekly',
        'subscription_price' => 2000.00,
        'tax_percentage' => 18.00,
        'number_of_participants' => 50,
    ],
    [
        'name' => 'Bi-Annual Performance Review',
        'subscription_frequency' => 'half-yearly',
        'subscription_price' => 30000.00,
        'tax_percentage' => 18.00,
        'number_of_participants' => 300,
    ],
];

$created = 0;
foreach ($subscriptionData as $data) {
    try {
        // Check if activity already exists
        $existing = Activity::where('name', $data['name'])->first();
        if ($existing) {
            echo "Activity already exists: {$data['name']}\n";
            continue;
        }

        $activity = Activity::create([
            'id' => Str::uuid(),
            'program_id' => $program->id,
            'name' => $data['name'],
            'description' => 'Sample activity with subscription data for testing',
            'type' => 'survey',
            'status' => 'upcoming',
            'start_date' => now()->addDays(7),
            'end_date' => now()->addDays(14),
            'created_by' => $superAdmin->id,
            'subscription_frequency' => $data['subscription_frequency'],
            'subscription_price' => $data['subscription_price'],
            'tax_percentage' => $data['tax_percentage'],
            'number_of_participants' => $data['number_of_participants'],
            'configuration_price' => $data['subscription_price'] * 0.1, // 10% of subscription as config price
            'configuration_date' => now(),
            'sender_email' => 'noreply@qsights.com',
            'manager_name' => $superAdmin->name,
            'manager_email' => $superAdmin->email,
            'project_code' => 'PROJ-' . strtoupper(substr($data['subscription_frequency'], 0, 3)) . '-' . rand(1000, 9999),
        ]);

        echo "✓ Created: {$activity->name} (₹{$data['subscription_price']}, {$data['subscription_frequency']})\n";
        $created++;
    } catch (\Exception $e) {
        echo "✗ Error creating activity: {$e->getMessage()}\n";
    }
}

echo "\n=== Summary ===\n";
echo "Total activities created: {$created}\n";

if ($created > 0) {
    echo "\nRun 'php test_subscription_metrics.php' to see the metrics.\n";
}

echo "\n=== Seeding Complete ===\n";
