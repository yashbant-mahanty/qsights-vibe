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
     * Adds 'sct_likert' (Script Concordance Test Likert) question type
     * for standardized clinical judgment evaluation with scoring.
     */
    public function up(): void
    {
        // PostgreSQL: Drop existing check constraint
        DB::statement("ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check");
        
        // Recreate with SCT Likert added (includes all existing types)
        DB::statement("ALTER TABLE questions ADD CONSTRAINT questions_type_check CHECK (type IN (
            'text', 'textarea', 'number', 'email', 'phone', 'url',
            'radio', 'checkbox', 'select', 'multiselect',
            'rating', 'scale', 'date', 'time', 'datetime',
            'file', 'yesno', 'matrix', 'information',
            'slider_scale', 'dial_gauge', 'likert_visual', 'nps', 'nps_scale', 'star_rating', 'drag_and_drop',
            'sct_likert'
        ))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove sct_likert from constraint
        DB::statement("ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check");
        
        DB::statement("ALTER TABLE questions ADD CONSTRAINT questions_type_check CHECK (type IN (
            'text', 'textarea', 'number', 'email', 'phone', 'url',
            'radio', 'checkbox', 'select', 'multiselect',
            'rating', 'scale', 'date', 'time', 'datetime',
            'file', 'yesno', 'matrix', 'information',
            'slider_scale', 'dial_gauge', 'likert_visual', 'nps', 'nps_scale', 'star_rating', 'drag_and_drop'
        ))");
    }
};
