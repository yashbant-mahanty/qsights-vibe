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
        Schema::create('user_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', [
                'approval_request',
                'approval_pending', 
                'approval_approved',
                'approval_rejected',
                'activity_assigned',
                'activity_completed',
                'reminder',
                'event_update',
                'demo_request',
                'contact_sales'
            ]);
            $table->string('title');
            $table->text('message');
            $table->enum('entity_type', ['activity', 'event', 'approval', 'program', 'participant', 'demo_request', 'contact_sales']);
            $table->string('entity_id')->nullable();
            $table->string('entity_name')->nullable();
            $table->boolean('is_read')->default(false);
            $table->string('action_url')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'is_read']);
            $table->index(['user_id', 'created_at']);
            $table->index('type');
            $table->index('entity_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_notifications');
    }
};
