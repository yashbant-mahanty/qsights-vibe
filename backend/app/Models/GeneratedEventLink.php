<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Carbon\Carbon;

class GeneratedEventLink extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'activity_id',
        'group_id',
        'tag',
        'token',
        'link_type',
        'status',
        'created_by',
        'used_at',
        'used_by_participant_id',
        'response_id',
        'expires_at',
        'metadata',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'used_at' => 'datetime',
        'expires_at' => 'datetime',
        'metadata' => 'array',
    ];

    /**
     * Relationships
     */
    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function group()
    {
        return $this->belongsTo(GeneratedLinkGroup::class, 'group_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function participant()
    {
        return $this->belongsTo(Participant::class, 'used_by_participant_id');
    }

    public function response()
    {
        return $this->belongsTo(Response::class);
    }

    /**
     * Generate a secure token for the link
     */
    public static function generateToken(): string
    {
        return Str::random(64);
    }

    /**
     * Mark link as used
     */
    public function markAsUsed(string $participantId, string $responseId): void
    {
        $this->update([
            'status' => 'used',
            'used_at' => now(),
            'used_by_participant_id' => $participantId,
            'response_id' => $responseId,
        ]);

        // Increment group counter if link belongs to a group
        if ($this->group_id) {
            $this->group?->incrementUsedLinks();
        }
    }

    /**
     * Mark link as expired
     */
    public function markAsExpired(): void
    {
        $this->update(['status' => 'expired']);
    }

    /**
     * Disable link manually
     */
    public function disable(): void
    {
        $this->update(['status' => 'disabled']);
    }

    /**
     * Check if link is usable
     */
    public function isUsable(): bool
    {
        // Check status
        if ($this->status !== 'unused') {
            return false;
        }

        // Check expiry
        if ($this->expires_at && Carbon::now()->greaterThan($this->expires_at)) {
            $this->markAsExpired();
            return false;
        }

        return true;
    }

    /**
     * Check if link has expired based on activity close date
     */
    public function checkActivityExpiry(): bool
    {
        $activity = $this->activity;
        
        if ($activity && $activity->close_date) {
            $closeDate = Carbon::parse($activity->close_date);
            
            if (Carbon::now()->greaterThan($closeDate)) {
                if ($this->status === 'unused') {
                    $this->markAsExpired();
                }
                return true;
            }
        }

        return false;
    }

    /**
     * Scopes
     */
    public function scopeUnused($query)
    {
        return $query->where('status', 'unused');
    }

    public function scopeUsed($query)
    {
        return $query->where('status', 'used');
    }

    public function scopeExpired($query)
    {
        return $query->where('status', 'expired');
    }

    public function scopeByActivity($query, string $activityId)
    {
        return $query->where('activity_id', $activityId);
    }

    public function scopeByGroup($query, string $groupId)
    {
        return $query->where('group_id', $groupId);
    }
}
