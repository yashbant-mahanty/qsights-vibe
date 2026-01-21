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
        if (!Schema::hasTable('evaluation_triggered')) {
            Schema::create('evaluation_triggered', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('organization_id');
                $table->string('template_id');
                $table->string('template_name');
                $table->json('template_questions');
                $table->uuid('evaluator_id');
                $table->string('evaluator_name');
                $table->string('evaluator_email');
                $table->json('subordinates');
                $table->integer('subordinates_count')->default(0);
                $table->string('access_token', 100);
                $table->json('responses')->nullable();
                $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
                $table->uuid('triggered_by');
                $table->timestamp('triggered_at');
                $table->timestamp('email_sent_at')->nullable();
                $table->timestamp('started_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
                
                $table->index('organization_id');
                $table->index('evaluator_id');
                $table->index('status');
                $table->index('access_token');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_triggered');
    }
};
