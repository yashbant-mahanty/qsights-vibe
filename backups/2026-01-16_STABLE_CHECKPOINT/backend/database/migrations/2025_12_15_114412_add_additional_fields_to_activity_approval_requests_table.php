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
        Schema::table('activity_approval_requests', function (Blueprint $table) {
            $table->string('sender_email')->nullable()->after('name');
            $table->string('manager_name')->nullable()->after('end_date');
            $table->string('manager_email')->nullable()->after('manager_name');
            $table->string('project_code')->nullable()->after('manager_email');
            $table->date('configuration_date')->nullable()->after('project_code');
            $table->decimal('configuration_price', 10, 2)->nullable()->after('configuration_date');
            $table->decimal('subscription_price', 10, 2)->nullable()->after('configuration_price');
            $table->string('subscription_frequency')->nullable()->after('subscription_price'); // e.g., 'monthly', 'yearly', 'one-time'
            $table->decimal('tax_percentage', 5, 2)->nullable()->after('subscription_frequency');
            $table->integer('number_of_participants')->nullable()->after('tax_percentage');
            $table->integer('questions_to_randomize')->nullable()->after('number_of_participants');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_approval_requests', function (Blueprint $table) {
            $table->dropColumn([
                'sender_email',
                'manager_name',
                'manager_email',
                'project_code',
                'configuration_date',
                'configuration_price',
                'subscription_price',
                'subscription_frequency',
                'tax_percentage',
                'number_of_participants',
                'questions_to_randomize',
            ]);
        });
    }
};
