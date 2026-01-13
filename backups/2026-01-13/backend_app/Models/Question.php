<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Question extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'section_id',
        'parent_question_id',
        'parent_option_value',
        'nesting_level',
        'type',
        'title',
        'description',
        'is_rich_text',
        'formatted_title',
        'formatted_description',
        'options',
        'validations',
        'conditional_logic',
        'settings',
        'translations',
        'is_required',
        'order',
    ];

    protected $casts = [
        'options' => 'array',
        'validations' => 'array',
        'conditional_logic' => 'array',
        'settings' => 'array',
        'translations' => 'array',
        'is_required' => 'boolean',
        'is_rich_text' => 'boolean',
        'order' => 'integer',
        'nesting_level' => 'integer',
    ];

    /**
     * Get the section that owns the question
     */
    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    /**
     * Get the parent question (for nested/conditional questions)
     */
    public function parentQuestion()
    {
        return $this->belongsTo(Question::class, 'parent_question_id');
    }

    /**
     * Get child questions (nested follow-ups)
     */
    public function childQuestions()
    {
        return $this->hasMany(Question::class, 'parent_question_id')->orderBy('order');
    }

    /**
     * Scope to filter by type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to get only required questions
     */
    public function scopeRequired($query)
    {
        return $query->where('is_required', true);
    }

    /**
     * Scope to get root-level questions (no parent)
     */
    public function scopeRootLevel($query)
    {
        return $query->whereNull('parent_question_id');
    }

    /**
     * Scope to get nested questions
     */
    public function scopeNested($query)
    {
        return $query->whereNotNull('parent_question_id');
    }

    /**
     * Check if this is an information block
     */
    public function isInformationBlock()
    {
        return $this->type === 'information';
    }

    /**
     * Check if this question has conditional children
     */
    public function hasConditionalChildren()
    {
        return $this->childQuestions()->exists();
    }

    /**
     * Get all nested questions recursively
     */
    public function getAllNestedQuestions()
    {
        $children = $this->childQuestions;
        foreach ($children as $child) {
            $children = $children->merge($child->getAllNestedQuestions());
        }
        return $children;
    }
}
