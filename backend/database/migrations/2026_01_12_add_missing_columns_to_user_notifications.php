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
        Schema::table('user_notifications', function (Blueprint $table) {
            // Add missing columns if they don't exist
            if (!Schema::hasColumn('user_notifications', 'entity_type')) {
                $table->string('entity_type')->nullable()->after('message');
            }
            if (!Schema::hasColumn('user_notifications', 'entity_id')) {
                $table->string('entity_id')->nullable()->after('entity_type');
            }
            if (!Schema::hasColumn('user_notifications', 'entity_name')) {
                $table->string('entity_name')->nullable()->after('entity_id');
            }
            if (!Schema::hasColumn('user_notifications', 'action_url')) {
                $table->string('action_url')->nullable()->after('is_read');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_notifications', function (Blueprint $table) {
            $table->dropColumn(['entity_type', 'entity_id', 'entity_name', 'action_url']);
        });
    }
};
