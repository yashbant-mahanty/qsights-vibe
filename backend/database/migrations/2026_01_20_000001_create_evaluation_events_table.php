<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates evaluation_events table - the main table for evaluation cycles/events
     */
    public function up(): void
    {
        Schema::create('evaluation_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // Event identification
            $table->string('name');
            $table->string('code')->nullable(); // e.g., "Q1-2026", "ANNUAL-2026"
            $table->text('description')->nullable();
            
            // Organization scope - BIGINT to match organizations.id
            $table->unsignedBigInteger('organization_id');
            $table->foreign('organization_id')
                  ->references('id')
                  ->on('organizations')
                  ->onDelete('cascade');
            
            // Program scope (optional) - UUID to match programs.id
            $table->uuid('program_id')->nullable();
            $table->foreign('program_id')
                  ->references('id')
                  ->on('programs')
                  ->onDelete('cascade');
            
            // Link to questionnaire - BIGINT to match questionnaires.id
            $table->unsignedBigInteger('questionnaire_id')->nullable();
            $table->foreign('questionnaire_id')
                  ->references('id')
                  ->on('questionnaires')
                  ->onDelete('set null');
            
            // Event period
            $table->date('start_date');
            $table->date('end_date');
            $table->date('grace_period_end')->nullable(); // Extended deadline
            
            // Event type
            $table->enum('evaluation_type', ['360', 'manager_only', 'peer_only', 'self_only', 'custom'])->default('360');
            
            // Status
            $table->enum('status', ['draft', 'scheduled', 'active', 'paused', 'completed', 'archived'])->default('draft');
            
            // Settings
            $table->boolean('allow_self_evaluation')->default(true);
            $table->boolean('allow_peer_evaluation')->default(true);
            $table->boolean('allow_manager_evaluation')->default(true);
            $table->boolean('allow_subordinate_evaluation')->default(true);
            $table->boolean('is_anonymous')->default(true);
            $table->integer('min_evaluators')->default(3); // Minimum evaluators for anonymity
            
            // Notification settings
            $table->boolean('send_invitations')->default(true);
            $table->boolean('send_reminders')->default(true);
            $table->integer('reminder_days_before')->default(3);
            
            // Results settings
            $table->boolean('auto_publish_results')->default(false);
            $table->boolean('allow_manager_view')->default(true);
            $table->boolean('allow_self_view')->default(true);
            
            // Metadata
            $table->json('settings')->nullable(); // Additional configurable settings
            $table->json('metadata')->nullable();
            
            // Created by - BIGINT to match users.id
            $table->unsignedBigInteger('created_by')->nullable();
            $table->foreign('created_by')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index(['organization_id', 'status']);
            $table->index(['program_id', 'status']);
            $table->index(['start_date', 'end_date']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_events');
    }
};
