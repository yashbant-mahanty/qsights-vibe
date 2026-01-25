<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Make organization_id nullable in all evaluation tables
        Schema::table('evaluation_departments', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable()->change();
        });

        Schema::table('evaluation_roles', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable()->change();
        });

        Schema::table('evaluation_staff', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable()->change();
        });

        Schema::table('evaluation_hierarchy', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Note: Reverting to NOT NULL will fail if any records have NULL organization_id
        Schema::table('evaluation_departments', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable(false)->change();
        });

        Schema::table('evaluation_roles', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable(false)->change();
        });

        Schema::table('evaluation_staff', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable(false)->change();
        });

        Schema::table('evaluation_hierarchy', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable(false)->change();
        });
    }
};
