<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * This migration adds hierarchical deactivation logic through Model Observers.
     * When a parent entity is deactivated, all child entities are automatically deactivated:
     * 
     * Organization (inactive) → Group Heads → Programs → Participants, Questionnaires, Activities
     * Group Head (inactive) → Programs → Participants, Questionnaires, Activities
     * Program (inactive) → Participants, Questionnaires, Activities
     * Participant (inactive) → Responses
     * 
     * The logic is implemented in:
     * - app/Observers/OrganizationObserver.php
     * - app/Observers/GroupHeadObserver.php
     * - app/Observers/ProgramObserver.php
     * - app/Observers/ParticipantObserver.php
     * 
     * And registered in app/Providers/AppServiceProvider.php
     */
    public function up(): void
    {
        // Logic is handled by Model Observers, no database schema changes needed
        // This migration serves as documentation for the hierarchical deactivation feature
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No schema changes to reverse
    }
};
