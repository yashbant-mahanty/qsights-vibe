<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create program_roles table for custom roles within programs
        Schema::create('program_roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('program_id');
            $table->string('role_name'); // e.g., "Trainer", "Evaluator", "Observer"
            $table->string('username')->unique();
            $table->string('email')->unique();
            $table->string('password');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            $table->foreign('program_id')
                  ->references('id')
                  ->on('programs')
                  ->onDelete('cascade');
                  
            $table->index('program_id');
            $table->index('username');
            $table->index('email');
            $table->index('status');
            
            // Ensure unique role name per program
            $table->unique(['program_id', 'role_name']);
        });

        // Create program_role_activities table for assigning activities (services) to roles
        Schema::create('program_role_activities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('program_role_id');
            $table->uuid('activity_id');
            $table->timestamps();
            
            $table->foreign('program_role_id')
                  ->references('id')
                  ->on('program_roles')
                  ->onDelete('cascade');
                  
            $table->foreign('activity_id')
                  ->references('id')
                  ->on('activities')
                  ->onDelete('cascade');
                  
            $table->unique(['program_role_id', 'activity_id']);
            $table->index('program_role_id');
            $table->index('activity_id');
        });

        // Create program_role_events table for assigning events to roles
        // Note: "Events" in this context refers to activity events or scheduled sessions
        Schema::create('program_role_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('program_role_id');
            $table->uuid('activity_id'); // Event is essentially an activity with specific type/dates
            $table->timestamps();
            
            $table->foreign('program_role_id')
                  ->references('id')
                  ->on('program_roles')
                  ->onDelete('cascade');
                  
            $table->foreign('activity_id')
                  ->references('id')
                  ->on('activities')
                  ->onDelete('cascade');
                  
            $table->unique(['program_role_id', 'activity_id']);
            $table->index('program_role_id');
            $table->index('activity_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('program_role_events');
        Schema::dropIfExists('program_role_activities');
        Schema::dropIfExists('program_roles');
    }
};
