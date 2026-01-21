<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EvaluationStaff extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'evaluation_staff';

    protected $fillable = [
        'organization_id',
        'user_id',
        'role_id',
        'employee_id',
        'name',
        'email',
        'department',
        'position',
        'is_active',
        'hire_date',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'is_active' => 'boolean',
        'hire_date' => 'date',
    ];

    /**
     * Organization this staff belongs to
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Linked user account (if any)
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Role assigned to this staff
     */
    public function role()
    {
        return $this->belongsTo(EvaluationRole::class, 'role_id');
    }

    /**
     * Manager relationships (this person is supervised by)
     */
    public function managedBy()
    {
        return $this->hasMany(EvaluationHierarchy::class, 'subordinate_id');
    }

    /**
     * Subordinate relationships (this person supervises)
     */
    public function manages()
    {
        return $this->hasMany(EvaluationHierarchy::class, 'manager_id');
    }

    /**
     * Direct managers
     */
    public function managers()
    {
        return $this->belongsToMany(
            EvaluationStaff::class,
            'evaluation_hierarchy',
            'subordinate_id',
            'manager_id'
        )->withPivot('relationship_type', 'is_primary');
    }

    /**
     * Direct subordinates
     */
    public function subordinates()
    {
        return $this->belongsToMany(
            EvaluationStaff::class,
            'evaluation_hierarchy',
            'manager_id',
            'subordinate_id'
        )->withPivot('relationship_type', 'is_primary');
    }

    /**
     * Evaluations assigned to this staff (as evaluatee)
     */
    public function evaluationsReceived()
    {
        return $this->hasMany(EvaluationAssignment::class, 'evaluatee_id');
    }

    /**
     * Evaluations this staff needs to complete (as evaluator)
     */
    public function evaluationsToComplete()
    {
        return $this->hasMany(EvaluationAssignment::class, 'evaluator_id');
    }

    /**
     * Evaluation results for this staff
     */
    public function results()
    {
        return $this->hasMany(EvaluationResult::class, 'staff_id');
    }
}
