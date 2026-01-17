<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('participant_program', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('participant_id');
            $table->uuid('program_id');
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamps();
            
            $table->foreign('participant_id')
                  ->references('id')
                  ->on('participants')
                  ->onDelete('cascade');
                  
            $table->foreign('program_id')
                  ->references('id')
                  ->on('programs')
                  ->onDelete('cascade');
            
            // Ensure unique participant-program combinations
            $table->unique(['participant_id', 'program_id']);
            $table->index('participant_id');
            $table->index('program_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('participant_program');
    }
};
