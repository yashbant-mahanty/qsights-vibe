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
        Schema::table('temporary_submissions', function (Blueprint $table) {
            // Store the tag from generated link for post-submission flow
            $table->string('generated_link_tag', 50)->nullable()->after('participant_id');
            
            // Index for lookup
            $table->index('generated_link_tag');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('temporary_submissions', function (Blueprint $table) {
            $table->dropIndex(['generated_link_tag']);
            $table->dropColumn('generated_link_tag');
        });
    }
};
