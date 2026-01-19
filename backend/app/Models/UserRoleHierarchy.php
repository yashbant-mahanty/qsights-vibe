<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class UserRoleHierarchy extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'user_role_hierarchy';

    protected $fillable = [
        'user_id',
        'program_id',
        'hierarchical_role_id',
        'manager_user_id',
        'assigned_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the user this hierarchy belongs to
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the program this hierarchy belongs to
     */
    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    /**
     * Get the hierarchical role
     */
    public function hierarchicalRole()
    {
        return $this->belongsTo(HierarchicalRole::class);
    }

    /**
     * Get the manager user
     */
    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_user_id');
    }

    /**
     * Scope for a specific user
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope for a specific program
     */
    public function scopeForProgram($query, $programId)
    {
        return $query->where('program_id', $programId);
    }

    /**
     * Scope for a specific manager
     */
    public function scopeForManager($query, $managerId)
    {
        return $query->where('manager_user_id', $managerId);
    }

    /**
     * Scope for users without a manager
     */
    public function scopeWithoutManager($query)
    {
        return $query->whereNull('manager_user_id');
    }

    /**
     * Scope for users with a manager
     */
    public function scopeWithManager($query)
    {
        return $query->whereNotNull('manager_user_id');
    }

    /**
     * Get all subordinates (direct reports) for this user
     */
    public function getDirectReportsAttribute()
    {
        return static::where('manager_user_id', $this->user_id)
            ->where('program_id', $this->program_id)
            ->with('user', 'hierarchicalRole')
            ->get();
    }
}
