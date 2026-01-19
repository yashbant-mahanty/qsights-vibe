<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoleType extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'description',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get all hierarchical roles for this role type
     */
    public function hierarchicalRoles()
    {
        return $this->hasMany(HierarchicalRole::class);
    }

    /**
     * Scope for system roles
     */
    public function scopeSystem($query)
    {
        return $query->where('name', 'system');
    }

    /**
     * Scope for program roles
     */
    public function scopeProgram($query)
    {
        return $query->where('name', 'program');
    }

    /**
     * Check if this is a system role type
     */
    public function isSystem(): bool
    {
        return $this->name === 'system';
    }

    /**
     * Check if this is a program role type
     */
    public function isProgram(): bool
    {
        return $this->name === 'program';
    }
}
