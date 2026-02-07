<?php

namespace App\Observers;

use App\Models\Organization;

class OrganizationObserver
{
    /**
     * Handle the Organization "updating" event.
     */
    public function updating(Organization $organization): void
    {
        // If organization is being deactivated
        if ($organization->isDirty('status') && $organization->status === 'inactive') {
            // Deactivate all group heads
            $organization->groupHeads()->update(['status' => 'inactive']);
            
            // Deactivate all programs through group heads
            foreach ($organization->groupHeads as $groupHead) {
                $groupHead->programs()->update(['status' => 'inactive']);
                
                // Deactivate all participants, questionnaires, and activities in those programs
                foreach ($groupHead->programs as $program) {
                    $program->participants()->update(['status' => 'inactive']);
                    $program->questionnaires()->update(['status' => 'inactive']);
                    $program->activities()->update(['status' => 'inactive']);
                }
            }
        }
    }
}
