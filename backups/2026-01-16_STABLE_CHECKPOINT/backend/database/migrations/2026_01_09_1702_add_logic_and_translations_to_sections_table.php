<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            if (!Schema::hasColumn('sections', 'conditional_logic')) {
                $table->json('conditional_logic')->nullable()->after('order');
            }
            if (!Schema::hasColumn('sections', 'translations')) {
                $table->json('translations')->nullable()->after('conditional_logic');
            }
        });
    }

    public function down(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            if (Schema::hasColumn('sections', 'conditional_logic')) {
                $table->dropColumn('conditional_logic');
            }
            if (Schema::hasColumn('sections', 'translations')) {
                $table->dropColumn('translations');
            }
        });
    }
};
