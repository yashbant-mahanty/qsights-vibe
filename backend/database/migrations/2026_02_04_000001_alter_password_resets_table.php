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
        // Check if the table has the old schema (token column) or new schema (otp_hash column)
        $hasToken = Schema::hasColumn('password_resets', 'token');
        $hasOtpHash = Schema::hasColumn('password_resets', 'otp_hash');
        $hasId = Schema::hasColumn('password_resets', 'id');
        
        if ($hasToken && !$hasOtpHash) {
            // Old Laravel schema - need to update
            Schema::table('password_resets', function (Blueprint $table) {
                // Drop old token column
                $table->dropColumn('token');
            });
            
            Schema::table('password_resets', function (Blueprint $table) {
                // Add new columns
                $table->uuid('id')->nullable()->first();
                $table->string('otp_hash')->after('email');
                $table->timestamp('expires_at')->nullable()->after('otp_hash');
                $table->boolean('used')->default(false)->after('expires_at');
                $table->timestamp('updated_at')->nullable();
            });
            
            // Set IDs for existing records
            DB::statement('UPDATE password_resets SET id = gen_random_uuid() WHERE id IS NULL');
            
            // Make id primary key
            Schema::table('password_resets', function (Blueprint $table) {
                $table->uuid('id')->nullable(false)->change();
            });
        }
        
        // If table doesn't exist at all, create it
        if (!Schema::hasTable('password_resets')) {
            Schema::create('password_resets', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('email')->index();
                $table->string('otp_hash');
                $table->timestamp('expires_at');
                $table->boolean('used')->default(false);
                $table->timestamps();
                $table->index('expires_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('password_resets', 'otp_hash')) {
            Schema::table('password_resets', function (Blueprint $table) {
                $table->dropColumn(['id', 'otp_hash', 'expires_at', 'used', 'updated_at']);
            });
            
            Schema::table('password_resets', function (Blueprint $table) {
                $table->string('token');
            });
        }
    }
};
