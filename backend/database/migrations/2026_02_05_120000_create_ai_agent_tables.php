<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for AI Report Agent feature
     * 
     * Creates three tables:
     * 1. ai_query_cache - Cache frequently asked queries
     * 2. ai_conversation_history - Store conversation threads
     * 3. ai_query_logs - Track all queries for analytics
     */
    public function up(): void
    {
        // AI Query Cache Table
        Schema::create('ai_query_cache', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('activity_id');
            $table->uuid('program_id')->nullable();
            $table->text('query_text'); // User's question
            $table->string('query_hash', 64)->unique(); // Hash for quick lookup
            $table->string('intent')->nullable(); // e.g., 'count', 'trend', 'comparison'
            $table->json('filters')->nullable(); // Applied filters
            $table->json('result_data'); // Cached result
            $table->string('chart_type')->nullable(); // 'bar', 'pie', 'line', 'table'
            $table->text('summary')->nullable(); // AI-generated summary
            $table->integer('hit_count')->default(1); // How many times this query was requested
            $table->timestamp('last_accessed_at');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            
            // Foreign keys
            $table->foreign('activity_id')
                  ->references('id')
                  ->on('activities')
                  ->onDelete('cascade');
            
            $table->foreign('program_id')
                  ->references('id')
                  ->on('programs')
                  ->onDelete('cascade');
            
            // Indexes
            $table->index('query_hash');
            $table->index(['activity_id', 'query_hash']);
            $table->index('last_accessed_at');
            $table->index('hit_count');
        });

        // AI Conversation History Table
        Schema::create('ai_conversation_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id'); // Changed from uuid to bigInteger
            $table->string('session_id', 64); // Browser session
            $table->uuid('activity_id')->nullable();
            $table->uuid('program_id')->nullable();
            $table->text('user_message');
            $table->text('ai_response');
            $table->json('context')->nullable(); // Previous messages for context
            $table->json('extracted_intent')->nullable(); // Intent analysis
            $table->json('query_result')->nullable(); // The data returned
            $table->string('chart_type')->nullable();
            $table->json('metadata')->nullable(); // Response time, tokens used, etc.
            $table->boolean('was_helpful')->nullable(); // User feedback
            $table->text('user_feedback')->nullable();
            $table->timestamps();
            
            // Foreign keys
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
            
            $table->foreign('activity_id')
                  ->references('id')
                  ->on('activities')
                  ->onDelete('cascade');
            
            $table->foreign('program_id')
                  ->references('id')
                  ->on('programs')
                  ->onDelete('cascade');
            
            // Indexes
            $table->index(['user_id', 'session_id']);
            $table->index('activity_id');
            $table->index('created_at');
        });

        // AI Query Logs Table (for analytics and monitoring)
        Schema::create('ai_query_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id'); // Changed from uuid to bigInteger
            $table->uuid('activity_id')->nullable();
            $table->uuid('program_id')->nullable();
            $table->text('query_text');
            $table->string('status'); // 'success', 'error', 'cached'
            $table->integer('response_time_ms')->nullable(); // Performance tracking
            $table->integer('tokens_used')->nullable(); // OpenAI token usage
            $table->decimal('cost_usd', 10, 6)->nullable(); // API cost
            $table->string('model_used')->nullable(); // e.g., 'gpt-4o-mini'
            $table->text('error_message')->nullable();
            $table->json('filters_applied')->nullable();
            $table->timestamps();
            
            // Foreign keys
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
            
            $table->foreign('activity_id')
                  ->references('id')
                  ->on('activities')
                  ->onDelete('cascade');
            
            $table->foreign('program_id')
                  ->references('id')
                  ->on('programs')
                  ->onDelete('cascade');
            
            // Indexes
            $table->index('user_id');
            $table->index('activity_id');
            $table->index('status');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_query_logs');
        Schema::dropIfExists('ai_conversation_history');
        Schema::dropIfExists('ai_query_cache');
    }
};
