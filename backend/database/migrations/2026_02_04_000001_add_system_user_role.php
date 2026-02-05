<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add 'system-user' to the users_role_check constraint
        DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super-admin', 'admin', 'group-head', 'Group Head', 'program-admin', 'program-manager', 'program-moderator', 'evaluation-admin', 'evaluation_staff', 'participant', 'system-user'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to previous constraint without 'system-user'
        DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super-admin', 'admin', 'group-head', 'Group Head', 'program-admin', 'program-manager', 'program-moderator', 'evaluation-admin', 'evaluation_staff', 'participant'))");
    }
};
