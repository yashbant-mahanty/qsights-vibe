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
        // Change triggered_by from uuid to bigInteger to match users.id
        DB::statement('ALTER TABLE evaluation_triggered ALTER COLUMN triggered_by TYPE bigint USING triggered_by::text::bigint');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Change back to uuid
        DB::statement('ALTER TABLE evaluation_triggered ALTER COLUMN triggered_by TYPE uuid USING triggered_by::text::uuid');
    }
};
