<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class HierarchicalRole extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'role_type_id',
        'name',
        'code',
        'hierarchy_level',
        'is_manager',
        'can_view_reports',
        'description',
        'permissions',
        'status',
    ];

    protected $casts = [
        'hierarchy_level' => 'integer',
        'is_manager' => 'boolean',
        'can_view_reports' => 'boolean',
        'permissions' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the role type
     */
    public function roleType()
    {
        return $this->belongsTo(RoleType::class);
    }

    /**
     * Get all users with this hierarchical role
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'user_role_hierarchy', 'hierarchical_role_id', 'user_id')
            ->withPivot(['program_id', 'manager_user_id', 'assigned_at'])
            ->withTimestamps();
    }

    /**
     * Get all user role hierarchy records
     */
    public function userRoleHierarchies()
    {
        return $this->hasMany(UserRoleHierarchy::class, 'hierarchical_role_id');
    }

    /**
     * Scope for manager roles
     */
    public function scopeManagers($query)
    {
        return $query->where('is_manager', true);
    }

    /**
     * Scope for active roles
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope for system roles
     */
    public function scopeSystem($query)
    {
        return $query->whereHas('roleType', function ($q) {
            $q->where('name', 'system');
        });
    }

    /**
     * Scope for program roles
     */
    public function scopeProgram($query)
    {
        return $query->whereHas('roleType', function ($q) {
            $q->where('name', 'program');
        });
    }

    /**
     * Scope by hierarchy level
     */
    public function scopeLevel($query, int $level)
    {
        return $query->where('hierarchy_level', $level);
    }

    /**
     * Check if this role can manage others
     */
    public function canManage(): bool
    {
        return $this->is_manager;
    }

    /**
     * Check if this role can view reports
     */
    public function canViewReports(): bool
    {
        return $this->can_view_reports;
    }

    /**
     * Check if this is an active role
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Get permission for a specific key
     */
    public function hasPermission(string $key): bool
    {
        return isset($this->permissions[$key]) && $this->permissions[$key] === true;
    }
}
