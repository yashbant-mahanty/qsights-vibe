<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add min_selection and max_selection columns for Multiple Choice questions
     */
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->integer('min_selection')->nullable()->after('is_comment_enabled');
            $table->integer('max_selection')->nullable()->after('min_selection');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn(['min_selection', 'max_selection']);
        });
    }
};
