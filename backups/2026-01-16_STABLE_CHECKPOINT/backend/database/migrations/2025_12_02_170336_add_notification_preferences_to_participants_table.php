<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->boolean('email_notifications')->default(true)->after('status');
            $table->boolean('sms_notifications')->default(false)->after('email_notifications');
            $table->json('notification_preferences')->nullable()->after('sms_notifications');
        });
    }

    public function down(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->dropColumn(['email_notifications', 'sms_notifications', 'notification_preferences']);
        });
    }
};
