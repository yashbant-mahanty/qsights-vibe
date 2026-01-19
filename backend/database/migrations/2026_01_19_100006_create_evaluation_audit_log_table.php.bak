<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates evaluation_audit_log table for tracking all changes in the evaluation system
     */
    public function up(): void
    {
        Schema::create('evaluation_audit_log', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // Entity being audited
            $table->string('entity_type'); // e.g., 'evaluation_event', 'evaluation_staff', 'evaluation_hierarchy'
            $table->uuid('entity_id');
            
            // Organization scope
            $table->uuid('organization_id')->nullable();
            $table->foreign('organization_id')
                  ->references('id')
                  ->on('organizations')
                  ->onDelete('cascade');
            
            // Action details
            $table->enum('action', ['created', 'updated', 'deleted', 'assigned', 'completed', 'published', 'status_changed'])->default('updated');
            $table->string('action_description')->nullable(); // Human-readable description
            
            // User who performed the action
            $table->uuid('user_id')->nullable();
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
            
            $table->string('user_name')->nullable(); // Store name in case user is deleted
            $table->string('user_email')->nullable();
            
            // Data changes
            $table->json('old_values')->nullable(); // Previous state
            $table->json('new_values')->nullable(); // New state
            $table->json('changes')->nullable(); // Specific fields changed
            
            // Context
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            
            // Timestamps
            $table->timestamp('performed_at')->useCurrent();
            $table->timestamps();
            
            // Indexes
            $table->index(['entity_type', 'entity_id']);
            $table->index(['organization_id', 'performed_at']);
            $table->index(['user_id', 'performed_at']);
            $table->index('action');
            $table->index('performed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_audit_log');
    }
};
