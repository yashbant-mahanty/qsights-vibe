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
        Schema::create('questionnaire_videos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('questionnaire_id');
            $table->text('video_url')->nullable(); // S3 video URL or external link
            $table->text('thumbnail_url')->nullable(); // S3 thumbnail URL
            $table->string('video_type')->default('intro'); // intro, section, etc
            $table->enum('display_mode', ['inline', 'modal'])->default('inline');
            $table->boolean('must_watch')->default(false); // Must watch before starting
            $table->boolean('autoplay')->default(false);
            $table->integer('video_duration_seconds')->nullable(); // For tracking purposes
            $table->string('created_by')->nullable(); // User ID who created
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys
            $table->foreign('questionnaire_id')
                  ->references('id')
                  ->on('questionnaires')
                  ->onDelete('cascade');
                  
            $table->index('questionnaire_id');
            $table->index('video_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('questionnaire_videos');
    }
};
