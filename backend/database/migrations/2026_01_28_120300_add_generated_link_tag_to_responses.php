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
            // Store the tag from generated link (e.g., BQ-001)
            $table->string('generated_link_tag', 50)->nullable()->after('is_preview');
            
            // Index for filtering/reporting
            $table->index('generated_link_tag');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('responses', function (Blueprint $table) {
            $table->dropIndex(['generated_link_tag']);
            $table->dropColumn('generated_link_tag');
        });
    }
};
