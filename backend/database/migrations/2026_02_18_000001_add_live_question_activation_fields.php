<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add live question activation fields for Poll events.
     * Allows manual activation/deactivation of questions with individual timers.
     */
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->boolean('is_live_active')->default(false)->after('is_required');
            $table->integer('live_timer_seconds')->nullable()->after('is_live_active');
            $table->timestamp('live_activated_at')->nullable()->after('live_timer_seconds');
        });

        // IMPORTANT: Set ONLY poll questions to inactive (false) by default
        // This ensures questions in POLL activities start as inactive
        // Survey/Assessment/Evaluation questions are NOT affected
        $pollQuestionnaireIds = \DB::table('activities')
            ->where('type', 'poll')
            ->pluck('questionnaire_id');

        if ($pollQuestionnaireIds->isNotEmpty()) {
            $pollQuestionIds = \DB::table('sections')
                ->whereIn('sections.questionnaire_id', $pollQuestionnaireIds)
                ->join('questions', 'questions.section_id', '=', 'sections.id')
                ->pluck('questions.id');

            if ($pollQuestionIds->isNotEmpty()) {
                \DB::table('questions')
                    ->whereIn('id', $pollQuestionIds)
                    ->update([
                        'is_live_active' => false,
                        'live_activated_at' => null
                    ]);
            }
        }

        // Add index for faster polling queries
        Schema::table('questions', function (Blueprint $table) {
            $table->index('is_live_active');
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropIndex(['is_live_active']);
            $table->dropColumn(['is_live_active', 'live_timer_seconds', 'live_activated_at']);
        });
    }
};
