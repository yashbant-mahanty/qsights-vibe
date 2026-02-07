<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->boolean('is_guest')->default(false)->after('status');
            $table->uuid('guest_code')->nullable()->unique()->after('is_guest');
            $table->index('is_guest');
        });
    }

    public function down(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->dropIndex(['is_guest']);
            $table->dropColumn(['is_guest', 'guest_code']);
        });
    }
};
