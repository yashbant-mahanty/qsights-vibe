<?php

namespace App\Observers;

use App\Models\Participant;

class ParticipantObserver
{
    /**
     * Handle the Participant "updating" event.
     */
    public function updating(Participant $participant): void
    {
        // If participant is being deactivated
        if ($participant->isDirty('status') && $participant->status === 'inactive') {
            // Note: We keep the participant's responses as-is (in_progress, submitted, auto_saved)
            // The responses table status constraint only allows: 'in_progress', 'submitted', 'auto_saved'
            // Participant status is separate from response status
            // When filtering data, we can check participant.status to determine if responses should be included
        }
    }
}
