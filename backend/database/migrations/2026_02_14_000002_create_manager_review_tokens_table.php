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
        Schema::create('manager_review_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('approval_request_id');
            $table->bigInteger('manager_id')->unsigned()->nullable(); // User who is assigned as manager
            $table->string('manager_email'); // Email where token was sent
            $table->string('token_hash')->unique(); // Hashed token for security
            $table->timestamp('expires_at');
            $table->boolean('used')->default(false);
            $table->timestamp('used_at')->nullable();
            $table->ipAddress('used_from_ip')->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys
            $table->foreign('approval_request_id')
                ->references('id')
                ->on('activity_approval_requests')
                ->onDelete('cascade');
            
            // Indexes for performance
            $table->index(['token_hash', 'used', 'expires_at']);
            $table->index('approval_request_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('manager_review_tokens');
    }
};
