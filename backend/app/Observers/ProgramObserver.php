<?php

namespace App\Observers;

use App\Models\Program;

class ProgramObserver
{
    /**
     * Handle the Program "updating" event.
     */
    public function updating(Program $program): void
    {
        // If program is being deactivated
        if ($program->isDirty('status') && $program->status === 'inactive') {
            // Deactivate all participants
            $program->participants()->update(['status' => 'inactive']);
            
            // Deactivate all questionnaires
            $program->questionnaires()->update(['status' => 'inactive']);
            
            // Deactivate all activities
            $program->activities()->update(['status' => 'inactive']);
        }
    }
}
