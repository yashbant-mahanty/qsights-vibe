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
        Schema::table('users', function (Blueprint $table) {
            // Add default_services column to store allowed services/pages for the role
            // This is a JSON array of allowed services
            $table->json('default_services')->nullable()->after('role');
        });

        // Set default services for existing program-moderator users
        DB::table('users')
            ->where('role', 'program-moderator')
            ->update([
                'default_services' => json_encode([
                    'dashboard',
                    'activities-view',
                    'reports-view',
                    'reports-export'
                ])
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('default_services');
        });
    }
};
