<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notification_templates', function (Blueprint $table) {
            // Add activity_id if it doesn't exist
            if (!Schema::hasColumn('notification_templates', 'activity_id')) {
                $table->uuid('activity_id')->after('id');
                $table->foreign('activity_id')->references('id')->on('activities')->onDelete('cascade');
            }
            
            // Add body_html if it doesn't exist
            if (!Schema::hasColumn('notification_templates', 'body_html')) {
                $table->text('body_html')->after('subject');
            }
            
            // Add body_text if it doesn't exist
            if (!Schema::hasColumn('notification_templates', 'body_text')) {
                $table->text('body_text')->nullable()->after('body_html');
            }
            
            // Add is_active if it doesn't exist
            if (!Schema::hasColumn('notification_templates', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('body_text');
            }
            
            // Add placeholders if it doesn't exist
            if (!Schema::hasColumn('notification_templates', 'placeholders')) {
                $table->json('placeholders')->nullable()->after('is_active');
            }
        });
    }

    public function down(): void
    {
        Schema::table('notification_templates', function (Blueprint $table) {
            if (Schema::hasColumn('notification_templates', 'activity_id')) {
                $table->dropForeign(['activity_id']);
                $table->dropColumn('activity_id');
            }
            if (Schema::hasColumn('notification_templates', 'body_html')) {
                $table->dropColumn('body_html');
            }
            if (Schema::hasColumn('notification_templates', 'body_text')) {
                $table->dropColumn('body_text');
            }
            if (Schema::hasColumn('notification_templates', 'is_active')) {
                $table->dropColumn('is_active');
            }
            if (Schema::hasColumn('notification_templates', 'placeholders')) {
                $table->dropColumn('placeholders');
            }
        });
    }
};
