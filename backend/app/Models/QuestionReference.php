<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class QuestionReference extends Model
{
    use HasFactory;

    /**
     * Indicates if the IDs are auto-incrementing.
     */
    public $incrementing = false;

    /**
     * The data type of the auto-incrementing ID.
     */
    protected $keyType = 'string';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'id',
        'question_id',
        'reference_type',
        'title',
        'content_text',
        'content_url',
        'display_position',
        'order_index',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'order_index' => 'integer',
    ];

    /**
     * Boot function to auto-generate UUID
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    /**
     * Get the question that owns this reference.
     */
    public function question()
    {
        return $this->belongsTo(Question::class);
    }

    /**
     * Scope to get references displayed after question text
     */
    public function scopeAfterQuestion($query)
    {
        return $query->where('display_position', 'AFTER_QUESTION');
    }

    /**
     * Scope to get references displayed after answer options
     */
    public function scopeAfterAnswer($query)
    {
        return $query->where('display_position', 'AFTER_ANSWER');
    }

    /**
     * Scope to get text references
     */
    public function scopeTextType($query)
    {
        return $query->where('reference_type', 'text');
    }

    /**
     * Scope to get URL references
     */
    public function scopeUrlType($query)
    {
        return $query->where('reference_type', 'url');
    }

    /**
     * Check if this is a text reference
     */
    public function isText()
    {
        return $this->reference_type === 'text';
    }

    /**
     * Check if this is a URL reference
     */
    public function isUrl()
    {
        return $this->reference_type === 'url';
    }

    /**
     * Get the content based on reference type
     */
    public function getContent()
    {
        return $this->isText() ? $this->content_text : $this->content_url;
    }
}
