<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('program_role_id')->nullable()->after('program_id');
            $table->foreign('program_role_id')
                  ->references('id')
                  ->on('program_roles')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['program_role_id']);
            $table->dropColumn('program_role_id');
        });
    }
};
