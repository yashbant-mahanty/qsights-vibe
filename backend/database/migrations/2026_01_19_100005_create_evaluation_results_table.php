<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates evaluation_results table for storing aggregated evaluation results
     */
    public function up(): void
    {
        Schema::create('evaluation_results', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // Link to evaluation event
            $table->uuid('evaluation_event_id');
            $table->foreign('evaluation_event_id')
                  ->references('id')
                  ->on('evaluation_events')
                  ->onDelete('cascade');
            
            // Staff being evaluated
            $table->uuid('staff_id');
            $table->foreign('staff_id')
                  ->references('id')
                  ->on('evaluation_staff')
                  ->onDelete('cascade');
            
            // Completion statistics
            $table->integer('total_assigned')->default(0); // Number of evaluators assigned
            $table->integer('total_completed')->default(0); // Number completed
            $table->decimal('completion_percentage', 5, 2)->default(0); // Completion rate
            
            // Scores (if applicable)
            $table->decimal('average_score', 8, 2)->nullable();
            $table->decimal('manager_score', 8, 2)->nullable();
            $table->decimal('peer_score', 8, 2)->nullable();
            $table->decimal('subordinate_score', 8, 2)->nullable();
            $table->decimal('self_score', 8, 2)->nullable();
            
            // Aggregated feedback (JSON)
            $table->json('aggregated_data')->nullable(); // Question-wise aggregated responses
            
            // Status
            $table->enum('status', ['in_progress', 'completed', 'published', 'archived'])->default('in_progress');
            
            // Publishing
            $table->boolean('is_published')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->unsignedBigInteger('published_by')->nullable();
            $table->foreign('published_by')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
            
            // Comments/notes
            $table->text('admin_notes')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index(['evaluation_event_id', 'status']);
            $table->index(['staff_id', 'status']);
            $table->index('is_published');
            
            // Unique result per staff per event
            $table->unique(['evaluation_event_id', 'staff_id', 'deleted_at'], 'unique_evaluation_result');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_results');
    }
};
