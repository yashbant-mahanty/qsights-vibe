<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // $schedule->command('inspire')->hourly();
        
        // Send scheduled evaluation emails every 5 minutes
        $schedule->command('evaluations:send-scheduled')
            ->everyFiveMinutes()
            ->withoutOverlapping()
            ->runInBackground();
        
        // Send evaluation reminders - runs every hour
        $schedule->command('evaluations:send-reminders')
            ->hourly()
            ->withoutOverlapping()
            ->runInBackground();
        
        // Check for missed deadlines - runs twice daily (morning and evening)
        $schedule->command('evaluations:check-missed-deadlines')
            ->twiceDaily(9, 18) // 9 AM and 6 PM
            ->withoutOverlapping()
            ->runInBackground();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
