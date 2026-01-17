<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('questionnaires', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('program_id');
            $table->string('title');
            $table->text('description')->nullable();
            $table->boolean('is_multilingual')->default(false);
            $table->json('languages')->nullable();
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->dateTime('scheduled_start')->nullable();
            $table->dateTime('scheduled_end')->nullable();
            $table->json('settings')->nullable(); // Additional settings like allow_anonymous, show_progress, etc.
            $table->timestamps();
            $table->softDeletes();
            
            $table->foreign('program_id')
                  ->references('id')
                  ->on('programs')
                  ->onDelete('cascade');
                  
            $table->index('program_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questionnaires');
    }
};
