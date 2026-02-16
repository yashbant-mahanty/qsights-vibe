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
        Schema::table('activities', function (Blueprint $table) {
            // Thank You Video Configuration
            $table->boolean('thankyou_video_enabled')->default(false);
            $table->text('thankyou_video_url')->nullable();
            $table->integer('thankyou_video_duration_seconds')->nullable();
            $table->text('thankyou_video_thumbnail_url')->nullable();
            $table->boolean('thankyou_video_mandatory')->default(false);
            $table->enum('thankyou_video_play_mode', ['inline', 'new_tab'])->default('inline');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn([
                'thankyou_video_enabled',
                'thankyou_video_url',
                'thankyou_video_duration_seconds',
                'thankyou_video_thumbnail_url',
                'thankyou_video_mandatory',
                'thankyou_video_play_mode'
            ]);
        });
    }
};
