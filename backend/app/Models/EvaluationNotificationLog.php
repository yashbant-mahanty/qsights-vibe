<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EvaluationNotificationLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'evaluation_triggered_id',
        'program_id',
        'notification_type',
        'channel',
        'recipient_id',
        'recipient_email',
        'recipient_name',
        'subject',
        'message',
        'metadata',
        'status',
        'provider',
        'provider_message_id',
        'scheduled_at',
        'sent_at',
        'delivered_at',
        'failed_at',
        'error_message',
        'retry_count',
    ];

    protected $casts = [
        'metadata' => 'array',
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
        'failed_at' => 'datetime',
    ];

    /**
     * Get the evaluation trigger.
     */
    public function evaluationTriggered()
    {
        return $this->belongsTo(EvaluationTriggered::class, 'evaluation_triggered_id');
    }

    /**
     * Get the program.
     */
    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    /**
     * Scope for pending notifications
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope for scheduled notifications
     */
    public function scopeScheduled($query)
    {
        return $query->where('status', 'pending')
                     ->whereNotNull('scheduled_at')
                     ->where('scheduled_at', '<=', now());
    }

    /**
     * Scope for failed notifications
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }
}
