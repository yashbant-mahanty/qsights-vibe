<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questionnaires', function (Blueprint $table) {
            if (!Schema::hasColumn('questionnaires', 'scheduled_start')) {
                $table->timestamp('scheduled_start')->nullable()->after('status');
            }
            if (!Schema::hasColumn('questionnaires', 'scheduled_end')) {
                $table->timestamp('scheduled_end')->nullable()->after('scheduled_start');
            }
        });
    }

    public function down(): void
    {
        Schema::table('questionnaires', function (Blueprint $table) {
            if (Schema::hasColumn('questionnaires', 'scheduled_start')) {
                $table->dropColumn('scheduled_start');
            }
            if (Schema::hasColumn('questionnaires', 'scheduled_end')) {
                $table->dropColumn('scheduled_end');
            }
        });
    }
};
