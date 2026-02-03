<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * PostgreSQL-compatible version
     */
    public function up(): void
    {
        // 1. Add permission_overrides column to users table
        Schema::table('users', function (Blueprint $table) {
            $table->json('permission_overrides')->nullable()->after('role');
        });

        // 2. Add evaluation-admin to role enum (PostgreSQL way)
        // Drop and recreate CHECK constraint with new role (split into separate statements)
        // Include all existing roles found in database: evaluation_staff, Group Head
        DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super-admin', 'admin', 'group-head', 'Group Head', 'program-admin', 'program-manager', 'program-moderator', 'evaluation-admin', 'evaluation_staff', 'participant'))");

        // 3. Create permission_audit_log table
        Schema::create('permission_audit_log', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->string('resource', 50);
            $table->string('action', 20);
            $table->boolean('granted');
            $table->string('check_type', 20)->default('role');
            $table->text('reason')->nullable();
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();

            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');

            $table->foreign('changed_by')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');

            $table->index(['user_id', 'resource', 'action']);
            $table->index(['created_at']);
            $table->index(['changed_by']);
        });

        // 4. Add ownership tracking to evaluation tables
        if (Schema::hasTable('evaluation_departments')) {
            Schema::table('evaluation_departments', function (Blueprint $table) {
                if (!Schema::hasColumn('evaluation_departments', 'created_by')) {
                    $table->unsignedBigInteger('created_by')->nullable()->after('program_id');
                    $table->foreign('created_by')
                          ->references('id')
                          ->on('users')
                          ->onDelete('set null');
                    $table->index('created_by');
                }
            });
        }

        if (Schema::hasTable('evaluation_staff')) {
            Schema::table('evaluation_staff', function (Blueprint $table) {
                if (!Schema::hasColumn('evaluation_staff', 'created_by')) {
                    $table->unsignedBigInteger('created_by')->nullable()->after('role_id');
                    $table->foreign('created_by')
                          ->references('id')
                          ->on('users')
                          ->onDelete('set null');
                    $table->index('created_by');
                }
            });
        }

        // 5. Create evaluation_admin_ownership table
        Schema::create('evaluation_admin_ownership', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('admin_user_id');
            $table->uuid('program_id');
            $table->string('resource_type'); // 'department', 'role', 'staff', 'evaluation'
            $table->uuid('resource_id');
            $table->timestamps();

            $table->foreign('admin_user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');

            $table->foreign('program_id')
                  ->references('id')
                  ->on('programs')
                  ->onDelete('cascade');

            // Ensure unique ownership records
            $table->unique(['admin_user_id', 'resource_type', 'resource_id'], 'unique_admin_resource');
            $table->index(['admin_user_id', 'program_id']);
            $table->index(['resource_type', 'resource_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop new tables
        Schema::dropIfExists('evaluation_admin_ownership');
        Schema::dropIfExists('permission_audit_log');

        // Remove ownership columns
        if (Schema::hasTable('evaluation_staff')) {
            Schema::table('evaluation_staff', function (Blueprint $table) {
                if (Schema::hasColumn('evaluation_staff', 'created_by')) {
                    $table->dropForeign(['created_by']);
                    $table->dropColumn('created_by');
                }
            });
        }

        if (Schema::hasTable('evaluation_departments')) {
            Schema::table('evaluation_departments', function (Blueprint $table) {
                if (Schema::hasColumn('evaluation_departments', 'created_by')) {
                    $table->dropForeign(['created_by']);
                    $table->dropColumn('created_by');
                }
            });
        }

        // Remove permission_overrides column
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('permission_overrides');
        });

        // Revert role constraint (split into separate statements)
        DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super-admin', 'admin', 'group-head', 'program-admin', 'program-manager', 'program-moderator', 'participant'))");
    }
};
