<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Notification extends Model
{
    use HasFactory, SoftDeletes, HasUuids;

    protected $fillable = [
        'type',
        'event',
        'participant_id',
        'recipient_email',
        'recipient_phone',
        'subject',
        'message',
        'status',
        'metadata',
        'error_message',
        'sent_at',
        'retry_count',
    ];

    protected $casts = [
        'metadata' => 'array',
        'sent_at' => 'datetime',
        'retry_count' => 'integer',
    ];

    // Relationships
    public function participant()
    {
        return $this->belongsTo(Participant::class);
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeSent($query)
    {
        return $query->where('status', 'sent');
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeByEvent($query, $event)
    {
        return $query->where('event', $event);
    }

    // Status checks
    public function isPending()
    {
        return $this->status === 'pending';
    }

    public function isSent()
    {
        return $this->status === 'sent';
    }

    public function isFailed()
    {
        return $this->status === 'failed';
    }

    // State management
    public function markAsSent()
    {
        $this->update([
            'status' => 'sent',
            'sent_at' => now(),
        ]);
    }

    public function markAsFailed($errorMessage)
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $errorMessage,
            'retry_count' => $this->retry_count + 1,
        ]);
    }

    public function markAsQueued()
    {
        $this->update([
            'status' => 'queued',
        ]);
    }
}
