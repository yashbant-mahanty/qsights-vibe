<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds "reports_to" field to participants table for hierarchy management
     * Participants can report to either a User (admin) or another Participant
     */
    public function up(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            // Reports to a User (admin/manager)
            $table->uuid('reports_to_user_id')->nullable()->after('status');
            $table->foreign('reports_to_user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
            
            // OR Reports to another Participant
            $table->uuid('reports_to_participant_id')->nullable()->after('reports_to_user_id');
            $table->foreign('reports_to_participant_id')
                  ->references('id')
                  ->on('participants')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->dropForeign(['reports_to_user_id']);
            $table->dropForeign(['reports_to_participant_id']);
            $table->dropColumn(['reports_to_user_id', 'reports_to_participant_id']);
        });
    }
};
