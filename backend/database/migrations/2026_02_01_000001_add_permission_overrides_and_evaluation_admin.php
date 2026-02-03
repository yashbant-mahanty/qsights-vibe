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
     * This migration adds:
     * 1. evaluation-admin role to users
     * 2. permission_overrides column for flexible permission management
     * 3. permission_audit_log table for tracking permission changes
     */
    public function up(): void
    {
        // 1. Add evaluation-admin role to the role enum
        DB::statement("
            ALTER TABLE users 
            MODIFY COLUMN role ENUM(
                'super-admin',
                'admin',
                'program-admin',
                'program-manager',
                'program-moderator',
                'evaluation-admin',
                'participant'
            ) NOT NULL DEFAULT 'participant'
        ");

        // 2. Add permission_overrides column to users table
        Schema::table('users', function (Blueprint $table) {
            $table->json('permission_overrides')->nullable()->after('role');
        });

        // 3. Create permission_audit_log table
        Schema::create('permission_audit_log', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->string('resource', 50);
            $table->string('action', 20);
            $table->boolean('granted');
            $table->enum('check_type', ['role', 'override', 'system'])->default('role');
            $table->text('reason')->nullable();
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->ipAddress('ip_address')->nullable();
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

        Schema::table('evaluation_roles', function (Blueprint $table) {
            // created_by already exists, just ensure index
            if (!Schema::hasColumns('evaluation_roles', ['created_by'])) {
                $table->index('created_by');
            }
        });

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

        // 5. Create evaluation_admin_ownership table for tracking what evaluation admins can manage
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
        Schema::table('evaluation_staff', function (Blueprint $table) {
            if (Schema::hasColumn('evaluation_staff', 'created_by')) {
                $table->dropForeign(['created_by']);
                $table->dropColumn('created_by');
            }
        });

        Schema::table('evaluation_departments', function (Blueprint $table) {
            if (Schema::hasColumn('evaluation_departments', 'created_by')) {
                $table->dropForeign(['created_by']);
                $table->dropColumn('created_by');
            }
        });

        // Remove permission_overrides column
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('permission_overrides');
        });

        // Revert role enum (remove evaluation-admin)
        DB::statement("
            ALTER TABLE users 
            MODIFY COLUMN role ENUM(
                'super-admin',
                'admin',
                'program-admin',
                'program-manager',
                'program-moderator',
                'participant'
            ) NOT NULL DEFAULT 'participant'
        ");
    }
};
