<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'notification_id',
        'sendgrid_message_id',
        'event_type',
        'email',
        'participant_id',
        'user_id',
        'program_name',
        'program_id',
        'activity_name',
        'activity_id',
        'event_timestamp',
        'ip_address',
        'user_agent',
        'url',
        'reason',
        'raw_data',
    ];

    protected $casts = [
        'event_timestamp' => 'datetime',
        'raw_data' => 'array',
    ];

    // Relationships
    public function notification()
    {
        return $this->belongsTo(Notification::class);
    }

    public function participant()
    {
        return $this->belongsTo(Participant::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Scopes
    public function scopeDelivered($query)
    {
        return $query->where('event_type', 'delivered');
    }

    public function scopeOpened($query)
    {
        return $query->where('event_type', 'open');
    }

    public function scopeClicked($query)
    {
        return $query->where('event_type', 'click');
    }

    public function scopeBounced($query)
    {
        return $query->whereIn('event_type', ['bounce', 'dropped']);
    }

    public function scopeForEmail($query, $email)
    {
        return $query->where('email', $email);
    }

    public function scopeForParticipant($query, $participantId)
    {
        return $query->where('participant_id', $participantId);
    }

    public function scopeForProgram($query, $programId)
    {
        return $query->where('program_id', $programId);
    }

    public function scopeByEventType($query, $eventType)
    {
        return $query->where('event_type', $eventType);
    }

    public function scopeRecent($query, $days = 30)
    {
        return $query->where('event_timestamp', '>=', now()->subDays($days));
    }
}
