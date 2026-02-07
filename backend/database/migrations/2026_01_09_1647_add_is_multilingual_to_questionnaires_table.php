<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questionnaires', function (Blueprint $table) {
            if (!Schema::hasColumn('questionnaires', 'is_multilingual')) {
                $table->boolean('is_multilingual')->default(false)->after('type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('questionnaires', function (Blueprint $table) {
            if (Schema::hasColumn('questionnaires', 'is_multilingual')) {
                $table->dropColumn('is_multilingual');
            }
        });
    }
};
