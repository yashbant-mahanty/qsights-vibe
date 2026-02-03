<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Fix questionnaire_id to be integer (not UUID) to match questionnaires table
     */
    public function up(): void
    {
        // Drop the existing table and recreate with correct types
        Schema::dropIfExists('evaluation_custom_questionnaires');
        
        Schema::create('evaluation_custom_questionnaires', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->integer('organization_id')->nullable(); // Allow null for super-admin without org
            $table->integer('questionnaire_id'); // Changed from UUID to integer
            $table->string('questionnaire_name');
            $table->integer('added_by'); // User ID who added this questionnaire
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('organization_id');
            $table->index('questionnaire_id');
            $table->index('added_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_custom_questionnaires');
        
        // Restore original schema
        Schema::create('evaluation_custom_questionnaires', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('questionnaire_id');
            $table->string('questionnaire_name');
            $table->uuid('added_by');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('organization_id');
            $table->index('questionnaire_id');
            $table->unique(['organization_id', 'questionnaire_id'], 'unique_org_questionnaire');
        });
    }
};
