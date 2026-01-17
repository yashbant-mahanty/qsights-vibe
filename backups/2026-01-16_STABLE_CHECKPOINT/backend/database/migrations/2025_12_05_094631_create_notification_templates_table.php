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
        Schema::create('notification_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('activity_id');
            $table->string('notification_type'); // invitation, reminder, thank_you, program_expiry, activity_summary
            $table->string('subject');
            $table->text('body_html');
            $table->text('body_text')->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('placeholders')->nullable(); // Available placeholders info
            $table->timestamps();

            // Foreign key
            $table->foreign('activity_id')->references('id')->on('activities')->onDelete('cascade');
            
            // Unique constraint: one template per notification type per activity
            $table->unique(['activity_id', 'notification_type']);
            
            // Indexes
            $table->index('activity_id');
            $table->index('notification_type');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_templates');
    }
};
