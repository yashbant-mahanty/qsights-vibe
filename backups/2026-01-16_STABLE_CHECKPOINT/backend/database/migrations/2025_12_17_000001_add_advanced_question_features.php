<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            // Add parent_question_id for nested/conditional questions
            $table->uuid('parent_question_id')->nullable()->after('section_id');
            $table->string('parent_option_value')->nullable()->after('parent_question_id');
            
            // Add nesting level for multi-level conditional logic
            $table->integer('nesting_level')->default(0)->after('parent_option_value');
            
            // Add rich_text flag to indicate if content supports HTML formatting
            $table->boolean('is_rich_text')->default(false)->after('description');
            
            // Add formatted_title and formatted_description for rich text content
            $table->text('formatted_title')->nullable()->after('is_rich_text');
            $table->text('formatted_description')->nullable()->after('formatted_title');
            
            // Add foreign key for parent question
            $table->foreign('parent_question_id')
                  ->references('id')
                  ->on('questions')
                  ->onDelete('cascade');
                  
            $table->index('parent_question_id');
            $table->index('nesting_level');
        });

        // PostgreSQL doesn't support MODIFY COLUMN directly, so we need to alter the type constraint
        // First, drop the existing check constraint
        DB::statement("ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check");
        
        // Then recreate it with the new values including 'information'
        DB::statement("ALTER TABLE questions ADD CONSTRAINT questions_type_check CHECK (type IN (
            'text', 'textarea', 'number', 'email', 'phone', 'url',
            'radio', 'checkbox', 'select', 'multiselect',
            'rating', 'scale', 'date', 'time', 'datetime',
            'file', 'yesno', 'matrix', 'information'
        ))");
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropForeign(['parent_question_id']);
            $table->dropIndex(['parent_question_id']);
            $table->dropIndex(['nesting_level']);
            $table->dropColumn([
                'parent_question_id',
                'parent_option_value',
                'nesting_level',
                'is_rich_text',
                'formatted_title',
                'formatted_description'
            ]);
        });
        
        // Revert the type constraint to remove 'information'
        DB::statement("ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check");
        DB::statement("ALTER TABLE questions ADD CONSTRAINT questions_type_check CHECK (type IN (
            'text', 'textarea', 'number', 'email', 'phone', 'url',
            'radio', 'checkbox', 'select', 'multiselect',
            'rating', 'scale', 'date', 'time', 'datetime',
            'file', 'yesno', 'matrix'
        ))");
    }
};
