<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates report_snapshots table for storing generated report data at a point in time
     */
    public function up(): void
    {
        Schema::create('report_snapshots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('report_template_id');
            $table->uuid('activity_id');
            $table->unsignedBigInteger('generated_by');
            
            // Snapshot details
            $table->string('name');
            $table->timestamp('snapshot_date')->useCurrent();
            $table->json('data')->nullable(); // Cached report data
            $table->json('ai_insights')->nullable(); // AI-generated insights at snapshot time
            
            // Metadata
            $table->integer('total_responses')->default(0);
            $table->json('filters_applied')->nullable();
            $table->string('export_format')->nullable(); // pdf, excel, pptx, html
            $table->string('file_path')->nullable(); // If exported to file
            
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys
            $table->foreign('report_template_id')->references('id')->on('report_templates')->onDelete('cascade');
            $table->foreign('activity_id')->references('id')->on('activities')->onDelete('cascade');
            $table->foreign('generated_by')->references('id')->on('users')->onDelete('cascade');
            
            // Indexes
            $table->index('report_template_id');
            $table->index('activity_id');
            $table->index('snapshot_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_snapshots');
    }
};
