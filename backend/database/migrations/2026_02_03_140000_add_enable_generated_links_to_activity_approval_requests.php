<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds enable_generated_links column to activity_approval_requests table
     */
    public function up(): void
    {
        Schema::table('activity_approval_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('activity_approval_requests', 'enable_generated_links')) {
                $table->boolean('enable_generated_links')->default(false)->after('contact_us_enabled');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_approval_requests', function (Blueprint $table) {
            if (Schema::hasColumn('activity_approval_requests', 'enable_generated_links')) {
                $table->dropColumn('enable_generated_links');
            }
        });
    }
};
