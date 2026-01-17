<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EventContactMessage extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'activity_id',
        'activity_name',
        'user_type',
        'participant_id',
        'name',
        'email',
        'message',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Status constants
     */
    const STATUS_NEW = 'new';
    const STATUS_READ = 'read';
    const STATUS_RESPONDED = 'responded';

    /**
     * User type constants
     */
    const USER_TYPE_PARTICIPANT = 'participant';
    const USER_TYPE_ANONYMOUS = 'anonymous';

    /**
     * Get the activity associated with this message.
     */
    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    /**
     * Get the participant if not anonymous.
     */
    public function participant()
    {
        return $this->belongsTo(Participant::class);
    }

    /**
     * Mark as read.
     */
    public function markAsRead()
    {
        if ($this->status === self::STATUS_NEW) {
            $this->update(['status' => self::STATUS_READ]);
        }
        return $this;
    }

    /**
     * Mark as responded.
     */
    public function markAsResponded()
    {
        $this->update(['status' => self::STATUS_RESPONDED]);
        return $this;
    }

    /**
     * Scope for new messages.
     */
    public function scopeNew($query)
    {
        return $query->where('status', self::STATUS_NEW);
    }

    /**
     * Scope for unread messages (new status).
     */
    public function scopeUnread($query)
    {
        return $query->where('status', self::STATUS_NEW);
    }

    /**
     * Check if message is from anonymous user.
     */
    public function isAnonymous(): bool
    {
        return $this->user_type === self::USER_TYPE_ANONYMOUS;
    }
}
