<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EvaluationHierarchy extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'evaluation_hierarchy';

    protected $fillable = [
        'organization_id',
        'manager_id',
        'subordinate_id',
        'relationship_type',
        'is_primary',
        'effective_from',
        'effective_to',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    /**
     * Organization this relationship belongs to
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * The manager in this relationship
     */
    public function manager()
    {
        return $this->belongsTo(EvaluationStaff::class, 'manager_id');
    }

    /**
     * The subordinate in this relationship
     */
    public function subordinate()
    {
        return $this->belongsTo(EvaluationStaff::class, 'subordinate_id');
    }

    /**
     * Check if relationship is currently active
     */
    public function isActive(): bool
    {
        $now = now()->toDateString();
        $started = !$this->effective_from || $this->effective_from <= $now;
        $notEnded = !$this->effective_to || $this->effective_to >= $now;
        return $started && $notEnded;
    }

    /**
     * Scope to get only active relationships
     */
    public function scopeActive($query)
    {
        $now = now()->toDateString();
        return $query->where(function ($q) use ($now) {
            $q->whereNull('effective_from')
              ->orWhere('effective_from', '<=', $now);
        })->where(function ($q) use ($now) {
            $q->whereNull('effective_to')
              ->orWhere('effective_to', '>=', $now);
        });
    }
}
