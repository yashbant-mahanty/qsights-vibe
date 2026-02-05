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
        Schema::table('program_roles', function (Blueprint $table) {
            // Add allowed_program_ids column for system users
            // NULL = All Programs access
            // ["uuid1", "uuid2"] = Selected Programs only
            $table->json('allowed_program_ids')->nullable()->after('services');
        });

        // Set all existing system users (program_id IS NULL) to have All Programs access
        \DB::statement("UPDATE program_roles SET allowed_program_ids = NULL WHERE program_id IS NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('program_roles', function (Blueprint $table) {
            $table->dropColumn('allowed_program_ids');
        });
    }
};
