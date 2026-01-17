<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProgramRole extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'program_id',
        'role_name',
        'username',
        'email',
        'password',
        'status',
        'description',
        'services',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'services' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the program that this role belongs to
     */
    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    /**
     * Get all activities (services) assigned to this role
     */
    public function activities()
    {
        return $this->belongsToMany(Activity::class, 'program_role_activities', 'program_role_id', 'activity_id')
            ->withTimestamps();
    }

    /**
     * Get all events assigned to this role
     */
    public function events()
    {
        return $this->belongsToMany(Activity::class, 'program_role_events', 'program_role_id', 'activity_id')
            ->withTimestamps();
    }

    /**
     * Scope to filter by program
     */
    public function scopeForProgram($query, $programId)
    {
        return $query->where('program_id', $programId);
    }

    /**
     * Scope to filter active roles
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Check if role is active
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
