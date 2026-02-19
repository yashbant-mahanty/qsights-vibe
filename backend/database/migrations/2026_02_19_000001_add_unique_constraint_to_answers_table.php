<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds UNIQUE constraint to prevent duplicate poll submissions
     * for the same question by the same participant.
     */
    public function up(): void
    {
        Schema::table('answers', function (Blueprint $table) {
            // Add unique constraint on (response_id, question_id)
            // This ensures one participant can only submit one answer per question
            $table->unique(['response_id', 'question_id'], 'unique_response_question');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('answers', function (Blueprint $table) {
            $table->dropUnique('unique_response_question');
        });
    }
};
