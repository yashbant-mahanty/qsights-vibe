<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Extend video_watch_tracking to support intro/thankyou videos
     */
    public function up(): void
    {
        // Extend existing video_watch_tracking table to support intro/thankyou videos
        Schema::table('video_watch_tracking', function (Blueprint $table) {
            // Add video_type to differentiate between question videos, intro videos, and thankyou videos
            $table->enum('video_type', ['QUESTION', 'INTRO', 'THANKYOU'])->default('QUESTION')->after('question_id');
            
            // Make question_id nullable since intro/thankyou videos are not tied to questions
            $table->uuid('question_id')->nullable()->change();
        });
        
        // Drop the old unique constraint and add new one
        Schema::table('video_watch_tracking', function (Blueprint $table) {
            // Drop the unique constraint that requires question_id
            $table->dropUnique(['response_id', 'question_id']);
            
            // Add new unique constraint that includes video_type
            $table->unique(['response_id', 'question_id', 'video_type'], 'watch_tracking_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('video_watch_tracking', function (Blueprint $table) {
            // Remove the unique constraint
            $table->dropUnique('watch_tracking_unique');
            
            // Re-add the original unique constraint
            $table->unique(['response_id', 'question_id']);
            
            // Make question_id required again
            $table->uuid('question_id')->nullable(false)->change();
            
            // Remove video_type column
            $table->dropColumn('video_type');
        });
    }
};
