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
        Schema::create('temporary_submissions', function (Blueprint $table) {
            $table->id();
            $table->uuid('activity_id');
            $table->foreign('activity_id')->references('id')->on('activities')->onDelete('cascade');
            $table->string('session_token', 255)->unique()->index();
            $table->json('responses');
            $table->json('metadata')->nullable()->comment('Start time, language, etc.');
            $table->unsignedBigInteger('linked_to_participant_id')->nullable();
            $table->foreign('linked_to_participant_id')->references('id')->on('participants')->onDelete('set null');
            $table->enum('status', ['pending', 'linked', 'expired'])->default('pending')->index();
            $table->timestamp('expires_at')->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('temporary_submissions');
    }
};
