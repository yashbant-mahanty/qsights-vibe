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
        'other_text',
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
        
        // Check if value is enhanced payload JSON
        if ($this->value && $this->isEnhancedPayload()) {
            $decoded = json_decode($this->value, true);
            return $decoded;
        }
        
        return $this->value;
    }

    /**
     * Check if the answer contains an enhanced value display mode payload
     */
    public function isEnhancedPayload()
    {
        if (!$this->value || !is_string($this->value)) {
            return false;
        }
        
        $decoded = json_decode($this->value, true);
        return is_array($decoded) && isset($decoded['value_type']);
    }

    /**
     * Get the enhanced payload data if available
     */
    public function getEnhancedPayload()
    {
        if ($this->isEnhancedPayload()) {
            return json_decode($this->value, true);
        }
        
        return null;
    }

    /**
     * Get the raw numeric value for reporting/analytics
     * Returns raw_value for enhanced payloads, or the plain value for legacy answers
     */
    public function getRawValue()
    {
        if ($this->isEnhancedPayload()) {
            $payload = json_decode($this->value, true);
            return $payload['raw_value'] ?? null;
        }
        
        return $this->value;
    }

    /**
     * Get the display value for reporting
     * Returns display_value for enhanced payloads, or the plain value for legacy answers
     */
    public function getDisplayValue()
    {
        if ($this->isEnhancedPayload()) {
            $payload = json_decode($this->value, true);
            return $payload['display_value'] ?? null;
        }
        
        return $this->value;
    }

    /**
     * Get the resolved value for analytics grouping
     * Returns resolved_value for enhanced payloads, or the plain value for legacy answers
     */
    public function getResolvedValue()
    {
        if ($this->isEnhancedPayload()) {
            $payload = json_decode($this->value, true);
            return $payload['resolved_value'] ?? $payload['raw_value'] ?? null;
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
