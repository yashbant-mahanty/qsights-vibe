<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class GroupHead extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'organization_id',
        'user_id',
        'phone',
        'department',
        'designation',
        'status',
        'logo',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Boot method to handle cascade deletes.
     */
    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($groupHead) {
            if ($groupHead->isForceDeleting()) {
                // Permanently delete all programs
                $groupHead->programs()->forceDelete();
            } else {
                // Soft delete all programs
                $groupHead->programs()->delete();
            }
        });
    }

    /**
     * Get the organization that owns the group head.
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the user associated with the group head.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the programs for the group head.
     */
    public function programs()
    {
        return $this->hasMany(Program::class);
    }
}
