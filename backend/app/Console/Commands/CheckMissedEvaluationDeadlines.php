<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\EvaluationNotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class CheckMissedEvaluationDeadlines extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'evaluations:check-missed-deadlines';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for evaluations with missed deadlines and send alerts to admins';

    protected $notificationService;

    /**
     * Create a new command instance.
     */
    public function __construct(EvaluationNotificationService $notificationService)
    {
        parent::__construct();
        $this->notificationService = $notificationService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for missed evaluation deadlines...');

        // Get all active evaluations with end_date that has passed and status is not completed
        $missedEvaluations = DB::table('evaluation_triggered')
            ->where('is_active', true)
            ->where('status', '!=', 'completed')
            ->whereNotNull('end_date')
            ->where('end_date', '<', now())
            ->whereNull('deleted_at')
            // Only check for those not already marked as missed (to avoid duplicate alerts)
            ->where(function ($query) {
                $query->where('missed_deadline_notified_at', null)
                      ->orWhere('missed_deadline_notified_at', '<', DB::raw('DATE_SUB(NOW(), INTERVAL 24 HOUR)'));
            })
            ->get();

        if ($missedEvaluations->isEmpty()) {
            $this->info('No missed deadlines found.');
            return 0;
        }

        $this->info("Found {$missedEvaluations->count()} missed deadline(s).");

        $notified = 0;
        $failed = 0;

        foreach ($missedEvaluations as $evaluation) {
            try {
                // Send missed deadline notification
                $this->notificationService->notifyMissedDeadline((array) $evaluation);

                // Mark as notified
                DB::table('evaluation_triggered')
                    ->where('id', $evaluation->id)
                    ->update(['missed_deadline_notified_at' => now()]);

                $notified++;

                $this->info("✓ Sent missed deadline alert for: {$evaluation->template_name} (Evaluator: {$evaluation->evaluator_name})");

                Log::info('Missed deadline notification sent', [
                    'evaluation_id' => $evaluation->id,
                    'evaluator' => $evaluation->evaluator_name,
                    'deadline' => $evaluation->end_date,
                ]);

            } catch (\Exception $e) {
                $failed++;
                $this->error("✗ Failed to send alert: {$e->getMessage()}");
                
                Log::error('Failed to send missed deadline notification', [
                    'evaluation_id' => $evaluation->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->info("\nSummary:");
        $this->info("✓ Notifications sent: {$notified}");
        $this->info("✗ Failed: {$failed}");

        return 0;
    }
}
