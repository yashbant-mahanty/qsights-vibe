<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Drop organization_id from evaluation tables as we'll use program_id for isolation.
     * Note: program_id column already exists in all evaluation tables.
     */
    public function up(): void
    {
        Schema::table('evaluation_departments', function (Blueprint $table) {
            $table->dropColumn('organization_id');
        });

        Schema::table('evaluation_roles', function (Blueprint $table) {
            $table->dropColumn('organization_id');
        });

        Schema::table('evaluation_staff', function (Blueprint $table) {
            $table->dropColumn('organization_id');
        });

        Schema::table('evaluation_hierarchy', function (Blueprint $table) {
            $table->dropColumn('organization_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evaluation_departments', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->index('organization_id');
        });

        Schema::table('evaluation_roles', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->index('organization_id');
        });

        Schema::table('evaluation_staff', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->index('organization_id');
        });

        Schema::table('evaluation_hierarchy', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable();
            $table->index('organization_id');
        });
    }
};
