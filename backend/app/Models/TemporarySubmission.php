<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class TemporarySubmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'activity_id',
        'session_token',
        'responses',
        'metadata',
        'linked_to_participant_id',
        'status',
        'expires_at',
    ];

    protected $casts = [
        'responses' => 'array',
        'metadata' => 'array',
        'expires_at' => 'datetime',
    ];

    /**
     * Relationship: Belongs to Activity
     */
    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    /**
     * Relationship: Belongs to Participant (if linked)
     */
    public function participant()
    {
        return $this->belongsTo(Participant::class, 'linked_to_participant_id');
    }

    /**
     * Scope: Only pending submissions
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope: Only expired submissions
     */
    public function scopeExpired($query)
    {
        return $query->where('expires_at', '<', Carbon::now());
    }

    /**
     * Check if submission has expired
     */
    public function hasExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Link this temporary submission to a participant
     */
    public function linkToParticipant($participantId): bool
    {
        $this->linked_to_participant_id = $participantId;
        $this->status = 'linked';
        return $this->save();
    }

    /**
     * Mark as expired
     */
    public function markAsExpired(): bool
    {
        $this->status = 'expired';
        return $this->save();
    }
}
