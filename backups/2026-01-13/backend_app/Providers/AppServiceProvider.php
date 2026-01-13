<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\Organization;
use App\Models\GroupHead;
use App\Models\Program;
use App\Models\Participant;
use App\Observers\OrganizationObserver;
use App\Observers\GroupHeadObserver;
use App\Observers\ProgramObserver;
use App\Observers\ParticipantObserver;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register model observers for hierarchical deactivation
        Organization::observe(OrganizationObserver::class);
        GroupHead::observe(GroupHeadObserver::class);
        Program::observe(ProgramObserver::class);
        Participant::observe(ParticipantObserver::class);
    }
}
