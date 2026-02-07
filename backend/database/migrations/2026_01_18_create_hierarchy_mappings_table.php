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
        Schema::create('hierarchy_mappings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('program_id');
            $table->string('parent_role_id');
            $table->uuid('parent_user_id');
            $table->string('child_role_id');
            $table->uuid('child_user_id');
            $table->timestamp('mapped_at');

            // Foreign keys
            $table->foreign('program_id')->references('id')->on('programs')->onDelete('cascade');
            $table->foreign('parent_user_id')->references('id')->on('program_roles')->onDelete('cascade');
            $table->foreign('child_user_id')->references('id')->on('program_roles')->onDelete('cascade');

            // Unique constraint: One manager per user per program
            $table->unique(['child_user_id', 'program_id'], 'unique_child_user_program');

            // Indexes for performance
            $table->index('program_id');
            $table->index('parent_user_id');
            $table->index('child_user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hierarchy_mappings');
    }
};
