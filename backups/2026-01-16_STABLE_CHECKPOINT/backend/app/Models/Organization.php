<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Organization extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        'website',
        'logo',
        'description',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // Relationships with cascade delete
    public function groupHeads()
    {
        return $this->hasMany(GroupHead::class);
    }

    public function programs()
    {
        return $this->hasMany(Program::class);
    }

    public function participants()
    {
        return $this->hasMany(Participant::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    // Scope for active organizations
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    // Boot method to handle cascade deletes
    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($organization) {
            // Cascade delete group heads (which will cascade to programs, activities, participants)
            $organization->groupHeads()->each(function ($groupHead) {
                $groupHead->delete();
            });

            // Cascade delete programs directly under organization
            $organization->programs()->each(function ($program) {
                $program->delete();
            });

            // Update users to remove organization reference
            $organization->users()->update(['organization_id' => null]);
        });
    }
}
