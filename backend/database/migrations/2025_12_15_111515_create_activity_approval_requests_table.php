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
        Schema::create('activity_approval_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('program_id');
            $table->uuid('questionnaire_id')->nullable();
            $table->uuid('requested_by'); // User ID who requested
            $table->uuid('reviewed_by')->nullable(); // Super Admin who reviewed
            
            // Activity details (same as activities table)
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('type', ['survey', 'poll', 'assessment'])->default('survey');
            $table->dateTime('start_date')->nullable();
            $table->dateTime('end_date')->nullable();
            $table->dateTime('close_date')->nullable();
            $table->boolean('allow_guests')->default(false);
            $table->boolean('is_multilingual')->default(false);
            $table->json('languages')->nullable();
            $table->json('settings')->nullable();
            $table->json('registration_form_fields')->nullable();
            $table->json('landing_config')->nullable();
            
            // Time limit and assessment settings
            $table->boolean('time_limit_enabled')->default(false);
            $table->integer('time_limit_minutes')->nullable();
            $table->decimal('pass_percentage', 5, 2)->nullable();
            $table->integer('max_retakes')->nullable();
            
            // Approval workflow
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('remarks')->nullable(); // Super Admin remarks
            $table->dateTime('reviewed_at')->nullable();
            $table->uuid('created_activity_id')->nullable(); // Reference to created activity after approval
            
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys
            $table->foreign('program_id')->references('id')->on('programs')->onDelete('cascade');
            $table->foreign('questionnaire_id')->references('id')->on('questionnaires')->onDelete('set null');
            $table->foreign('requested_by')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('reviewed_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('created_activity_id')->references('id')->on('activities')->onDelete('set null');
            
            // Indexes
            $table->index('status');
            $table->index('program_id');
            $table->index('requested_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_approval_requests');
    }
};
