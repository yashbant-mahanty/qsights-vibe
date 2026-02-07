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
        Schema::create('theme_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key')->unique(); // 'logo', 'favicon', 'primary_color', etc.
            $table->text('value')->nullable(); // JSON or plain text value
            $table->string('type')->default('text'); // text, image, color, json
            $table->string('category')->default('general'); // general, branding, colors, fonts
            $table->timestamps();
        });

        Schema::create('landing_pages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique(); // 'home', 'features', 'benefits', 'compliance'
            $table->string('title');
            $table->longText('content')->nullable(); // JSON content structure
            $table->json('meta_data')->nullable(); // SEO meta tags, etc.
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('landing_page_sections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('landing_page_id');
            $table->string('section_type'); // hero, features, testimonials, cta, etc.
            $table->string('title')->nullable();
            $table->text('subtitle')->nullable();
            $table->longText('content')->nullable();
            $table->json('images')->nullable(); // Array of image URLs
            $table->json('settings')->nullable(); // Background color, layout, etc.
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('landing_page_id')
                  ->references('id')
                  ->on('landing_pages')
                  ->onDelete('cascade');
        });

        Schema::create('demo_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('country');
            $table->string('city');
            $table->text('message')->nullable();
            $table->string('status')->default('pending'); // pending, contacted, closed
            $table->timestamp('contacted_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('landing_page_sections');
        Schema::dropIfExists('landing_pages');
        Schema::dropIfExists('demo_requests');
        Schema::dropIfExists('theme_settings');
    }
};
