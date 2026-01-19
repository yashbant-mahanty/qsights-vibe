<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class NotificationLog extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'participant_id',
        'anonymous_token',
        'recipient_email',
        'recipient_phone',
        'event_id',
        'questionnaire_id',
        'notification_type',
        'channel',
        'provider',
        'provider_message_id',
        'subject',
        'message_preview',
        'metadata',
        'status',
        'queued_at',
        'sent_at',
        'delivered_at',
        'opened_at',
        'read_at',
        'clicked_at',
        'bounced_at',
        'failed_at',
        'error_message',
        'retry_count',
        'webhook_events',
        'last_webhook_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'webhook_events' => 'array',
        'queued_at' => 'datetime',
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
        'opened_at' => 'datetime',
        'read_at' => 'datetime',
        'clicked_at' => 'datetime',
        'bounced_at' => 'datetime',
        'failed_at' => 'datetime',
        'last_webhook_at' => 'datetime',
        'retry_count' => 'integer',
    ];

    /**
     * Relationships
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function participant()
    {
        return $this->belongsTo(Participant::class);
    }

    public function event()
    {
        return $this->belongsTo(Activity::class, 'event_id');
    }

    // Alias for event() relationship
    public function activity()
    {
        return $this->belongsTo(Activity::class, 'event_id');
    }

    public function questionnaire()
    {
        return $this->belongsTo(Questionnaire::class);
    }

    /**
     * Scopes
     */
    public function scopeByChannel($query, $channel)
    {
        return $query->where('channel', $channel);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByEvent($query, $eventId)
    {
        return $query->where('event_id', $eventId);
    }

    public function scopeByParticipant($query, $participantId)
    {
        return $query->where('participant_id', $participantId);
    }

    public function scopeSent($query)
    {
        return $query->whereIn('status', ['sent', 'delivered', 'opened', 'read', 'clicked']);
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    public function scopeBounced($query)
    {
        return $query->where('status', 'bounced');
    }

    public function scopeRecent($query, $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Status update methods
     */
    public function markAsSent($providerMessageId = null)
    {
        $this->update([
            'status' => 'sent',
            'sent_at' => now(),
            'provider_message_id' => $providerMessageId ?? $this->provider_message_id,
        ]);
    }

    public function markAsDelivered()
    {
        $this->update([
            'status' => 'delivered',
            'delivered_at' => now(),
        ]);
    }

    public function markAsOpened()
    {
        if (!$this->opened_at) {
            $this->update([
                'status' => 'opened',
                'opened_at' => now(),
            ]);
        }
    }

    public function markAsRead()
    {
        $this->update([
            'status' => 'read',
            'read_at' => now(),
        ]);
    }

    public function markAsClicked()
    {
        $this->update([
            'status' => 'clicked',
            'clicked_at' => now(),
        ]);
    }

    public function markAsBounced($errorMessage = null)
    {
        $this->update([
            'status' => 'bounced',
            'bounced_at' => now(),
            'error_message' => $errorMessage,
        ]);
    }

    public function markAsFailed($errorMessage = null)
    {
        $this->update([
            'status' => 'failed',
            'failed_at' => now(),
            'error_message' => $errorMessage,
        ]);
    }

    /**
     * Webhook event handling
     */
    public function addWebhookEvent(array $event)
    {
        $events = $this->webhook_events ?? [];
        $events[] = array_merge($event, ['received_at' => now()->toIso8601String()]);
        
        $this->update([
            'webhook_events' => $events,
            'last_webhook_at' => now(),
        ]);
    }

    /**
     * Helper methods
     */
    public function isAnonymous(): bool
    {
        return !is_null($this->anonymous_token);
    }

    public function getRecipientDisplay(): string
    {
        if ($this->user) {
            return $this->user->name . ' (' . $this->user->email . ')';
        }
        
        if ($this->participant) {
            return $this->participant->name . ' (' . $this->participant->email . ')';
        }
        
        if ($this->recipient_email) {
            return $this->recipient_email . ' (Guest)';
        }
        
        if ($this->recipient_phone) {
            return $this->recipient_phone;
        }
        
        return 'Unknown';
    }

    public function getTimeToDeliver(): ?int
    {
        if ($this->sent_at && $this->delivered_at) {
            return $this->sent_at->diffInSeconds($this->delivered_at);
        }
        return null;
    }

    public function getTimeToOpen(): ?int
    {
        if ($this->delivered_at && $this->opened_at) {
            return $this->delivered_at->diffInSeconds($this->opened_at);
        }
        return null;
    }
}
