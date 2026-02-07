<?php

namespace App\Console\Commands;

use App\Models\Activity;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendActivityReminders extends Command
{
    protected $signature = 'activity:send-reminders {--days=1 : Days before activity starts}';
    protected $description = 'Send reminder notifications for upcoming activities';

    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        parent::__construct();
        $this->notificationService = $notificationService;
    }

    public function handle()
    {
        $days = (int) $this->option('days');
        $reminderDate = Carbon::now()->addDays($days);

        $this->info("Sending reminders for activities starting on {$reminderDate->format('Y-m-d')}");

        // Find activities starting in X days
        $activities = Activity::where('status', 'live')
            ->whereDate('start_date', $reminderDate->format('Y-m-d'))
            ->with('program.participants')
            ->get();

        if ($activities->isEmpty()) {
            $this->info('No activities found for reminder.');
            return 0;
        }

        $totalSent = 0;
        $totalFailed = 0;

        foreach ($activities as $activity) {
            $this->info("Processing: {$activity->name}");

            $results = $this->notificationService->sendActivityReminders($activity);

            $emailSent = $results['email']['sent'];
            $emailFailed = $results['email']['failed'];
            $smsSent = $results['sms']['sent'];
            $smsFailed = $results['sms']['failed'];

            $totalSent += $emailSent + $smsSent;
            $totalFailed += $emailFailed + $smsFailed;

            $this->info("  Email: {$emailSent} sent, {$emailFailed} failed");
            $this->info("  SMS: {$smsSent} sent, {$smsFailed} failed");
        }

        $this->info("\nTotal reminders sent: {$totalSent}");
        $this->info("Total failures: {$totalFailed}");

        return 0;
    }
}
