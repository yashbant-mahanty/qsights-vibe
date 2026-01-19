<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates evaluation_staff table for managing staff members in the evaluation system
     */
    public function up(): void
    {
        Schema::create('evaluation_staff', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // Staff identification
            $table->string('employee_id')->nullable(); // Company employee ID
            $table->string('name');
            $table->string('email')->unique();
            
            // Link to existing user (optional - if staff member has system account)
            $table->uuid('user_id')->nullable();
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
            
            // Role assignment
            $table->uuid('role_id');
            $table->foreign('role_id')
                  ->references('id')
                  ->on('evaluation_roles')
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
            
            // Department/Team
            $table->string('department')->nullable();
            $table->string('team')->nullable();
            
            // Location
            $table->string('location')->nullable();
            $table->string('office')->nullable();
            
            // Employment details
            $table->date('joining_date')->nullable();
            $table->date('leaving_date')->nullable();
            $table->enum('employment_type', ['full_time', 'part_time', 'contract', 'intern'])->default('full_time');
            
            // Contact information
            $table->string('phone')->nullable();
            $table->string('mobile')->nullable();
            
            // Status
            $table->enum('status', ['active', 'inactive', 'on_leave', 'terminated'])->default('active');
            $table->boolean('is_available_for_evaluation')->default(true);
            
            // Additional data (JSON for custom fields)
            $table->json('metadata')->nullable();
            
            // Created by user
            $table->uuid('created_by');
            $table->foreign('created_by')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index(['organization_id', 'status']);
            $table->index(['program_id', 'status']);
            $table->index(['role_id', 'status']);
            $table->index('employee_id');
            $table->index('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_staff');
    }
};
