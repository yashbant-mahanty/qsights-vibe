<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * The questionnaire_id should be UUID to match the questionnaires table primary key
     * This migration ensures the column type is correct (uuid, not integer)
     */
    public function up(): void
    {
        // Check if column exists and fix type if needed
        if (Schema::hasColumn('activity_approval_requests', 'questionnaire_id')) {
            // Get column type - if it's not uuid/char(36), we need to fix it
            $columnType = DB::select("SELECT data_type FROM information_schema.columns WHERE table_name = 'activity_approval_requests' AND column_name = 'questionnaire_id'");
            
            if (!empty($columnType) && !in_array($columnType[0]->data_type, ['uuid', 'character'])) {
                // Drop and recreate as uuid
                Schema::table('activity_approval_requests', function (Blueprint $table) {
                    $table->dropColumn('questionnaire_id');
                });
                
                Schema::table('activity_approval_requests', function (Blueprint $table) {
                    $table->uuid('questionnaire_id')->nullable()->after('program_id');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reversal needed - the column should remain as uuid
    }
};
