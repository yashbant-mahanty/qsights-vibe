<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('section_id');
            $table->enum('type', [
                'text',           // Short text input
                'textarea',       // Long text input
                'number',         // Number input
                'email',          // Email input
                'phone',          // Phone input
                'url',            // URL input
                'radio',          // Single choice
                'checkbox',       // Multiple choice
                'select',         // Dropdown
                'multiselect',    // Multiple dropdown
                'rating',         // Star/numeric rating
                'scale',          // Linear scale (1-10)
                'date',           // Date picker
                'time',           // Time picker
                'datetime',       // Date and time
                'file',           // File upload
                'yesno',          // Yes/No toggle
                'matrix'          // Grid/matrix questions
            ]);
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('options')->nullable(); // For radio, checkbox, select (array of options)
            $table->json('validations')->nullable(); // min, max, regex, required, etc.
            $table->json('conditional_logic')->nullable(); // Show/hide based on other answers
            $table->json('settings')->nullable(); // Type-specific settings (min rating, max files, etc.)
            $table->json('translations')->nullable(); // Multilingual translations
            $table->boolean('is_required')->default(false);
            $table->integer('order')->default(0);
            $table->timestamps();
            $table->softDeletes();
            
            $table->foreign('section_id')
                  ->references('id')
                  ->on('sections')
                  ->onDelete('cascade');
                  
            $table->index('section_id');
            $table->index('type');
            $table->index('order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
