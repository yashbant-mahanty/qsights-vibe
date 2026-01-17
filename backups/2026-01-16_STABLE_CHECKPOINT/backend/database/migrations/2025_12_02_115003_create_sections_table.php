<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('questionnaire_id');
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('order')->default(0);
            $table->json('conditional_logic')->nullable(); // Show/hide based on conditions
            $table->json('translations')->nullable(); // Multilingual translations
            $table->timestamps();
            $table->softDeletes();
            
            $table->foreign('questionnaire_id')
                  ->references('id')
                  ->on('questionnaires')
                  ->onDelete('cascade');
                  
            $table->index('questionnaire_id');
            $table->index('order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sections');
    }
};
