<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * This table tracks email events from SendGrid webhooks (delivered, opened, clicked, etc.)
     */
    public function up(): void
    {
        Schema::create('notification_events', function (Blueprint $table) {
            $table->id();
            $table->uuid('notification_id')->nullable(); // Links to notifications table
            $table->string('sendgrid_message_id')->nullable()->index(); // SendGrid message ID
            $table->string('event_type'); // delivered, opened, click, bounce, dropped, etc.
            $table->string('email')->index(); // Recipient email
            $table->string('participant_id')->nullable()->index(); // Participant who received it (as string to avoid type conflicts)
            $table->string('user_id')->nullable()->index(); // User who received it (as string to avoid type conflicts)
            $table->string('program_name')->nullable(); // Program name
            $table->string('program_id')->nullable()->index(); // Program ID (as string)
            $table->string('activity_name')->nullable(); // Activity/Event name
            $table->string('activity_id')->nullable(); // Activity/Event ID (as string)
            $table->timestamp('event_timestamp'); // When the event occurred
            $table->string('ip_address')->nullable(); // IP address from event
            $table->string('user_agent')->nullable(); // User agent from event
            $table->text('url')->nullable(); // Clicked URL (for click events)
            $table->text('reason')->nullable(); // Bounce/drop reason
            $table->json('raw_data')->nullable(); // Full webhook payload
            $table->timestamps();

            // Indexes for efficient queries
            $table->index(['notification_id', 'event_type']);
            $table->index(['email', 'event_type']);
            $table->index(['participant_id', 'event_type']);
            $table->index(['event_timestamp']);
            $table->index('created_at');

            // Foreign keys (nullable to not break if parent is deleted) - removed to avoid type conflicts
            // We'll use soft references via string IDs instead of foreign keys
        });

        // Add index for SendGrid message ID lookups
        Schema::table('notifications', function (Blueprint $table) {
            if (!Schema::hasColumn('notifications', 'sendgrid_message_id')) {
                $table->string('sendgrid_message_id')->nullable()->after('status');
                $table->index('sendgrid_message_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            if (Schema::hasColumn('notifications', 'sendgrid_message_id')) {
                $table->dropIndex(['sendgrid_message_id']);
                $table->dropColumn('sendgrid_message_id');
            }
        });

        Schema::dropIfExists('notification_events');
    }
};
