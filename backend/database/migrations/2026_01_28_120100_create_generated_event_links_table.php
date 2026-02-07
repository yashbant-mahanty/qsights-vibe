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
        Schema::create('generated_event_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('activity_id');
            $table->uuid('group_id')->nullable();
            $table->string('tag', 50); // e.g., BQ-001
            $table->string('token', 255)->unique(); // Secure token for URL
            $table->enum('link_type', ['registration', 'anonymous'])->default('registration');
            $table->enum('status', ['unused', 'used', 'expired', 'disabled'])->default('unused');
            $table->unsignedBigInteger('created_by'); // Foreign key to users.id (bigint)
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('used_at')->nullable();
            $table->unsignedBigInteger('used_by_participant_id')->nullable(); // Foreign key to participants.id (bigint)
            $table->uuid('response_id')->nullable(); // Foreign key to responses.id (UUID)
            $table->timestamp('expires_at')->nullable();
            $table->json('metadata')->nullable();

            // Foreign keys
            $table->foreign('activity_id')
                ->references('id')
                ->on('activities')
                ->onDelete('cascade');

            $table->foreign('group_id')
                ->references('id')
                ->on('generated_link_groups')
                ->onDelete('set null');

            $table->foreign('created_by')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('used_by_participant_id')
                ->references('id')
                ->on('participants')
                ->onDelete('set null');

            $table->foreign('response_id')
                ->references('id')
                ->on('responses')
                ->onDelete('set null');

            // Composite unique constraint: One tag per activity
            $table->unique(['activity_id', 'tag']);

            // Indexes for performance
            $table->index('status');
            $table->index('token');
            $table->index(['activity_id', 'group_id']);
            $table->index(['activity_id', 'status']);
            $table->index('created_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('generated_event_links');
    }
};
