<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. group_heads
        Schema::table('group_heads', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
        });

        // 2. programs
        Schema::table('programs', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropForeign(['group_head_id']);
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('group_head_id')->references('id')->on('group_heads')->onDelete('cascade');
        });

        // 3. questionnaires
        Schema::table('questionnaires', function (Blueprint $table) {
            $table->dropForeign(['program_id']);
            $table->foreign('program_id')->references('id')->on('programs')->onDelete('cascade');
        });

        // 4. activities
        Schema::table('activities', function (Blueprint $table) {
            $table->dropForeign(['program_id']);
            $table->dropForeign(['questionnaire_id']);
            $table->foreign('program_id')->references('id')->on('programs')->onDelete('cascade');
            $table->foreign('questionnaire_id')->references('id')->on('questionnaires')->onDelete('cascade');
        });

        // 5. participants
        Schema::table('participants', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
        });

        // 6. sections
        Schema::table('sections', function (Blueprint $table) {
            $table->dropForeign(['questionnaire_id']);
            $table->foreign('questionnaire_id')->references('id')->on('questionnaires')->onDelete('cascade');
        });

        // 7. questions
        Schema::table('questions', function (Blueprint $table) {
            $table->dropForeign(['section_id']);
            $table->foreign('section_id')->references('id')->on('sections')->onDelete('cascade');
        });

        // 8. responses
        Schema::table('responses', function (Blueprint $table) {
            $table->dropForeign(['activity_id']);
            $table->dropForeign(['participant_id']);
            $table->foreign('activity_id')->references('id')->on('activities')->onDelete('cascade');
            $table->foreign('participant_id')->references('id')->on('participants')->onDelete('cascade');
        });

        // 9. answers
        Schema::table('answers', function (Blueprint $table) {
            $table->dropForeign(['response_id']);
            $table->dropForeign(['question_id']);
            $table->foreign('response_id')->references('id')->on('responses')->onDelete('cascade');
            $table->foreign('question_id')->references('id')->on('questions')->onDelete('cascade');
        });

        // 10. notifications (has participant_id not activity_id)
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropForeign(['participant_id']);
            $table->foreign('participant_id')->references('id')->on('participants')->onDelete('cascade');
        });

        // 11. activity_participant pivot
        Schema::table('activity_participant', function (Blueprint $table) {
            $table->dropForeign(['activity_id']);
            $table->dropForeign(['participant_id']);
            $table->foreign('activity_id')->references('id')->on('activities')->onDelete('cascade');
            $table->foreign('participant_id')->references('id')->on('participants')->onDelete('cascade');
        });

        // 12. participant_program pivot
        Schema::table('participant_program', function (Blueprint $table) {
            $table->dropForeign(['participant_id']);
            $table->dropForeign(['program_id']);
            $table->foreign('participant_id')->references('id')->on('participants')->onDelete('cascade');
            $table->foreign('program_id')->references('id')->on('programs')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        // Rollback not needed
    }
};
