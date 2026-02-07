<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_participant', function (Blueprint $table) {
            $table->id();
            $table->uuid('activity_id');
            $table->uuid('participant_id');
            $table->timestamp('joined_at')->useCurrent();
            $table->timestamps();

            $table->foreign('activity_id')->references('id')->on('activities')->onDelete('cascade');
            $table->foreign('participant_id')->references('id')->on('participants')->onDelete('cascade');
            $table->unique(['activity_id', 'participant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_participant');
    }
};
