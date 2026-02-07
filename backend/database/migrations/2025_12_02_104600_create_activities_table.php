<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('program_id');
            $table->uuid('questionnaire_id')->nullable();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('type', ['survey', 'poll', 'assessment'])->default('survey');
            
            // Date fields for status tracking
            $table->dateTime('start_date')->nullable();
            $table->dateTime('end_date')->nullable();
            $table->dateTime('close_date')->nullable(); // Different from end_date for late submissions
            
            // Status: draft, upcoming (scheduled), live (active), expired (past end_date), closed (past close_date)
            $table->enum('status', ['draft', 'upcoming', 'live', 'expired', 'closed', 'archived'])->default('draft');
            
            // Feature toggles
            $table->boolean('allow_guests')->default(false);
            $table->boolean('is_multilingual')->default(false);
            $table->json('languages')->nullable();
            
            // Additional settings
            $table->json('settings')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys
            $table->foreign('program_id')
                  ->references('id')
                  ->on('programs')
                  ->onDelete('cascade');
                  
            $table->foreign('questionnaire_id')
                  ->references('id')
                  ->on('questionnaires')
                  ->onDelete('set null');
            
            // Indexes
            $table->index('program_id');
            $table->index('questionnaire_id');
            $table->index('status');
            $table->index('type');
            $table->index('start_date');
            $table->index('end_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
