<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates evaluation_responses table - stores evaluation answers
     */
    public function up(): void
    {
        Schema::create('evaluation_responses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // Link to assignment
            $table->uuid('evaluation_assignment_id');
            $table->foreign('evaluation_assignment_id')
                  ->references('id')
                  ->on('evaluation_assignments')
                  ->onDelete('cascade');
            
            // Link to event (denormalized for faster queries)
            $table->uuid('evaluation_event_id');
            $table->foreign('evaluation_event_id')
                  ->references('id')
                  ->on('evaluation_events')
                  ->onDelete('cascade');
            
            // Link to question
            $table->uuid('question_id');
            $table->foreign('question_id')
                  ->references('id')
                  ->on('questions')
                  ->onDelete('cascade');
            
            // Response data
            $table->json('answer'); // Stores the actual response
            $table->decimal('score', 5, 2)->nullable(); // Numeric score if applicable
            $table->text('comment')->nullable(); // Optional text comment
            
            $table->timestamps();
            
            // Indexes
            $table->index(['evaluation_assignment_id']);
            $table->index(['evaluation_event_id', 'question_id']);
            
            // Unique: one response per question per assignment
            $table->unique(['evaluation_assignment_id', 'question_id'], 'unique_response_per_question');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_responses');
    }
};
