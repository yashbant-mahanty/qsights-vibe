<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates the notification_logs table for comprehensive notification tracking.
     * Tracks every notification sent through any channel with full status lifecycle.
     */
    public function up(): void
    {
        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            
            // Recipient identifiers (at least one should be present) - matching production types
            $table->unsignedBigInteger('user_id')->nullable(); // bigint in production
            $table->unsignedBigInteger('participant_id')->nullable(); // bigint in production
            $table->string('anonymous_token')->nullable(); // For anonymous/guest users
            $table->string('recipient_email')->nullable();
            $table->string('recipient_phone')->nullable();
            
            // Notification context
            $table->uuid('event_id')->nullable(); // Activity ID if related - uuid in production
            $table->unsignedBigInteger('questionnaire_id')->nullable(); // bigint in production
            $table->string('notification_type')->nullable(); // reminder, invitation, result, etc.
            
            // Channel and provider info
            $table->enum('channel', ['email', 'in-app', 'sms', 'push'])->default('email');
            $table->string('provider')->nullable(); // SendGrid, Twilio, FCM, etc.
            $table->string('provider_message_id')->nullable(); // Provider's tracking ID
            
            // Message content (for audit trail)
            $table->string('subject')->nullable();
            $table->text('message_preview')->nullable(); // First 500 chars
            $table->json('metadata')->nullable(); // Additional tracking data
            
            // Status tracking with timestamps
            $table->enum('status', [
                'queued',
                'sent',
                'delivered',
                'opened',
                'read',
                'clicked',
                'bounced',
                'failed',
                'unsubscribed'
            ])->default('queued');
            
            $table->timestamp('queued_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('clicked_at')->nullable();
            $table->timestamp('bounced_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            
            // Error tracking
            $table->text('error_message')->nullable();
            $table->integer('retry_count')->default(0);
            
            // Webhook data
            $table->json('webhook_events')->nullable(); // Store all webhook events received
            $table->timestamp('last_webhook_at')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
            
            $table->foreign('participant_id')
                  ->references('id')
                  ->on('participants')
                  ->onDelete('set null');
            
            $table->foreign('event_id')
                  ->references('id')
                  ->on('activities')
                  ->onDelete('set null');
            
            $table->foreign('questionnaire_id')
                  ->references('id')
                  ->on('questionnaires')
                  ->onDelete('set null');
            
            // Indexes for fast lookups
            $table->index('user_id');
            $table->index('participant_id');
            $table->index('anonymous_token');
            $table->index('recipient_email');
            $table->index('event_id');
            $table->index('channel');
            $table->index('provider');
            $table->index('provider_message_id');
            $table->index('status');
            $table->index('sent_at');
            $table->index('created_at');
            $table->index(['event_id', 'status']);
            $table->index(['participant_id', 'channel']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_logs');
    }
};
