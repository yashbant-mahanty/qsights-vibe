<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Add comment support to questions and answers:
     * - is_comment_enabled: Allow admin to enable comment box per question
     * - comment_text: Store participant's comment for the question
     * - commented_at: Timestamp when comment was added
     */
    public function up(): void
    {
        // Add is_comment_enabled to questions table
        Schema::table('questions', function (Blueprint $table) {
            $table->boolean('is_comment_enabled')->default(false)->after('is_required');
        });

        // Add comment_text and commented_at to answers table
        Schema::table('answers', function (Blueprint $table) {
            $table->text('comment_text')->nullable()->after('value_translations');
            $table->timestamp('commented_at')->nullable()->after('comment_text');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn('is_comment_enabled');
        });

        Schema::table('answers', function (Blueprint $table) {
            $table->dropColumn(['comment_text', 'commented_at']);
        });
    }
};
