<?php

namespace App\Console\Commands;

use App\Models\Activity;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ClearSubscriptionData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscription:clear 
                            {--force : Force the operation without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear all subscription-related data from activities';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('================================');
        $this->info('CLEAR SUBSCRIPTION DATA');
        $this->info('================================');
        $this->newLine();

        // Get current activities with subscription data
        $activitiesWithSubscription = Activity::whereNotNull('subscription_price')
            ->whereNull('deleted_at')
            ->get();

        if ($activitiesWithSubscription->isEmpty()) {
            $this->info('✓ No activities found with subscription data.');
            $this->info('  Database is already clean.');
            $this->newLine();
            return Command::SUCCESS;
        }

        $this->warn("Found {$activitiesWithSubscription->count()} activities with subscription data:");
        $this->newLine();

        // Display activities
        foreach ($activitiesWithSubscription as $activity) {
            $this->line("- {$activity->name}");
            $this->line("  Config: ₹" . number_format($activity->configuration_price ?? 0, 2));
            $this->line("  Subscription: ₹" . number_format($activity->subscription_price ?? 0, 2));
            $this->line("  Tax: " . ($activity->tax_percentage ?? 0) . "%");
            $this->line("  Participants: " . ($activity->number_of_participants ?? 0));
            $this->newLine();
        }

        // Calculate current totals
        $totalConfig = $activitiesWithSubscription->sum('configuration_price');
        $totalSubscription = $activitiesWithSubscription->sum('subscription_price');
        $totalTax = $activitiesWithSubscription->sum(function($a) {
            return (($a->subscription_price ?? 0) * ($a->tax_percentage ?? 0)) / 100;
        });
        $grandTotal = $totalConfig + $totalSubscription + $totalTax;

        $this->info("Current Total Revenue: ₹" . number_format($grandTotal, 2));
        $this->info('================================');
        $this->newLine();

        // Show what will be cleared
        $this->warn('This will clear the following fields from all activities:');
        $this->line('- subscription_price');
        $this->line('- configuration_price');
        $this->line('- tax_percentage');
        $this->line('- subscription_frequency');
        $this->line('- number_of_participants');
        $this->line('- configuration_date');
        $this->newLine();

        // Confirmation
        if (!$this->option('force')) {
            if (!$this->confirm('Are you sure you want to proceed?')) {
                $this->error('✗ Operation cancelled.');
                return Command::FAILURE;
            }
        }

        $this->info('Clearing subscription data...');

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
            
            $this->newLine();
            $this->info("✓ Successfully cleared subscription data from {$updated} activities.");
            $this->info('  Dashboard will now show ₹0.00 for all subscription metrics.');
            
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('✗ Error: ' . $e->getMessage());
            return Command::FAILURE;
        }

        $this->newLine();
        $this->info('================================');
        $this->info('CLEANUP COMPLETE');
        $this->info('================================');
        $this->newLine();

        return Command::SUCCESS;
    }
}
