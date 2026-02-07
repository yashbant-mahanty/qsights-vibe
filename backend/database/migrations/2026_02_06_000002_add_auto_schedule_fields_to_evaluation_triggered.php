<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds is_auto_scheduled field to differentiate between manual and automatic (new joinee) triggers
     */
    public function up(): void
    {
        Schema::table('evaluation_triggered', function (Blueprint $table) {
            if (!Schema::hasColumn('evaluation_triggered', 'is_auto_scheduled')) {
                $table->boolean('is_auto_scheduled')->default(false)->after('status');
            }
            if (!Schema::hasColumn('evaluation_triggered', 'auto_schedule_type')) {
                $table->string('auto_schedule_type')->nullable()->after('is_auto_scheduled')->comment('new_joinee, etc');
            }
            if (!Schema::hasColumn('evaluation_triggered', 'staff_id')) {
                $table->uuid('staff_id')->nullable()->after('subordinates_count')->comment('For new joinee tracking');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evaluation_triggered', function (Blueprint $table) {
            if (Schema::hasColumn('evaluation_triggered', 'is_auto_scheduled')) {
                $table->dropColumn('is_auto_scheduled');
            }
            if (Schema::hasColumn('evaluation_triggered', 'auto_schedule_type')) {
                $table->dropColumn('auto_schedule_type');
            }
            if (Schema::hasColumn('evaluation_triggered', 'staff_id')) {
                $table->dropColumn('staff_id');
            }
        });
    }
};
