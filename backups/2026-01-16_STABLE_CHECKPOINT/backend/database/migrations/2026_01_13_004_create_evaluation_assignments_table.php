<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates evaluation_assignments table - tracks who evaluates whom
     */
    public function up(): void
    {
        Schema::create('evaluation_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // Link to evaluation event
            $table->uuid('evaluation_event_id');
            $table->foreign('evaluation_event_id')
                  ->references('id')
                  ->on('evaluation_events')
                  ->onDelete('cascade');
            
            // Evaluator (who is evaluating) - can be User or Participant
            $table->enum('evaluator_type', ['user', 'participant']);
            $table->uuid('evaluator_id');
            
            // Evaluatee (who is being evaluated) - can be User or Participant
            $table->enum('evaluatee_type', ['user', 'participant']);
            $table->uuid('evaluatee_id');
            
            // Manager who triggered this assignment
            $table->uuid('triggered_by');
            $table->foreign('triggered_by')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
            
            // Unique access token for evaluation URL
            $table->string('access_token', 64)->unique();
            
            // Assignment status
            $table->enum('status', ['pending', 'in_progress', 'completed', 'expired'])->default('pending');
            
            // Timestamps for tracking
            $table->dateTime('sent_at')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->integer('reminder_count')->default(0);
            $table->dateTime('last_reminder_at')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['evaluation_event_id', 'status']);
            $table->index(['evaluator_type', 'evaluator_id']);
            $table->index(['evaluatee_type', 'evaluatee_id']);
            $table->index('triggered_by');
            $table->index('access_token');
            
            // Unique constraint: one evaluator can evaluate one evaluatee only once per event
            $table->unique(
                ['evaluation_event_id', 'evaluator_type', 'evaluator_id', 'evaluatee_type', 'evaluatee_id'],
                'unique_evaluation_assignment'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_assignments');
    }
};
