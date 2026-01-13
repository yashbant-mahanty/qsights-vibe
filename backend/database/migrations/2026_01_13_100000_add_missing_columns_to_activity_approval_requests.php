<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds missing columns to activity_approval_requests table 
     * to store all activity data for approval workflow
     */
    public function up(): void
    {
        Schema::table('activity_approval_requests', function (Blueprint $table) {
            // Core fields
            if (!Schema::hasColumn('activity_approval_requests', 'program_id')) {
                $table->uuid('program_id')->nullable()->after('id');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'questionnaire_id')) {
                $table->uuid('questionnaire_id')->nullable()->after('program_id');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'name')) {
                $table->string('name')->nullable()->after('questionnaire_id');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'description')) {
                $table->text('description')->nullable()->after('name');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'type')) {
                $table->string('type')->default('survey')->after('description');
            }
            
            // Dates
            if (!Schema::hasColumn('activity_approval_requests', 'start_date')) {
                $table->timestamp('start_date')->nullable()->after('type');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'end_date')) {
                $table->timestamp('end_date')->nullable()->after('start_date');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'close_date')) {
                $table->timestamp('close_date')->nullable()->after('end_date');
            }
            
            // Settings
            if (!Schema::hasColumn('activity_approval_requests', 'allow_guests')) {
                $table->boolean('allow_guests')->default(false)->after('close_date');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'contact_us_enabled')) {
                $table->boolean('contact_us_enabled')->default(false)->after('allow_guests');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'is_multilingual')) {
                $table->boolean('is_multilingual')->default(false)->after('contact_us_enabled');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'languages')) {
                $table->json('languages')->nullable()->after('is_multilingual');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'settings')) {
                $table->json('settings')->nullable()->after('languages');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'registration_form_fields')) {
                $table->json('registration_form_fields')->nullable()->after('settings');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'landing_config')) {
                $table->json('landing_config')->nullable()->after('registration_form_fields');
            }
            
            // Time settings
            if (!Schema::hasColumn('activity_approval_requests', 'time_limit_enabled')) {
                $table->boolean('time_limit_enabled')->default(false)->after('landing_config');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'time_limit_minutes')) {
                $table->integer('time_limit_minutes')->nullable()->after('time_limit_enabled');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'pass_percentage')) {
                $table->decimal('pass_percentage', 5, 2)->nullable()->after('time_limit_minutes');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'max_retakes')) {
                $table->integer('max_retakes')->nullable()->after('pass_percentage');
            }
            
            // Admin/Billing fields
            if (!Schema::hasColumn('activity_approval_requests', 'sender_email')) {
                $table->string('sender_email')->nullable()->after('max_retakes');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'manager_name')) {
                $table->string('manager_name')->nullable()->after('sender_email');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'manager_email')) {
                $table->string('manager_email')->nullable()->after('manager_name');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'project_code')) {
                $table->string('project_code')->nullable()->after('manager_email');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'configuration_date')) {
                $table->timestamp('configuration_date')->nullable()->after('project_code');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'configuration_price')) {
                $table->decimal('configuration_price', 10, 2)->nullable()->after('configuration_date');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'subscription_price')) {
                $table->decimal('subscription_price', 10, 2)->nullable()->after('configuration_price');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'subscription_frequency')) {
                $table->string('subscription_frequency')->nullable()->after('subscription_price');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'tax_percentage')) {
                $table->decimal('tax_percentage', 5, 2)->nullable()->after('subscription_frequency');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'number_of_participants')) {
                $table->integer('number_of_participants')->nullable()->after('tax_percentage');
            }
            if (!Schema::hasColumn('activity_approval_requests', 'questions_to_randomize')) {
                $table->integer('questions_to_randomize')->nullable()->after('number_of_participants');
            }
            
            // Reference to created activity (if approved)
            if (!Schema::hasColumn('activity_approval_requests', 'created_activity_id')) {
                $table->uuid('created_activity_id')->nullable()->after('questions_to_randomize');
            }
        });
        
        // Add foreign keys if tables exist
        try {
            Schema::table('activity_approval_requests', function (Blueprint $table) {
                // Note: Foreign keys added with nullable references
            });
        } catch (\Exception $e) {
            // Ignore FK errors - tables may not exist
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_approval_requests', function (Blueprint $table) {
            $columns = [
                'program_id', 'questionnaire_id', 'name', 'description', 'type',
                'start_date', 'end_date', 'close_date',
                'allow_guests', 'contact_us_enabled', 'is_multilingual', 'languages',
                'settings', 'registration_form_fields', 'landing_config',
                'time_limit_enabled', 'time_limit_minutes', 'pass_percentage', 'max_retakes',
                'sender_email', 'manager_name', 'manager_email', 'project_code',
                'configuration_date', 'configuration_price', 'subscription_price',
                'subscription_frequency', 'tax_percentage', 'number_of_participants',
                'questions_to_randomize', 'created_activity_id'
            ];
            
            foreach ($columns as $column) {
                if (Schema::hasColumn('activity_approval_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
