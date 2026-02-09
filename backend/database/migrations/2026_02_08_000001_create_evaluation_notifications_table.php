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
        // Evaluation notification configurations
        Schema::create('evaluation_notification_configs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('program_id');
            $table->boolean('enable_trigger_notifications')->default(true);
            $table->boolean('enable_completion_notifications')->default(true);
            $table->boolean('enable_missed_deadline_alerts')->default(true);
            $table->boolean('enable_automatic_reminders')->default(true);
            $table->json('reminder_schedule')->nullable(); // [7, 3, 1] days before
            $table->text('trigger_email_template')->nullable();
            $table->text('completion_email_template')->nullable();
            $table->text('missed_deadline_template')->nullable();
            $table->text('reminder_email_template')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('program_id')->references('id')->on('programs')->onDelete('cascade');
            $table->index('program_id');
        });

        // Evaluation notification logs
        Schema::create('evaluation_notification_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('evaluation_triggered_id')->nullable();
            $table->uuid('program_id');
            $table->string('notification_type'); // trigger, completion, missed_deadline, reminder
            $table->string('channel')->default('email'); // email, bell, both
            $table->uuid('recipient_id'); // evaluator or admin staff id
            $table->string('recipient_email');
            $table->string('recipient_name');
            $table->string('subject')->nullable();
            $table->text('message')->nullable();
            $table->text('metadata')->nullable(); // JSON: evaluator_name, staff_name, form_name, etc.
            $table->string('status')->default('pending'); // pending, sent, delivered, failed
            $table->string('provider')->nullable(); // SendGrid
            $table->string('provider_message_id')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->integer('retry_count')->default(0);
            $table->timestamps();

            $table->foreign('evaluation_triggered_id')->references('id')->on('evaluation_triggered')->onDelete('cascade');
            $table->foreign('program_id')->references('id')->on('programs')->onDelete('cascade');
            $table->index('evaluation_triggered_id');
            $table->index('program_id');
            $table->index('notification_type');
            $table->index('status');
            $table->index('scheduled_at');
            $table->index('created_at');
        });

        // Bell notifications for admins
        Schema::create('evaluation_bell_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id'); // admin/super-admin receiving notification
            $table->uuid('evaluation_triggered_id')->nullable();
            $table->uuid('program_id');
            $table->string('notification_type'); // trigger, completion, missed_deadline
            $table->string('title');
            $table->text('message');
            $table->json('metadata')->nullable(); // evaluator, staff, form details
            $table->string('priority')->default('normal'); // normal, high, urgent
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->string('action_url')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('evaluation_triggered_id')->references('id')->on('evaluation_triggered')->onDelete('cascade');
            $table->foreign('program_id')->references('id')->on('programs')->onDelete('cascade');
            $table->index('user_id');
            $table->index('is_read');
            $table->index('notification_type');
            $table->index('created_at');
        });

        // Reminder schedules for evaluations
        Schema::create('evaluation_reminder_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('evaluation_triggered_id');
            $table->integer('days_before_deadline'); // 7, 3, 1 days
            $table->timestamp('scheduled_for');
            $table->string('status')->default('pending'); // pending, sent, skipped
            $table->timestamp('sent_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->foreign('evaluation_triggered_id')->references('id')->on('evaluation_triggered')->onDelete('cascade');
            $table->index('evaluation_triggered_id');
            $table->index('scheduled_for');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_reminder_schedules');
        Schema::dropIfExists('evaluation_bell_notifications');
        Schema::dropIfExists('evaluation_notification_logs');
        Schema::dropIfExists('evaluation_notification_configs');
    }
};
