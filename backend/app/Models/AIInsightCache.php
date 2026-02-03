<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AIInsightCache extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'ai_insights_cache';

    protected $fillable = [
        'activity_id',
        'question_id',
        'insight_type',
        'title',
        'description',
        'data',
        'priority',
        'confidence_score',
        'computed_at',
        'expires_at',
        'response_count_at_computation',
    ];

    protected $casts = [
        'data' => 'array',
        'confidence_score' => 'decimal:2',
        'computed_at' => 'datetime',
        'expires_at' => 'datetime',
        'response_count_at_computation' => 'integer',
    ];

    // Relationships
    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function question()
    {
        return $this->belongsTo(Question::class);
    }

    // Scopes
    public function scopeValid($query)
    {
        return $query->where(function($q) {
            $q->whereNull('expires_at')
              ->orWhere('expires_at', '>', now());
        });
    }

    public function scopeByType($query, $type)
    {
        return $query->where('insight_type', $type);
    }

    public function scopeHighPriority($query)
    {
        return $query->whereIn('priority', ['high', 'critical']);
    }

    // Helper methods
    public function isExpired()
    {
        return $this->expires_at && $this->expires_at->isPast();
    }
}
