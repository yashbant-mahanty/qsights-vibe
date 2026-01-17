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
        Schema::create('cms_content', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('page_key')->unique(); // 'contact_sales', 'request_demo', 'contact_us', 'privacy_policy', 'terms_of_service'
            $table->string('title');
            $table->text('description')->nullable();
            $table->longText('content')->nullable(); // For rich-text content (Privacy/Terms)
            $table->json('form_fields')->nullable(); // Labels, placeholders for forms
            $table->json('messages')->nullable(); // Success/error messages
            $table->string('cta_text')->nullable();
            $table->string('cta_link')->nullable();
            $table->timestamp('last_updated_date')->nullable(); // For Privacy/Terms
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Add copyright to app_settings via update
        DB::table('app_settings')->updateOrInsert(
            ['key' => 'copyright_text'],
            ['value' => '© 2025 QSights. All rights reserved.', 'updated_at' => now(), 'created_at' => now()]
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cms_content');
        DB::table('app_settings')->where('key', 'copyright_text')->delete();
    }
};
