<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates evaluation_assignments table for assigning evaluations to staff
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
            
            // Staff being evaluated (evaluatee)
            $table->uuid('evaluatee_id');
            $table->foreign('evaluatee_id')
                  ->references('id')
                  ->on('evaluation_staff')
                  ->onDelete('cascade');
            
            // Staff doing the evaluation (evaluator)
            $table->uuid('evaluator_id');
            $table->foreign('evaluator_id')
                  ->references('id')
                  ->on('evaluation_staff')
                  ->onDelete('cascade');
            
            // Relationship context
            $table->enum('evaluator_type', ['manager', 'peer', 'subordinate', 'self', 'other'])->default('manager');
            
            // Status tracking
            $table->enum('status', ['pending', 'in_progress', 'completed', 'overdue', 'skipped'])->default('pending');
            
            // Response link (when evaluation is completed)
            $table->uuid('response_id')->nullable();
            $table->foreign('response_id')
                  ->references('id')
                  ->on('responses')
                  ->onDelete('set null');
            
            // Access token for direct evaluation link
            $table->string('access_token', 64)->unique()->nullable();
            
            // Timestamps for tracking
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('reminder_sent_at')->nullable();
            $table->integer('reminder_count')->default(0);
            
            // Due date (can be different from event end date)
            $table->timestamp('due_date')->nullable();
            
            // Notification preferences
            $table->boolean('send_invitation')->default(true);
            $table->boolean('send_reminders')->default(true);
            
            // Additional notes
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index(['evaluation_event_id', 'status']);
            $table->index(['evaluatee_id', 'status']);
            $table->index(['evaluator_id', 'status']);
            $table->index('status');
            $table->index('access_token');
            $table->index('due_date');
            
            // Prevent duplicate assignments
            $table->unique(['evaluation_event_id', 'evaluatee_id', 'evaluator_id', 'deleted_at'], 'unique_evaluation_assignment');
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
