<?php

namespace App\Observers;

use App\Models\GroupHead;

class GroupHeadObserver
{
    /**
     * Handle the GroupHead "updating" event.
     */
    public function updating(GroupHead $groupHead): void
    {
        // If group head is being deactivated
        if ($groupHead->isDirty('status') && $groupHead->status === 'inactive') {
            // Deactivate all programs
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
