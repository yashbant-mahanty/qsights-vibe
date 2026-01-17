<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class Program extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'group_head_id',
        'name',
        'code',
        'description',
        'logo',
        'start_date',
        'end_date',
        'is_multilingual',
        'languages',
        'status',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_multilingual' => 'boolean',
        'languages' => 'array',
    ];

    /**
     * Boot method to handle cascading deletes
     */
    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($program) {
            if ($program->isForceDeleting()) {
                // Force delete related records
                $program->activities()->forceDelete();
                $program->participants()->forceDelete();
                User::where('program_id', $program->id)->forceDelete();
            } else {
                // Soft delete related records
                $program->activities()->delete();
                $program->participants()->delete();
                User::where('program_id', $program->id)->delete();
            }
        });

        static::restoring(function ($program) {
            // Restore soft deleted related records
            $program->activities()->withTrashed()->restore();
            $program->participants()->withTrashed()->restore();
            User::withTrashed()->where('program_id', $program->id)->restore();
        });
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function groupHead()
    {
        return $this->belongsTo(GroupHead::class);
    }

    public function activities()
    {
        return $this->hasMany(Activity::class);
    }

    public function participants()
    {
        return $this->belongsToMany(Participant::class, 'participant_program')->withTimestamps()->withPivot('assigned_at');
    }

    public function users()
    {
        return $this->hasMany(User::class, 'program_id');
    }

    /**
     * Check if program is expired based on end date
     */
    public function isExpired(): bool
    {
        if (!$this->end_date) {
            return false;
        }

        return Carbon::parse($this->end_date)->isPast();
    }

    /**
     * Get days remaining until program ends
     */
    public function daysRemaining(): ?int
    {
        if (!$this->end_date) {
            return null;
        }

        $days = Carbon::now()->diffInDays(Carbon::parse($this->end_date), false);
        return $days >= 0 ? $days : 0;
    }

    /**
     * Scope to get only active programs
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to get only expired programs
     */
    public function scopeExpired($query)
    {
        return $query->where('status', 'expired');
    }
}
