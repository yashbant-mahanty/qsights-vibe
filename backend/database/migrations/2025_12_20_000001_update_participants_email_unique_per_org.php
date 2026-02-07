<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            // Drop existing unique index on email if it exists
            $table->dropUnique(['email']);
            // Add composite unique constraint scoped to organization
            $table->unique(['email', 'organization_id'], 'participants_email_org_unique');
        });
    }

    public function down(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->dropUnique('participants_email_org_unique');
            $table->unique('email');
        });
    }
};
