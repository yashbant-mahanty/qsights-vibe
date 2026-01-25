<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('evaluation_triggered', function (Blueprint $table) {
            if (!Schema::hasColumn('evaluation_triggered', 'program_id')) {
                $table->uuid('program_id')->nullable()->after('organization_id');
                $table->index('program_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evaluation_triggered', function (Blueprint $table) {
            if (Schema::hasColumn('evaluation_triggered', 'program_id')) {
                $table->dropIndex(['program_id']);
                $table->dropColumn('program_id');
            }
        });
    }
};
