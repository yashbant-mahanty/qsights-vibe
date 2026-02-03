<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('evaluation_custom_questionnaires', function (Blueprint $table) {
            $table->uuid('program_id')->nullable()->after('organization_id');
            
            $table->index('program_id');
        });
    }

    public function down()
    {
        Schema::table('evaluation_custom_questionnaires', function (Blueprint $table) {
            $table->dropIndex(['program_id']);
            $table->dropColumn('program_id');
        });
    }
};
