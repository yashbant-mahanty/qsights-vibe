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
        Schema::table('activities', function (Blueprint $table) {
            $table->boolean('time_limit_enabled')->default(false)->after('settings');
            $table->integer('time_limit_minutes')->nullable()->after('time_limit_enabled')->comment('Time limit in minutes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn(['time_limit_enabled', 'time_limit_minutes']);
        });
    }
};
