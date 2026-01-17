<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Ensure prior constraint is removed to avoid conflicts
        DB::statement('ALTER TABLE responses DROP CONSTRAINT IF EXISTS responses_activity_participant_unique');

        // Enforce uniqueness for participants (non-preview)
        DB::statement('CREATE UNIQUE INDEX responses_activity_participant_unique_idx ON responses (activity_id, participant_id) WHERE participant_id IS NOT NULL AND is_preview = false');

        // Enforce uniqueness for guest identifiers (non-preview)
        DB::statement('CREATE UNIQUE INDEX responses_activity_guest_unique_idx ON responses (activity_id, guest_identifier) WHERE guest_identifier IS NOT NULL AND is_preview = false');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS responses_activity_participant_unique_idx');
        DB::statement('DROP INDEX IF EXISTS responses_activity_guest_unique_idx');

        // Restore the original constraint without preview filtering
        DB::statement('ALTER TABLE responses ADD CONSTRAINT responses_activity_participant_unique UNIQUE (activity_id, participant_id)');
    }
};
