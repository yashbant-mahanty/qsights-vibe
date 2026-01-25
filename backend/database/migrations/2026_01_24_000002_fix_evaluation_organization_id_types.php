<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fixes organization_id column types from UUID to unsignedBigInteger
     */
    public function up(): void
    {
        // Fix evaluation_departments
        Schema::table('evaluation_departments', function (Blueprint $table) {
            $table->dropColumn('organization_id');
        });
        Schema::table('evaluation_departments', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->after('description');
            $table->foreign('organization_id')
                  ->references('id')
                  ->on('organizations')
                  ->onDelete('cascade');
            $table->index('organization_id');
        });

        // Fix evaluation_roles (already has foreign key, need to drop and recreate)
        DB::statement('ALTER TABLE evaluation_roles DROP CONSTRAINT IF EXISTS evaluation_roles_organization_id_foreign');
        Schema::table('evaluation_roles', function (Blueprint $table) {
            $table->dropColumn('organization_id');
        });
        Schema::table('evaluation_roles', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->after('description');
            $table->foreign('organization_id')
                  ->references('id')
                  ->on('organizations')
                  ->onDelete('cascade');
        });

        // Fix evaluation_staff (already has foreign key, need to drop and recreate)
        DB::statement('ALTER TABLE evaluation_staff DROP CONSTRAINT IF EXISTS evaluation_staff_organization_id_foreign');
        Schema::table('evaluation_staff', function (Blueprint $table) {
            $table->dropColumn('organization_id');
        });
        Schema::table('evaluation_staff', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->after('program_id');
            $table->foreign('organization_id')
                  ->references('id')
                  ->on('organizations')
                  ->onDelete('cascade');
        });

        // Fix evaluation_hierarchy (already has foreign key, need to drop and recreate)
        DB::statement('ALTER TABLE evaluation_hierarchy DROP CONSTRAINT IF EXISTS evaluation_hierarchy_organization_id_foreign');
        Schema::table('evaluation_hierarchy', function (Blueprint $table) {
            $table->dropColumn('organization_id');
        });
        Schema::table('evaluation_hierarchy', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->after('reports_to_id');
            $table->foreign('organization_id')
                  ->references('id')
                  ->on('organizations')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverse is not practical as data would be lost
        // This is a one-way migration
    }
};
