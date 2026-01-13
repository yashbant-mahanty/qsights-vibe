<?php

namespace App\Listeners;

use App\Events\ActivityCreated;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendActivityNotifications implements ShouldQueue
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    public function handle(ActivityCreated $event): void
    {
        $activity = $event->activity;

        // Send notifications to all active participants in the program
        $this->notificationService->notifyActivityCreated($activity);
    }
}
