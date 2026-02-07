<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ResponseAuditLog extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'response_id',
        'user_id',
        'participant_id',
        'event_id',
        'questionnaire_id',
        'question_id',
        'option_id',
        'answer_value',
        'answer_value_array',
        'answer_file_path',
        'answer_translations',
        'source',
        'submitted_at',
    ];

    protected $casts = [
        'answer_value_array' => 'array',
        'answer_translations' => 'array',
        'submitted_at' => 'datetime',
    ];

    /**
     * Relationships
     */
    public function response()
    {
        return $this->belongsTo(Response::class);
    }

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

    public function questionnaire()
    {
        return $this->belongsTo(Questionnaire::class);
    }

    public function question()
    {
        return $this->belongsTo(Question::class);
    }

    /**
     * Scopes
     */
    public function scopeByEvent($query, $eventId)
    {
        return $query->where('event_id', $eventId);
    }

    public function scopeByParticipant($query, $participantId)
    {
        return $query->where('participant_id', $participantId);
    }

    public function scopeBySource($query, $source)
    {
        return $query->where('source', $source);
    }

    public function scopeAnonymous($query)
    {
        return $query->whereNull('user_id')->whereNull('participant_id');
    }

    public function scopeAuthenticated($query)
    {
        return $query->whereNotNull('user_id')->orWhereNotNull('participant_id');
    }

    public function scopeRecent($query, $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Helper methods
     */
    public function isAnonymous(): bool
    {
        return is_null($this->user_id) && is_null($this->participant_id);
    }

    public function getAnswerDisplay(): string
    {
        if ($this->answer_value_array) {
            return is_array($this->answer_value_array) 
                ? implode(', ', $this->answer_value_array) 
                : json_encode($this->answer_value_array);
        }

        if ($this->answer_file_path) {
            return 'File: ' . basename($this->answer_file_path);
        }

        return $this->answer_value ?? '';
    }
}
