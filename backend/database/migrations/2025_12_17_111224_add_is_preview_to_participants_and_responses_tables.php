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
        // Add is_preview flag to participants table
        Schema::table('participants', function (Blueprint $table) {
            $table->boolean('is_preview')->default(false)->after('is_guest');
            $table->string('preview_user_role')->nullable()->after('is_preview');
            $table->string('preview_user_email')->nullable()->after('preview_user_role');
        });
        
        // Add is_preview flag to responses table
        Schema::table('responses', function (Blueprint $table) {
            $table->boolean('is_preview')->default(false)->after('auto_submitted');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->dropColumn(['is_preview', 'preview_user_role', 'preview_user_email']);
        });
        
        Schema::table('responses', function (Blueprint $table) {
            $table->dropColumn('is_preview');
        });
    }
};
