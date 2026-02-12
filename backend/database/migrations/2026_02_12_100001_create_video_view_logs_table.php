<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('video_view_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable(); // Participant user ID
            $table->uuid('participant_id')->nullable(); // Participant ID (from participants table)
            $table->uuid('questionnaire_id');
            $table->uuid('video_id');
            $table->uuid('activity_id')->nullable(); // Track which activity they viewed from
            $table->integer('watch_duration_seconds')->default(0);
            $table->boolean('completed')->default(false); // Watched to end
            $table->decimal('completion_percentage', 5, 2)->default(0.00); // 0-100%
            $table->string('participant_email')->nullable(); // For reporting
            $table->string('participant_name')->nullable(); // For reporting
            $table->timestamps();
            
            // Foreign keys
            $table->foreign('questionnaire_id')
                  ->references('id')
                  ->on('questionnaires')
                  ->onDelete('cascade');
                  
            $table->foreign('video_id')
                  ->references('id')
                  ->on('questionnaire_videos')
                  ->onDelete('cascade');
                  
            $table->foreign('activity_id')
                  ->references('id')
                  ->on('activities')
                  ->onDelete('cascade');
                  
            $table->foreign('participant_id')
                  ->references('id')
                  ->on('participants')
                  ->onDelete('set null');
                  
            // Indexes
            $table->index('user_id');
            $table->index('participant_id');
            $table->index('questionnaire_id');
            $table->index('video_id');
            $table->index('activity_id');
            $table->index('completed');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('video_view_logs');
    }
};
