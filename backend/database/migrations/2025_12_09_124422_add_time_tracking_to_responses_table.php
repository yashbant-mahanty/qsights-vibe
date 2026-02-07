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
        Schema::table('responses', function (Blueprint $table) {
            $table->timestamp('time_expired_at')->nullable()->after('started_at')->comment('When time limit expired');
            $table->boolean('auto_submitted')->default(false)->after('time_expired_at')->comment('Was auto-submitted due to time limit');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('responses', function (Blueprint $table) {
            $table->dropColumn(['time_expired_at', 'auto_submitted']);
        });
    }
};
