<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            "users", "activities", "activity_approval_requests", "answers", 
            "group_heads", "notifications", "organizations", "participants", 
            "programs", "questions", "questionnaires", "responses", 
            "sections", "user_notifications"
        ];
        
        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName) && !Schema::hasColumn($tableName, "deleted_at")) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->softDeletes();
                });
            }
        }
    }

    public function down(): void
    {
        $tables = [
            "users", "activities", "activity_approval_requests", "answers", 
            "group_heads", "notifications", "organizations", "participants", 
            "programs", "questions", "questionnaires", "responses", 
            "sections", "user_notifications"
        ];
        
        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, "deleted_at")) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropSoftDeletes();
                });
            }
        }
    }
};
