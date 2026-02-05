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
        Schema::table('ai_query_logs', function (Blueprint $table) {
            // Change response_time_ms from integer to decimal to support fractional milliseconds
            $table->decimal('response_time_ms', 10, 3)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ai_query_logs', function (Blueprint $table) {
            // Revert back to integer
            $table->integer('response_time_ms')->nullable()->change();
        });
    }
};
