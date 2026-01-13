<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Answer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'response_id',
        'question_id',
        'value',
        'value_array',
        'file_path',
        'value_translations',
        'time_spent',
        'revision_count',
    ];

    protected $casts = [
        'value_array' => 'array',
        'value_translations' => 'array',
        'time_spent' => 'integer',
        'revision_count' => 'integer',
    ];

    /**
     * Relationships
     */
    public function response()
    {
        return $this->belongsTo(Response::class);
    }

    public function question()
    {
        return $this->belongsTo(Question::class);
    }

    /**
     * Get the appropriate value based on question type
     */
    public function getValue()
    {
        if ($this->value_array) {
            return $this->value_array;
        }
        
        if ($this->file_path) {
            return $this->file_path;
        }
        
        return $this->value;
    }

    /**
     * Get translated value for specific language
     */
    public function getTranslatedValue($language)
    {
        if ($this->value_translations && isset($this->value_translations[$language])) {
            return $this->value_translations[$language];
        }
        
        return $this->getValue();
    }

    /**
     * Set value based on question type
     */
    public function setValue($value, $questionType)
    {
        // Array-based question types
        if (in_array($questionType, ['checkbox', 'multiselect', 'matrix'])) {
            $this->value_array = is_array($value) ? $value : [$value];
            $this->value = null;
        } 
        // File upload
        elseif ($questionType === 'file') {
            $this->file_path = $value;
            $this->value = null;
        }
        // Single value types
        else {
            $this->value = $value;
            $this->value_array = null;
        }
    }

    /**
     * Increment revision count
     */
    public function incrementRevision()
    {
        $this->revision_count++;
        $this->save();
    }
}
