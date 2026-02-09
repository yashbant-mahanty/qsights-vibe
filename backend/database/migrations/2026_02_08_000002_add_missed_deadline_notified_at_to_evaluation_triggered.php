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
        Schema::table('evaluation_triggered', function (Blueprint $table) {
            $table->timestamp('missed_deadline_notified_at')->nullable()->after('email_sent_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evaluation_triggered', function (Blueprint $table) {
            $table->dropColumn('missed_deadline_notified_at');
        });
    }
};
