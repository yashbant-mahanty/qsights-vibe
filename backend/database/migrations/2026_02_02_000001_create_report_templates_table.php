<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates report_templates table for storing custom report configurations
     */
    public function up(): void
    {
        Schema::create('report_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('activity_id')->nullable(); // Null = global template
            $table->uuid('program_id')->nullable();
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('created_by'); // User who created the template
            
            // Template details
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('type', [
                'custom',
                'executive_summary', 
                'question_analysis',
                'participation_report',
                'sentiment_dashboard',
                'comparison_report',
                'delphi_consensus'
            ])->default('custom');
            
            // Template configuration (JSON)
            $table->json('config')->nullable(); // Layout, widgets, chart types, etc.
            $table->json('filters')->nullable(); // Default filters
            $table->json('ai_insights_config')->nullable(); // AI settings
            
            // Template metadata
            $table->boolean('is_public')->default(false); // Shareable across org
            $table->boolean('is_default')->default(false); // Default for activity type
            $table->integer('usage_count')->default(0); // Track popularity
            
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys
            $table->foreign('activity_id')->references('id')->on('activities')->onDelete('cascade');
            $table->foreign('program_id')->references('id')->on('programs')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            
            // Indexes
            $table->index('activity_id');
            $table->index('program_id');
            $table->index('organization_id');
            $table->index('type');
            $table->index('is_public');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_templates');
    }
};
