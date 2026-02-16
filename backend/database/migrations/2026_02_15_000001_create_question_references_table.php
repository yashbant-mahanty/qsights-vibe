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
        Schema::create('question_references', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('question_id');
            $table->enum('reference_type', ['text', 'url'])->default('text');
            $table->string('title', 255)->nullable();
            $table->text('content_text')->nullable();
            $table->text('content_url')->nullable();
            $table->enum('display_position', ['AFTER_QUESTION', 'AFTER_ANSWER'])->default('AFTER_QUESTION');
            $table->integer('order_index')->default(0);
            $table->timestamps();

            $table->foreign('question_id')
                  ->references('id')
                  ->on('questions')
                  ->onDelete('cascade');

            $table->index('question_id');
            $table->index('display_position');
            $table->index('order_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('question_references');
    }
};
