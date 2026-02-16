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
        Schema::table('activity_approval_requests', function (Blueprint $table) {
            // Add manager review tracking fields
            $table->string('manager_review_status')->default('pending')->after('status')
                ->comment('pending, approved, not_required');
            $table->timestamp('manager_reviewed_at')->nullable()->after('reviewed_at');
            $table->bigInteger('manager_reviewed_by')->unsigned()->nullable()->after('manager_reviewed_at');
            $table->text('manager_review_notes')->nullable()->after('manager_reviewed_by');
            
            // Expected participants field (new requirement)
            $table->integer('expected_participants')->nullable()->after('number_of_participants');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_approval_requests', function (Blueprint $table) {
            // Drop columns
            $table->dropColumn([
                'manager_review_status',
                'manager_reviewed_at',
                'manager_reviewed_by',
                'manager_review_notes',
                'expected_participants'
            ]);
        });
    }
};
