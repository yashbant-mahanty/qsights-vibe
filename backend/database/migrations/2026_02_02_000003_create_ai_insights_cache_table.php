<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates ai_insights_cache table for caching AI-generated insights
     */
    public function up(): void
    {
        Schema::create('ai_insights_cache', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('activity_id');
            $table->unsignedBigInteger('question_id')->nullable(); // Null = activity-level insights
            
            // Insight details
            $table->enum('insight_type', [
                'trend',
                'sentiment',
                'anomaly',
                'completion_pattern',
                'correlation',
                'segment_comparison',
                'summary'
            ]);
            $table->string('title');
            $table->text('description');
            $table->json('data')->nullable(); // Supporting data/metrics
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->decimal('confidence_score', 5, 2)->default(0.00); // 0-100
            
            // Cache metadata
            $table->timestamp('computed_at')->useCurrent();
            $table->timestamp('expires_at')->nullable(); // For cache invalidation
            $table->integer('response_count_at_computation')->default(0);
            
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys
            $table->foreign('activity_id')->references('id')->on('activities')->onDelete('cascade');
            $table->foreign('question_id')->references('id')->on('questions')->onDelete('cascade');
            
            // Indexes
            $table->index('activity_id');
            $table->index('question_id');
            $table->index('insight_type');
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_insights_cache');
    }
};
