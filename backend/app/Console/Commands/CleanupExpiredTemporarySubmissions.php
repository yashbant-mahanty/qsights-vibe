<?php

namespace App\Console\Commands;

use App\Models\TemporarySubmission;
use Illuminate\Console\Command;

class CleanupExpiredTemporarySubmissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'submissions:cleanup-expired';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete expired temporary submissions (older than 24 hours)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting cleanup of expired temporary submissions...');

        // Find all expired submissions
        $expiredCount = TemporarySubmission::where('expires_at', '<', now())
            ->where('status', 'pending')
            ->count();

        if ($expiredCount === 0) {
            $this->info('No expired temporary submissions found.');
            return 0;
        }

        // Mark as expired (keeps records for audit)
        TemporarySubmission::where('expires_at', '<', now())
            ->where('status', 'pending')
            ->update(['status' => 'expired']);

        $this->info("Marked {$expiredCount} temporary submissions as expired.");

        // Optional: Delete very old expired records (older than 30 days)
        $deletedCount = TemporarySubmission::where('status', 'expired')
            ->where('expires_at', '<', now()->subDays(30))
            ->delete();

        if ($deletedCount > 0) {
            $this->info("Deleted {$deletedCount} old expired records (>30 days).");
        }

        $this->info('Cleanup completed successfully!');
        return 0;
    }
}
