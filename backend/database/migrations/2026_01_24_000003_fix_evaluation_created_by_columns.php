<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fixes created_by column type from UUID to unsignedBigInteger
     */
    public function up(): void
    {
        // Fix evaluation_departments created_by
        Schema::table('evaluation_departments', function (Blueprint $table) {
            $table->dropColumn('created_by');
        });
        Schema::table('evaluation_departments', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable()->after('is_active');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });

        // Fix evaluation_roles created_by (already has foreign key)
        DB::statement('ALTER TABLE evaluation_roles DROP CONSTRAINT IF EXISTS evaluation_roles_created_by_foreign');
        Schema::table('evaluation_roles', function (Blueprint $table) {
            $table->dropColumn('created_by');
        });
        Schema::table('evaluation_roles', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable()->after('is_active');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });

        // Fix evaluation_staff created_by (already has foreign key)
        DB::statement('ALTER TABLE evaluation_staff DROP CONSTRAINT IF EXISTS evaluation_staff_created_by_foreign');
        Schema::table('evaluation_staff', function (Blueprint $table) {
            $table->dropColumn('created_by');
        });
        Schema::table('evaluation_staff', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->after('metadata');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
        });

        // Fix evaluation_hierarchy created_by and updated_by (already have foreign keys)
        DB::statement('ALTER TABLE evaluation_hierarchy DROP CONSTRAINT IF EXISTS evaluation_hierarchy_created_by_foreign');
        DB::statement('ALTER TABLE evaluation_hierarchy DROP CONSTRAINT IF EXISTS evaluation_hierarchy_updated_by_foreign');
        Schema::table('evaluation_hierarchy', function (Blueprint $table) {
            $table->dropColumn(['created_by', 'updated_by']);
        });
        Schema::table('evaluation_hierarchy', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->after('evaluation_weight');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->unsignedBigInteger('updated_by')->nullable()->after('created_by');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverse is not practical as data would be lost
    }
};
