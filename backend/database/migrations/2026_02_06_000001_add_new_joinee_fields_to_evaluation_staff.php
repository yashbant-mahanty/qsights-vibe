<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds is_new_joinee field to support automatic evaluation scheduling for new employees
     */
    public function up(): void
    {
        Schema::table('evaluation_staff', function (Blueprint $table) {
            if (!Schema::hasColumn('evaluation_staff', 'is_new_joinee')) {
                $table->boolean('is_new_joinee')->default(false)->after('is_available_for_evaluation');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evaluation_staff', function (Blueprint $table) {
            if (Schema::hasColumn('evaluation_staff', 'is_new_joinee')) {
                $table->dropColumn('is_new_joinee');
            }
        });
    }
};
