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
            $table->id();
            $table->uuid('program_id');
            $table->string('parent_role_id'); // Role name/identifier
            $table->uuid('parent_user_id'); // Manager user ID
            $table->string('child_role_id'); // Role name/identifier
            $table->uuid('child_user_id'); // Team member user ID
            $table->timestamps();

            // Foreign keys
            $table->foreign('program_id')->references('id')->on('programs')->onDelete('cascade');
            $table->foreign('parent_user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('child_user_id')->references('id')->on('users')->onDelete('cascade');

            // Unique constraint: One manager per user per program
            $table->unique(['child_user_id', 'program_id'], 'unique_child_per_program');

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
