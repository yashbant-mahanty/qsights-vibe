<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('evaluation_departments')) {
            Schema::create('evaluation_departments', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('name');
                $table->string('code', 50)->nullable();
                $table->text('description')->nullable();
                $table->uuid('organization_id');
                $table->uuid('program_id')->nullable();
                $table->boolean('is_active')->default(true);
                $table->uuid('created_by')->nullable();
                $table->timestamps();
                $table->softDeletes();
                
                $table->index('organization_id');
                $table->index('is_active');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_departments');
    }
};
