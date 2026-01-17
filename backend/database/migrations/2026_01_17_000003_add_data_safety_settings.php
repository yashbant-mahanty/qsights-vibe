<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds data safety settings columns to the system_settings table
     * to control backup behavior and retention policies.
     */
    public function up(): void
    {
        // Check if system_settings table exists
        if (!Schema::hasTable('system_settings')) {
            // Create system_settings table if it doesn't exist
            Schema::create('system_settings', function (Blueprint $table) {
                $table->id();
                $table->string('key')->unique();
                $table->text('value')->nullable();
                $table->string('type')->default('string'); // string, boolean, integer, json
                $table->text('description')->nullable();
                $table->string('category')->default('general');
                $table->boolean('is_public')->default(false); // Can be accessed by non-admins
                $table->timestamps();
            });
        }

        // Insert data safety settings with default values
        DB::table('system_settings')->insert([
            [
                'key' => 'data_safety_enable_response_backup',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Enable automatic backup of all response data',
                'category' => 'data_safety',
                'is_active' => true,
                'is_encrypted' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'data_safety_include_anonymous',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Include anonymous responses in backup',
                'category' => 'data_safety',
                'is_active' => true,
                'is_encrypted' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'data_safety_retention_policy',
                'value' => 'never',
                'type' => 'string',
                'description' => 'Data retention policy (never, 1year, 2years, 5years, 7years)',
                'category' => 'data_safety',
                'is_active' => true,
                'is_encrypted' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'data_safety_enable_notification_logging',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Enable comprehensive notification logging',
                'category' => 'data_safety',
                'is_active' => true,
                'is_encrypted' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'data_safety_log_notification_content',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Log notification message content for audit trail',
                'category' => 'data_safety',
                'is_active' => true,
                'is_encrypted' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove data safety settings
        DB::table('system_settings')
            ->where('category', 'data_safety')
            ->delete();
    }
};
