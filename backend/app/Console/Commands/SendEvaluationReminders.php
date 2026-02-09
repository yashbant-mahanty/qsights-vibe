<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\EvaluationReminderSchedule;
use App\Services\EvaluationNotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendEvaluationReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'evaluations:send-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send scheduled reminders to evaluators for pending evaluations';

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
        $this->info('Checking for due evaluation reminders...');

        // Get all due reminders
        $reminders = EvaluationReminderSchedule::due()
            ->with('evaluationTriggered')
            ->get();

        if ($reminders->isEmpty()) {
            $this->info('No due reminders found.');
            return 0;
        }

        $this->info("Found {$reminders->count()} due reminder(s).");

        $sent = 0;
        $failed = 0;

        foreach ($reminders as $reminder) {
            try {
                $evaluationTriggered = DB::table('evaluation_triggered')
                    ->where('id', $reminder->evaluation_triggered_id)
                    ->first();

                if (!$evaluationTriggered) {
                    $reminder->update([
                        'status' => 'skipped',
                        'error_message' => 'Evaluation not found',
                    ]);
                    continue;
                }

                // Check if evaluation is already completed
                if ($evaluationTriggered->status === 'completed') {
                    $reminder->update([
                        'status' => 'skipped',
                        'error_message' => 'Evaluation already completed',
                    ]);
                    $this->info("Skipped: Evaluation {$evaluationTriggered->id} already completed");
                    continue;
                }

                // Check if evaluation is still active
                if (!$evaluationTriggered->is_active) {
                    $reminder->update([
                        'status' => 'skipped',
                        'error_message' => 'Evaluation is not active',
                    ]);
                    continue;
                }

                // Send reminder
                $this->notificationService->sendReminderToEvaluator(
                    (array) $evaluationTriggered,
                    $reminder->days_before_deadline
                );

                $reminder->markAsSent();
                $sent++;

                $this->info("✓ Sent reminder for evaluation: {$evaluationTriggered->template_name} (Evaluator: {$evaluationTriggered->evaluator_name})");

                Log::info('Evaluation reminder sent', [
                    'evaluation_id' => $evaluationTriggered->id,
                    'evaluator' => $evaluationTriggered->evaluator_name,
                    'days_before' => $reminder->days_before_deadline,
                ]);

            } catch (\Exception $e) {
                $reminder->markAsFailed($e->getMessage());
                $failed++;

                $this->error("✗ Failed to send reminder: {$e->getMessage()}");
                
                Log::error('Failed to send evaluation reminder', [
                    'reminder_id' => $reminder->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->info("\nSummary:");
        $this->info("✓ Sent: {$sent}");
        $this->info("✗ Failed: {$failed}");

        return 0;
    }
}
