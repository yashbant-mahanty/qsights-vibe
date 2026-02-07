<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fixes unique constraints to properly handle soft deletes
     */
    public function up(): void
    {
        // Fix evaluation_roles unique constraint
        DB::statement('ALTER TABLE evaluation_roles DROP CONSTRAINT IF EXISTS evaluation_roles_organization_id_code_unique');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS unique_org_role_code ON evaluation_roles (organization_id, code) WHERE deleted_at IS NULL');
        
        // Fix evaluation_hierarchy unique constraint
        DB::statement('ALTER TABLE evaluation_hierarchy DROP CONSTRAINT IF EXISTS unique_active_primary_relationship');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS unique_active_primary_hierarchy ON evaluation_hierarchy (staff_id, reports_to_id) WHERE is_primary = true AND is_active = true AND deleted_at IS NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS unique_org_role_code');
        DB::statement('DROP INDEX IF EXISTS unique_active_primary_hierarchy');
        
        // Restore original constraints
        DB::statement('ALTER TABLE evaluation_roles ADD CONSTRAINT evaluation_roles_organization_id_code_unique UNIQUE (organization_id, code)');
        // Note: Cannot easily restore the original hierarchy constraint due to soft deletes
    }
};
