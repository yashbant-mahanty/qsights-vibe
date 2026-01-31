<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * This table stores the custom questionnaires that have been added to the 
     * evaluation form for each organization. These questionnaires persist across
     * sessions and are always displayed in the "Select Evaluation Form" section.
     */
    public function up(): void
    {
        if (!Schema::hasTable('evaluation_custom_questionnaires')) {
            Schema::create('evaluation_custom_questionnaires', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('organization_id');
                $table->uuid('questionnaire_id');
                $table->string('questionnaire_name');
                $table->uuid('added_by'); // User who added this questionnaire to evaluation
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();
                
                $table->index('organization_id');
                $table->index('questionnaire_id');
                $table->unique(['organization_id', 'questionnaire_id'], 'unique_org_questionnaire');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_custom_questionnaires');
    }
};
