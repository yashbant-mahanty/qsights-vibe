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
        Schema::create('generated_link_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('activity_id');
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->integer('total_links')->default(0);
            $table->integer('used_links')->default(0);
            $table->timestamps();

            // Foreign keys
            $table->foreign('activity_id')
                ->references('id')
                ->on('activities')
                ->onDelete('cascade');

            // Unique constraint: One group name per activity
            $table->unique(['activity_id', 'name']);
            
            // Indexes
            $table->index('activity_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('generated_link_groups');
    }
};
