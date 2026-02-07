<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EvaluationEvent extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'questionnaire_id',
        'organization_id',
        'program_id',
        'created_by',
        'evaluation_type',
        'is_hierarchy_based',
        'is_anonymous',
        'show_individual_responses',
        'start_date',
        'end_date',
        'status',
        'settings',
    ];

    protected $casts = [
        'is_hierarchy_based' => 'boolean',
        'is_anonymous' => 'boolean',
        'show_individual_responses' => 'boolean',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'settings' => 'array',
    ];

    /**
     * Get the questionnaire used for this evaluation
     */
    public function questionnaire()
    {
        return $this->belongsTo(Questionnaire::class);
    }

    /**
     * Get the organization this evaluation belongs to
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the program this evaluation belongs to (optional)
     */
    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    /**
     * Get the user who created this evaluation
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get all assignments for this evaluation
     */
    public function assignments()
    {
        return $this->hasMany(EvaluationAssignment::class);
    }

    /**
     * Get all responses for this evaluation
     */
    public function responses()
    {
        return $this->hasMany(EvaluationResponse::class);
    }

    /**
     * Check if evaluation is currently active
     */
    public function isActive(): bool
    {
        return $this->status === 'active' 
            && now()->between($this->start_date, $this->end_date);
    }

    /**
     * Get completion statistics
     */
    public function getCompletionStats(): array
    {
        $total = $this->assignments()->count();
        $completed = $this->assignments()->where('status', 'completed')->count();
        $pending = $this->assignments()->where('status', 'pending')->count();
        $inProgress = $this->assignments()->where('status', 'in_progress')->count();
        
        return [
            'total' => $total,
            'completed' => $completed,
            'pending' => $pending,
            'in_progress' => $inProgress,
            'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 2) : 0,
        ];
    }

    /**
     * Scope: Active evaluations
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
                     ->where('start_date', '<=', now())
                     ->where('end_date', '>=', now());
    }

    /**
     * Scope: By organization
     */
    public function scopeByOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope: By program
     */
    public function scopeByProgram($query, $programId)
    {
        return $query->where('program_id', $programId);
    }
}
