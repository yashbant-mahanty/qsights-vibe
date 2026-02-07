<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('responses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('activity_id');
            $table->uuid('participant_id')->nullable(); // Nullable for guest submissions
            $table->string('guest_identifier')->nullable(); // For tracking guest responses
            
            // Status tracking
            $table->enum('status', ['in_progress', 'submitted', 'auto_saved'])->default('in_progress');
            
            // Language tracking
            $table->string('language', 10)->default('en');
            
            // Progress tracking
            $table->integer('total_questions')->default(0);
            $table->integer('answered_questions')->default(0);
            $table->decimal('completion_percentage', 5, 2)->default(0.00);
            
            // Timestamps
            $table->timestamp('started_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('last_saved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            // Additional metadata
            $table->json('metadata')->nullable(); // Browser info, IP, device, etc.
            
            // Foreign keys
            $table->foreign('activity_id')
                  ->references('id')
                  ->on('activities')
                  ->onDelete('cascade');
                  
            $table->foreign('participant_id')
                  ->references('id')
                  ->on('participants')
                  ->onDelete('cascade');
            
            // Indexes
            $table->index('activity_id');
            $table->index('participant_id');
            $table->index('guest_identifier');
            $table->index('status');
            $table->index(['activity_id', 'participant_id']);
            $table->index(['activity_id', 'guest_identifier']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('responses');
    }
};
