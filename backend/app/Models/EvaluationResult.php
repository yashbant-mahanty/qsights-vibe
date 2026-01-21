<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EvaluationResult extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'evaluation_event_id',
        'staff_id',
        'total_assigned',
        'total_completed',
        'completion_percentage',
        'average_score',
        'manager_score',
        'peer_score',
        'subordinate_score',
        'self_score',
        'aggregated_data',
        'status',
        'is_published',
        'published_at',
        'published_by',
        'admin_notes',
    ];

    protected $casts = [
        'aggregated_data' => 'array',
        'is_published' => 'boolean',
        'published_at' => 'datetime',
        'total_assigned' => 'integer',
        'total_completed' => 'integer',
        'completion_percentage' => 'decimal:2',
        'average_score' => 'decimal:2',
        'manager_score' => 'decimal:2',
        'peer_score' => 'decimal:2',
        'subordinate_score' => 'decimal:2',
        'self_score' => 'decimal:2',
    ];

    /**
     * The evaluation event this result belongs to
     */
    public function evaluationEvent()
    {
        return $this->belongsTo(EvaluationEvent::class, 'evaluation_event_id');
    }

    /**
     * The staff member this result is for
     */
    public function staff()
    {
        return $this->belongsTo(EvaluationStaff::class, 'staff_id');
    }

    /**
     * User who published this result
     */
    public function publisher()
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    /**
     * Scope for published results
     */
    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }

    /**
     * Calculate completion percentage
     */
    public function calculateCompletionPercentage(): float
    {
        if ($this->total_assigned == 0) {
            return 0;
        }
        return round(($this->total_completed / $this->total_assigned) * 100, 2);
    }
}
