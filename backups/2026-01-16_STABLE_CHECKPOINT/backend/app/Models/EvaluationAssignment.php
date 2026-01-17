<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class EvaluationAssignment extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'evaluation_event_id',
        'evaluator_type',
        'evaluator_id',
        'evaluatee_type',
        'evaluatee_id',
        'triggered_by',
        'access_token',
        'status',
        'sent_at',
        'started_at',
        'completed_at',
        'reminder_count',
        'last_reminder_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'last_reminder_at' => 'datetime',
    ];

    /**
     * Boot method to generate access token
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($assignment) {
            if (empty($assignment->access_token)) {
                $assignment->access_token = Str::random(64);
            }
        });
    }

    /**
     * Get the evaluation event
     */
    public function evaluationEvent()
    {
        return $this->belongsTo(EvaluationEvent::class);
    }

    /**
     * Get the evaluator (polymorphic - User or Participant)
     */
    public function evaluator()
    {
        if ($this->evaluator_type === 'user') {
            return $this->belongsTo(User::class, 'evaluator_id');
        }
        return $this->belongsTo(Participant::class, 'evaluator_id');
    }

    /**
     * Get evaluator as User
     */
    public function evaluatorUser()
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }

    /**
     * Get evaluator as Participant
     */
    public function evaluatorParticipant()
    {
        return $this->belongsTo(Participant::class, 'evaluator_id');
    }

    /**
     * Get the evaluatee (polymorphic - User or Participant)
     */
    public function evaluatee()
    {
        if ($this->evaluatee_type === 'user') {
            return $this->belongsTo(User::class, 'evaluatee_id');
        }
        return $this->belongsTo(Participant::class, 'evaluatee_id');
    }

    /**
     * Get evaluatee as User
     */
    public function evaluateeUser()
    {
        return $this->belongsTo(User::class, 'evaluatee_id');
    }

    /**
     * Get evaluatee as Participant
     */
    public function evaluateeParticipant()
    {
        return $this->belongsTo(Participant::class, 'evaluatee_id');
    }

    /**
     * Get the user who triggered this assignment
     */
    public function triggeredByUser()
    {
        return $this->belongsTo(User::class, 'triggered_by');
    }

    /**
     * Get all responses for this assignment
     */
    public function responses()
    {
        return $this->hasMany(EvaluationResponse::class);
    }

    /**
     * Get evaluator name
     */
    public function getEvaluatorNameAttribute(): string
    {
        if ($this->evaluator_type === 'user') {
            return $this->evaluatorUser?->name ?? 'Unknown User';
        }
        return $this->evaluatorParticipant?->name ?? 'Unknown Participant';
    }

    /**
     * Get evaluator email
     */
    public function getEvaluatorEmailAttribute(): string
    {
        if ($this->evaluator_type === 'user') {
            return $this->evaluatorUser?->email ?? '';
        }
        return $this->evaluatorParticipant?->email ?? '';
    }

    /**
     * Get evaluatee name
     */
    public function getEvaluateeNameAttribute(): string
    {
        if ($this->evaluatee_type === 'user') {
            return $this->evaluateeUser?->name ?? 'Unknown User';
        }
        return $this->evaluateeParticipant?->name ?? 'Unknown Participant';
    }

    /**
     * Get evaluatee email
     */
    public function getEvaluateeEmailAttribute(): string
    {
        if ($this->evaluatee_type === 'user') {
            return $this->evaluateeUser?->email ?? '';
        }
        return $this->evaluateeParticipant?->email ?? '';
    }

    /**
     * Mark as started
     */
    public function markAsStarted(): void
    {
        $this->update([
            'status' => 'in_progress',
            'started_at' => now(),
        ]);
    }

    /**
     * Mark as completed
     */
    public function markAsCompleted(): void
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }

    /**
     * Increment reminder count
     */
    public function recordReminder(): void
    {
        $this->increment('reminder_count');
        $this->update(['last_reminder_at' => now()]);
    }

    /**
     * Generate evaluation URL
     */
    public function getEvaluationUrl(): string
    {
        return config('app.frontend_url') . '/evaluate/' . $this->access_token;
    }

    /**
     * Scope: Pending assignments
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope: Completed assignments
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope: By evaluator
     */
    public function scopeByEvaluator($query, string $type, string $id)
    {
        return $query->where('evaluator_type', $type)
                     ->where('evaluator_id', $id);
    }

    /**
     * Scope: By evaluatee
     */
    public function scopeByEvaluatee($query, string $type, string $id)
    {
        return $query->where('evaluatee_type', $type)
                     ->where('evaluatee_id', $id);
    }

    /**
     * Scope: Triggered by user
     */
    public function scopeTriggeredBy($query, string $userId)
    {
        return $query->where('triggered_by', $userId);
    }
}
