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
        Schema::create('role_service_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('role_name', 50)->unique();
            $table->text('description')->nullable();
            $table->jsonb('available_services');
            $table->boolean('is_system_role')->default(false);
            $table->boolean('allow_custom_services')->default(false);
            $table->timestamps();
            
            $table->index('role_name');
            $table->index('is_system_role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('role_service_definitions');
    }
};
