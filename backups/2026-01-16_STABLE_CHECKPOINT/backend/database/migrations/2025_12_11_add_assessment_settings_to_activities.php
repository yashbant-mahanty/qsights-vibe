<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            // Pass percentage for assessments (e.g., 80.00 means 80%)
            $table->decimal('pass_percentage', 5, 2)->nullable()->after('settings');
            
            // Maximum number of retakes allowed (null = unlimited, 0 = no retakes, 1+ = limited retakes)
            $table->integer('max_retakes')->nullable()->after('pass_percentage');
        });
        
        Schema::table('responses', function (Blueprint $table) {
            // Track which attempt number this is (1 = first attempt, 2 = first retake, etc.)
            $table->integer('attempt_number')->default(1)->after('status');
            
            // Store the calculated score for assessments
            $table->decimal('score', 5, 2)->nullable()->after('completion_percentage');
            
            // Pass/Fail status for assessments
            $table->enum('assessment_result', ['pass', 'fail', 'pending'])->nullable()->after('score');
            
            // Number of correct answers
            $table->integer('correct_answers_count')->nullable()->after('assessment_result');
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn(['pass_percentage', 'max_retakes']);
        });
        
        Schema::table('responses', function (Blueprint $table) {
            $table->dropColumn(['attempt_number', 'score', 'assessment_result', 'correct_answers_count']);
        });
    }
};
