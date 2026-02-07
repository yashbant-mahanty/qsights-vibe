<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Make organization_id nullable since we're using program_id now
        DB::statement('ALTER TABLE evaluation_triggered ALTER COLUMN organization_id DROP NOT NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Make organization_id not null again
        DB::statement('ALTER TABLE evaluation_triggered ALTER COLUMN organization_id SET NOT NULL');
    }
};
