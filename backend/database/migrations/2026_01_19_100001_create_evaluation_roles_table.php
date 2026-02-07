<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates evaluation_roles table for defining organizational roles/positions
     */
    public function up(): void
    {
        Schema::create('evaluation_roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name'); // e.g., "Senior Manager", "Team Lead", "Developer"
            $table->string('code')->nullable(); // Short code, e.g., "SM", "TL", "DEV"
            $table->text('description')->nullable();
            
            // Organization scope
            $table->unsignedBigInteger('organization_id');
            $table->foreign('organization_id')
                  ->references('id')
                  ->on('organizations')
                  ->onDelete('cascade');
            
            // Program scope (optional - if roles are program-specific)
            $table->uuid('program_id')->nullable();
            $table->foreign('program_id')
                  ->references('id')
                  ->on('programs')
                  ->onDelete('cascade');
            
            // Hierarchy level (for automatic hierarchy suggestions)
            $table->integer('hierarchy_level')->default(0); // 0=executive, 1=senior, 2=mid, 3=junior, etc.
            
            // Role category
            $table->string('category')->nullable(); // e.g., "Management", "Technical", "Support"
            
            // Status
            $table->boolean('is_active')->default(true);
            
            // Created by user
            $table->unsignedBigInteger('created_by')->nullable();
            $table->foreign('created_by')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index(['organization_id', 'is_active']);
            $table->index(['program_id', 'is_active']);
        });
        
        // Create a partial unique index for non-deleted roles only
        // This allows reusing codes after soft deletion
        DB::statement('CREATE UNIQUE INDEX unique_org_role_code ON evaluation_roles (organization_id, code) WHERE deleted_at IS NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS unique_org_role_code');
        Schema::dropIfExists('evaluation_roles');
    }
};
