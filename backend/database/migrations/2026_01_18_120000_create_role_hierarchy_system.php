<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * This migration creates the complete Role Hierarchy & Reporting Management system
     */
    public function up(): void
    {
        // 1. Create role_types table (System vs Program roles)
        Schema::create('role_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique(); // 'system' or 'program'
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // 2. Create hierarchical_roles table (Base roles with hierarchy support)
        Schema::create('hierarchical_roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('role_type_id');
            $table->string('name'); // Manager (L1), Manager (L2), Staff, etc.
            $table->string('code')->unique(); // manager_l1, manager_l2, staff, etc.
            $table->integer('hierarchy_level')->default(0); // 0=top, 1=L1, 2=L2, etc.
            $table->boolean('is_manager')->default(false); // Can this role manage others?
            $table->boolean('can_view_reports')->default(false);
            $table->text('description')->nullable();
            $table->json('permissions')->nullable(); // Store custom permissions
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('role_type_id')
                  ->references('id')
                  ->on('role_types')
                  ->onDelete('cascade');

            $table->index('role_type_id');
            $table->index('code');
            $table->index('hierarchy_level');
            $table->index(['is_manager', 'status']);
        });

        // 3. Create user_role_hierarchy table (Maps users to roles with manager relationships)
        Schema::create('user_role_hierarchy', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id'); // Changed to unsignedBigInteger
            $table->uuid('program_id')->nullable(); // NULL for system roles
            $table->uuid('hierarchical_role_id');
            $table->unsignedBigInteger('manager_user_id')->nullable(); // Changed to unsignedBigInteger
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');

            $table->foreign('program_id')
                  ->references('id')
                  ->on('programs')
                  ->onDelete('cascade');

            $table->foreign('hierarchical_role_id')
                  ->references('id')
                  ->on('hierarchical_roles')
                  ->onDelete('cascade');

            $table->foreign('manager_user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');

            // Ensure ONE manager per user per program
            $table->unique(['user_id', 'program_id'], 'unique_user_program_manager');

            // Indexes for performance
            $table->index('user_id');
            $table->index('program_id');
            $table->index('hierarchical_role_id');
            $table->index('manager_user_id');
            $table->index(['manager_user_id', 'program_id']); // For manager dashboards
        });

        // 4. Create manager_dashboard_access table (Track what managers can see)
        Schema::create('manager_dashboard_access', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('manager_user_id'); // Changed to unsignedBigInteger
            $table->uuid('program_id');
            $table->boolean('can_view_activities')->default(true);
            $table->boolean('can_view_events')->default(true);
            $table->boolean('can_view_questionnaires')->default(true);
            $table->boolean('can_view_notifications')->default(true);
            $table->boolean('can_export_reports')->default(true);
            $table->timestamps();

            $table->foreign('manager_user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');

            $table->foreign('program_id')
                  ->references('id')
                  ->on('programs')
                  ->onDelete('cascade');

            $table->unique(['manager_user_id', 'program_id']);
            $table->index(['manager_user_id', 'program_id']);
        });

        // 5. Create hierarchy_change_log table (Audit trail for hierarchy changes)
        Schema::create('hierarchy_change_log', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id'); // Changed to unsignedBigInteger
            $table->uuid('program_id')->nullable();
            $table->unsignedBigInteger('old_manager_id')->nullable(); // Changed to unsignedBigInteger
            $table->unsignedBigInteger('new_manager_id')->nullable(); // Changed to unsignedBigInteger
            $table->unsignedBigInteger('changed_by_user_id'); // Changed to unsignedBigInteger
            $table->string('change_type'); // 'assigned', 'reassigned', 'removed'
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');

            $table->foreign('program_id')
                  ->references('id')
                  ->on('programs')
                  ->onDelete('cascade');

            $table->foreign('old_manager_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');

            $table->foreign('new_manager_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');

            $table->foreign('changed_by_user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');

            $table->index('user_id');
            $table->index('program_id');
            $table->index(['new_manager_id', 'program_id']);
            $table->index('created_at');
        });

        // 6. Add manager_user_id to existing users table if not exists
        if (!Schema::hasColumn('users', 'manager_user_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unsignedBigInteger('manager_user_id')->nullable()->after('program_id'); // Changed to unsignedBigInteger
                $table->uuid('hierarchical_role_id')->nullable()->after('role');
                
                $table->foreign('manager_user_id')
                      ->references('id')
                      ->on('users')
                      ->onDelete('set null');

                $table->foreign('hierarchical_role_id')
                      ->references('id')
                      ->on('hierarchical_roles')
                      ->onDelete('set null');

                $table->index('manager_user_id');
                $table->index('hierarchical_role_id');
            });
        }

        // 7. Seed initial role types
        DB::table('role_types')->insert([
            [
                'id' => (string) Str::uuid(),
                'name' => 'system',
                'description' => 'System-wide roles (Super Admin, Admin, etc.)',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(),
                'name' => 'program',
                'description' => 'Program-specific roles (Managers, Staff, etc.)',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        // 8. Seed initial hierarchical roles
        $systemRoleType = DB::table('role_types')->where('name', 'system')->first();
        $programRoleType = DB::table('role_types')->where('name', 'program')->first();

        DB::table('hierarchical_roles')->insert([
            // System Roles
            [
                'id' => (string) Str::uuid(),
                'role_type_id' => $systemRoleType->id,
                'name' => 'Super Admin',
                'code' => 'super_admin',
                'hierarchy_level' => 0,
                'is_manager' => true,
                'can_view_reports' => true,
                'description' => 'Full system access',
                'permissions' => json_encode(['all' => true]),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(),
                'role_type_id' => $systemRoleType->id,
                'name' => 'Admin',
                'code' => 'admin',
                'hierarchy_level' => 0,
                'is_manager' => true,
                'can_view_reports' => true,
                'description' => 'System administrator',
                'permissions' => json_encode(['system_management' => true]),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Program Roles
            [
                'id' => (string) Str::uuid(),
                'role_type_id' => $programRoleType->id,
                'name' => 'Manager (L1)',
                'code' => 'manager_l1',
                'hierarchy_level' => 1,
                'is_manager' => true,
                'can_view_reports' => true,
                'description' => 'First-level manager',
                'permissions' => json_encode(['manage_team' => true, 'view_reports' => true]),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(),
                'role_type_id' => $programRoleType->id,
                'name' => 'Manager (L2)',
                'code' => 'manager_l2',
                'hierarchy_level' => 2,
                'is_manager' => true,
                'can_view_reports' => true,
                'description' => 'Second-level manager',
                'permissions' => json_encode(['manage_team' => true, 'view_reports' => true]),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(),
                'role_type_id' => $programRoleType->id,
                'name' => 'Manager (L3)',
                'code' => 'manager_l3',
                'hierarchy_level' => 3,
                'is_manager' => true,
                'can_view_reports' => true,
                'description' => 'Third-level manager',
                'permissions' => json_encode(['manage_team' => true, 'view_reports' => true]),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(),
                'role_type_id' => $programRoleType->id,
                'name' => 'Staff',
                'code' => 'staff',
                'hierarchy_level' => 99, // Bottom level
                'is_manager' => false,
                'can_view_reports' => false,
                'description' => 'Standard staff member',
                'permissions' => json_encode(['basic_access' => true]),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(),
                'role_type_id' => $programRoleType->id,
                'name' => 'Member',
                'code' => 'member',
                'hierarchy_level' => 99, // Bottom level
                'is_manager' => false,
                'can_view_reports' => false,
                'description' => 'Program member',
                'permissions' => json_encode(['basic_access' => true]),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop in reverse order to respect foreign keys
        if (Schema::hasColumn('users', 'manager_user_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['manager_user_id']);
                $table->dropForeign(['hierarchical_role_id']);
                $table->dropColumn(['manager_user_id', 'hierarchical_role_id']);
            });
        }

        Schema::dropIfExists('hierarchy_change_log');
        Schema::dropIfExists('manager_dashboard_access');
        Schema::dropIfExists('user_role_hierarchy');
        Schema::dropIfExists('hierarchical_roles');
        Schema::dropIfExists('role_types');
    }
};
