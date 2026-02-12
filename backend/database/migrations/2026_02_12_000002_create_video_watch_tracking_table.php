<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates video_watch_tracking table to track participant video viewing progress
     */
    public function up(): void
    {
        Schema::create('video_watch_tracking', function (Blueprint $table) {
            $table->id();
            
            // Core identifiers
            $table->uuid('response_id');
            $table->uuid('participant_id')->nullable(); // Nullable for guest/anonymous
            $table->uuid('activity_id');
            $table->uuid('question_id'); // Video question ID - CHANGED TO UUID to match questions table
            
            // Watch tracking data
            $table->integer('watch_time_seconds')->default(0); // Total seconds watched
            $table->string('watch_time_formatted', 10)->nullable(); // HH:MM:SS format
            $table->boolean('completed_watch')->default(false); // Did they watch till the end
            $table->decimal('completion_percentage', 5, 2)->default(0.00); // % of video watched
            
            // Metadata
            $table->integer('total_plays')->default(0); // Number of times play button was clicked
            $table->integer('total_pauses')->default(0); // Number of times paused
            $table->integer('total_seeks')->default(0); // Number of times seeked
            $table->timestamp('first_played_at')->nullable(); // When first played
            $table->timestamp('last_updated_at')->nullable(); // Last watch update
            
            $table->timestamps();
            
            // Foreign keys
            $table->foreign('response_id')
                  ->references('id')
                  ->on('responses')
                  ->onDelete('cascade');
                  
            $table->foreign('participant_id')
                  ->references('id')
                  ->on('participants')
                  ->onDelete('cascade');
                  
            $table->foreign('activity_id')
                  ->references('id')
                  ->on('activities')
                  ->onDelete('cascade');
                  
            $table->foreign('question_id')
                  ->references('id')
                  ->on('questions')
                  ->onDelete('cascade');
            
            // Indexes for performance
            $table->index('response_id');
            $table->index('participant_id');
            $table->index('activity_id');
            $table->index('question_id');
            $table->unique(['response_id', 'question_id']); // One tracking record per video per response
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('video_watch_tracking');
    }
};
