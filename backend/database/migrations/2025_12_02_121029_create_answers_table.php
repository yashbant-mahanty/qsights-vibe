<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('answers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('response_id');
            $table->uuid('question_id');
            
            // Answer value (flexible storage for different question types)
            $table->text('value')->nullable(); // Single value (text, number, date, etc.)
            $table->json('value_array')->nullable(); // Multiple values (checkbox, multiselect, matrix)
            $table->text('file_path')->nullable(); // File upload path
            
            // Multilingual support
            $table->json('value_translations')->nullable(); // Translated answers for multilingual questions
            
            // Metadata
            $table->integer('time_spent')->nullable(); // Seconds spent on this question
            $table->integer('revision_count')->default(0); // Number of times answer was changed
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys
            $table->foreign('response_id')
                  ->references('id')
                  ->on('responses')
                  ->onDelete('cascade');
                  
            $table->foreign('question_id')
                  ->references('id')
                  ->on('questions')
                  ->onDelete('cascade');
            
            // Indexes
            $table->index('response_id');
            $table->index('question_id');
            $table->unique(['response_id', 'question_id']); // One answer per question per response
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('answers');
    }
};
