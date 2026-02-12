<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds video-specific fields to questions table to support VIDEO question type
     */
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            // Video-specific fields
            $table->text('video_url')->nullable()->after('settings');
            $table->text('video_thumbnail_url')->nullable()->after('video_url');
            $table->integer('video_duration_seconds')->nullable()->after('video_thumbnail_url');
            $table->boolean('is_mandatory_watch')->default(false)->after('video_duration_seconds');
            $table->enum('video_play_mode', ['inline', 'new_tab'])->default('inline')->after('is_mandatory_watch');
        });

        // Update the question type constraint to include 'video'
        DB::statement("ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check");
        DB::statement("ALTER TABLE questions ADD CONSTRAINT questions_type_check CHECK (type IN (
            'text', 'textarea', 'number', 'email', 'phone', 'url',
            'radio', 'checkbox', 'select', 'multiselect',
            'rating', 'scale', 'date', 'time', 'datetime',
            'file', 'yesno', 'matrix', 'information', 'video'
        ))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn([
                'video_url',
                'video_thumbnail_url',
                'video_duration_seconds',
                'is_mandatory_watch',
                'video_play_mode'
            ]);
        });

        // Revert the type constraint
        DB::statement("ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check");
        DB::statement("ALTER TABLE questions ADD CONSTRAINT questions_type_check CHECK (type IN (
            'text', 'textarea', 'number', 'email', 'phone', 'url',
            'radio', 'checkbox', 'select', 'multiselect',
            'rating', 'scale', 'date', 'time', 'datetime',
            'file', 'yesno', 'matrix', 'information'
        ))");
    }
};
