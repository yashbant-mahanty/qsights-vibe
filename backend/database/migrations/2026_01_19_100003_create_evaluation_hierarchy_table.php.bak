<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates evaluation_hierarchy table for parent-child reporting relationships
     */
    public function up(): void
    {
        Schema::create('evaluation_hierarchy', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // Staff member (child/subordinate)
            $table->uuid('staff_id');
            $table->foreign('staff_id')
                  ->references('id')
                  ->on('evaluation_staff')
                  ->onDelete('cascade');
            
            // Reports to (parent/supervisor)
            $table->uuid('reports_to_id');
            $table->foreign('reports_to_id')
                  ->references('id')
                  ->on('evaluation_staff')
                  ->onDelete('cascade');
            
            // Organization scope
            $table->uuid('organization_id');
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
            
            // Relationship type
            $table->enum('relationship_type', ['direct', 'indirect', 'dotted_line', 'matrix'])->default('direct');
            
            // Relationship details
            $table->string('relationship_title')->nullable(); // e.g., "Reporting Manager", "Functional Manager"
            $table->text('notes')->nullable();
            
            // Validity period (for temporary reporting relationships)
            $table->date('valid_from')->nullable();
            $table->date('valid_until')->nullable();
            
            // Status
            $table->boolean('is_active')->default(true);
            $table->boolean('is_primary')->default(true); // Primary reporting line
            
            // Weight for 360 evaluations (if person has multiple managers)
            $table->integer('evaluation_weight')->default(100); // Percentage
            
            // Created by user
            $table->uuid('created_by');
            $table->foreign('created_by')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
            
            // Change tracking
            $table->uuid('updated_by')->nullable();
            $table->foreign('updated_by')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index(['staff_id', 'is_active']);
            $table->index(['reports_to_id', 'is_active']);
            $table->index(['organization_id', 'is_active']);
            $table->index(['program_id', 'is_active']);
            
            // Prevent duplicate active relationships
            $table->unique(['staff_id', 'reports_to_id', 'is_primary', 'deleted_at'], 'unique_active_primary_relationship');
        });
        
        // Add check constraint to prevent self-referencing (staff cannot report to themselves)
        DB::statement('ALTER TABLE evaluation_hierarchy ADD CONSTRAINT check_no_self_reference CHECK (staff_id != reports_to_id)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE evaluation_hierarchy DROP CONSTRAINT IF EXISTS check_no_self_reference');
        Schema::dropIfExists('evaluation_hierarchy');
    }
};
