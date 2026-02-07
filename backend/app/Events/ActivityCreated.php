<?php

namespace App\Events;

use App\Models\Activity;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ActivityCreated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $activity;

    public function __construct(Activity $activity)
    {
        $this->activity = $activity;
    }
}
