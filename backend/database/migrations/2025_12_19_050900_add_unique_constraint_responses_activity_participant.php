<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * CRITICAL: Prevents duplicate submissions - ONE PARTICIPANT = ONE SUBMISSION PER EVENT
     */
    public function up(): void
    {
        // Add unique constraint to enforce one submission per participant per activity
        DB::statement('
            ALTER TABLE responses 
            ADD CONSTRAINT responses_activity_participant_unique 
            UNIQUE (activity_id, participant_id)
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('
            ALTER TABLE responses 
            DROP CONSTRAINT IF EXISTS responses_activity_participant_unique
        ');
    }
};
