<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds "reports_to" field to users table for hierarchy management
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('reports_to_user_id')->nullable()->after('role');
            $table->foreign('reports_to_user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['reports_to_user_id']);
            $table->dropColumn('reports_to_user_id');
        });
    }
};
