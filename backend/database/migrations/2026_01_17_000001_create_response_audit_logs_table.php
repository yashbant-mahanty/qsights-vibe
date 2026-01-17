<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates the response_audit_logs table for granular response data tracking.
     * This table stores individual question-level responses with full audit trail.
     */
    public function up(): void
    {
        Schema::create('response_audit_logs', function (Blueprint $table) {
            $table->id();
            
            // Core identifiers - matching production schema types
            $table->uuid('response_id');
            $table->unsignedBigInteger('user_id')->nullable(); // Null for anonymous - bigint in production
            $table->unsignedBigInteger('participant_id')->nullable(); // bigint in production
            $table->uuid('event_id')->nullable(); // Activity ID - uuid in production
            $table->unsignedBigInteger('questionnaire_id')->nullable(); // bigint in production
            $table->unsignedBigInteger('question_id'); // bigint in production
            $table->unsignedBigInteger('option_id')->nullable(); // For MCQ/radio questions
            
            // Answer data
            $table->text('answer_value')->nullable(); // Text answers, single values
            $table->json('answer_value_array')->nullable(); // Multi-select, checkbox
            $table->text('answer_file_path')->nullable(); // File uploads
            $table->json('answer_translations')->nullable(); // Multilingual answers
            
            // Source tracking
            $table->enum('source', ['web', 'email', 'qr', 'anonymous', 'api'])->default('web');
            
            // Timestamps
            $table->timestamp('submitted_at');
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys
            $table->foreign('response_id')
                  ->references('id')
                  ->on('responses')
                  ->onDelete('cascade');
            
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
            
            $table->foreign('participant_id')
                  ->references('id')
                  ->on('participants')
                  ->onDelete('set null');
            
            $table->foreign('event_id')
                  ->references('id')
                  ->on('activities')
                  ->onDelete('set null');
            
            $table->foreign('questionnaire_id')
                  ->references('id')
                  ->on('questionnaires')
                  ->onDelete('set null');
            
            $table->foreign('question_id')
                  ->references('id')
                  ->on('questions')
                  ->onDelete('cascade');
            
            // Indexes for performance
            $table->index('response_id');
            $table->index('user_id');
            $table->index('participant_id');
            $table->index('event_id');
            $table->index('questionnaire_id');
            $table->index('question_id');
            $table->index('source');
            $table->index('submitted_at');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('response_audit_logs');
    }
};
