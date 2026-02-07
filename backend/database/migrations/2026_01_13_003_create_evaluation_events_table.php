<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates evaluation_events table for hierarchy-based evaluations
     */
    public function up(): void
    {
        Schema::create('evaluation_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->text('description')->nullable();
            
            // Link to existing questionnaire
            $table->uuid('questionnaire_id');
            $table->foreign('questionnaire_id')
                  ->references('id')
                  ->on('questionnaires')
                  ->onDelete('cascade');
            
            // Organization scope
            $table->uuid('organization_id')->nullable();
            $table->foreign('organization_id')
                  ->references('id')
                  ->on('organizations')
                  ->onDelete('cascade');
            
            // Program scope (optional)
            $table->uuid('program_id')->nullable();
            $table->foreign('program_id')
                  ->references('id')
                  ->on('programs')
                  ->onDelete('cascade');
            
            // Created by user
            $table->uuid('created_by');
            $table->foreign('created_by')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
            
            // Evaluation configuration
            $table->enum('evaluation_type', ['downward', 'upward', '360'])->default('downward');
            $table->boolean('is_hierarchy_based')->default(true);
            $table->boolean('is_anonymous')->default(false);
            $table->boolean('show_individual_responses')->default(true); // When anonymous, show responses without names
            
            // Schedule
            $table->dateTime('start_date');
            $table->dateTime('end_date');
            
            // Status
            $table->enum('status', ['draft', 'active', 'paused', 'completed', 'cancelled'])->default('draft');
            
            // Additional settings (JSON)
            $table->json('settings')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index(['organization_id', 'status']);
            $table->index(['program_id', 'status']);
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
