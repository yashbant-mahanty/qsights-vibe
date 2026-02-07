<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('response_backups', function (Blueprint $table) {
            $table->id();
            $table->uuid('response_id');
            $table->uuid('activity_id');
            $table->uuid('participant_id')->nullable();
            $table->bigInteger('question_id'); // Match questions table schema
            
            // Answer data (same as answers table)
            $table->text('value')->nullable();
            $table->json('value_array')->nullable();
            $table->text('file_path')->nullable();
            $table->json('value_translations')->nullable();
            
            // Metadata
            $table->integer('time_spent')->nullable();
            $table->integer('revision_count')->default(0);
            $table->string('participant_type')->nullable(); // 'registered', 'guest', 'anonymous'
            $table->text('participant_email')->nullable();
            $table->text('participant_name')->nullable();
            
            // Audit trail
            $table->timestamp('answered_at');
            $table->timestamps();
            
            // Indexes for quick lookups
            $table->index('response_id');
            $table->index('activity_id');
            $table->index('participant_id');
            $table->index('question_id');
            $table->index('created_at');
            
            // Foreign keys
            $table->foreign('response_id')->references('id')->on('responses')->onDelete('cascade');
            $table->foreign('activity_id')->references('id')->on('activities')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('response_backups');
    }
};
