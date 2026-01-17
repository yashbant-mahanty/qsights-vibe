<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EvaluationResponse extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'evaluation_assignment_id',
        'evaluation_event_id',
        'question_id',
        'answer',
        'score',
        'comment',
    ];

    protected $casts = [
        'answer' => 'array',
        'score' => 'decimal:2',
    ];

    /**
     * Get the assignment this response belongs to
     */
    public function assignment()
    {
        return $this->belongsTo(EvaluationAssignment::class, 'evaluation_assignment_id');
    }

    /**
     * Get the evaluation event
     */
    public function evaluationEvent()
    {
        return $this->belongsTo(EvaluationEvent::class);
    }

    /**
     * Get the question
     */
    public function question()
    {
        return $this->belongsTo(Question::class);
    }

    /**
     * Scope: By event
     */
    public function scopeByEvent($query, string $eventId)
    {
        return $query->where('evaluation_event_id', $eventId);
    }

    /**
     * Scope: By question
     */
    public function scopeByQuestion($query, string $questionId)
    {
        return $query->where('question_id', $questionId);
    }

    /**
     * Get average score for a question in an event
     */
    public static function getAverageScoreForQuestion(string $eventId, string $questionId): ?float
    {
        return self::byEvent($eventId)
                   ->byQuestion($questionId)
                   ->whereNotNull('score')
                   ->avg('score');
    }
}
