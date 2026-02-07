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
        Schema::create('evaluation_settings', function (Blueprint $table) {
            $table->id();
            $table->uuid('program_id');
            $table->string('setting_key', 100);
            $table->text('setting_value')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index(['program_id', 'setting_key']);
            $table->unique(['program_id', 'setting_key']);
            
            // Foreign key
            $table->foreign('program_id')
                  ->references('id')
                  ->on('programs')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_settings');
    }
};
