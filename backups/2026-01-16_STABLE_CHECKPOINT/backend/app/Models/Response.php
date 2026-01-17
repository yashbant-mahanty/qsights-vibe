<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class Response extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'activity_id',
        'participant_id',
        'guest_identifier',
        'answers', // JSON column for legacy/fallback support
        'status',
        'attempt_number',
        'language',
        'total_questions',
        'answered_questions',
        'completion_percentage',
        'score',
        'assessment_result',
        'correct_answers_count',
        'started_at',
        'submitted_at',
        'completed_at',
        'last_saved_at',
        'metadata',
        'time_expired_at',
        'auto_submitted',
        'is_preview',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'submitted_at' => 'datetime',
        'completed_at' => 'datetime',
        'last_saved_at' => 'datetime',
        'time_expired_at' => 'datetime',
        'answers' => 'array', // JSON column for legacy/fallback
        'metadata' => 'array',
        'completion_percentage' => 'decimal:2',
        'score' => 'decimal:2',
        'total_questions' => 'integer',
        'answered_questions' => 'integer',
        'correct_answers_count' => 'integer',
        'attempt_number' => 'integer',
        'auto_submitted' => 'boolean',
        'is_preview' => 'boolean',
    ];

    /**
     * Relationships
     */
    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function participant()
    {
        return $this->belongsTo(Participant::class);
    }

    public function answers()
    {
        return $this->hasMany(Answer::class);
    }

    /**
     * Scopes
     */
    public function scopeSubmitted($query)
    {
        return $query->where('status', 'submitted');
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    public function scopeByActivity($query, $activityId)
    {
        return $query->where('activity_id', $activityId);
    }

    public function scopeByParticipant($query, $participantId)
    {
        return $query->where('participant_id', $participantId);
    }

    public function scopeByGuest($query, $guestIdentifier)
    {
        return $query->where('guest_identifier', $guestIdentifier);
    }

    /**
     * Analytics methods
     */
    public function getProgressPercentage()
    {
        return $this->completion_percentage;
    }

    public function getTimeSpent()
    {
        if ($this->submitted_at) {
            return $this->started_at->diffInSeconds($this->submitted_at);
        }
        
        if ($this->last_saved_at) {
            return $this->started_at->diffInSeconds($this->last_saved_at);
        }
        
        return 0;
    }

    public function getAnswerSummary()
    {
        $answers = $this->answers()->with('question')->get();
        
        return $answers->map(function($answer) {
            return [
                'question_id' => $answer->question_id,
                'question_title' => $answer->question->title,
                'question_type' => $answer->question->type,
                'value' => $answer->value,
                'value_array' => $answer->value_array,
                'value_text' => $answer->value_text,
                'time_spent' => $answer->time_spent,
            ];
        });
    }

    public function getQuestionProgress()
    {
        return [
            'total_questions' => $this->total_questions,
            'answered_questions' => $this->answered_questions,
            'completion_percentage' => $this->completion_percentage,
            'remaining_questions' => $this->total_questions - $this->answered_questions,
        ];
    }

    /**
     * Check if response is submitted
     */
    public function isSubmitted()
    {
        return $this->status === 'submitted';
    }

    /**
     * Check if response is in progress
     */
    public function isInProgress()
    {
        return $this->status === 'in_progress';
    }

    /**
     * Check if response is from a guest
     */
    public function isGuest()
    {
        return !$this->participant_id && $this->guest_identifier;
    }

    /**
     * Update progress metrics
     */
    public function updateProgress()
    {
        $this->answered_questions = $this->answers()->count();
        
        if ($this->total_questions > 0) {
            $this->completion_percentage = ($this->answered_questions / $this->total_questions) * 100;
        }
        
        $this->last_saved_at = Carbon::now();
        $this->save();
    }

    /**
     * Mark as submitted
     */
    public function markAsSubmitted()
    {
        $this->status = 'submitted';
        $this->submitted_at = Carbon::now();
        $this->completion_percentage = 100.00;
        $this->save();
    }

    /**
     * Auto-save current state
     */
    public function autoSave()
    {
        $this->status = 'auto_saved';
        $this->last_saved_at = Carbon::now();
        $this->save();
    }

    /**
     * Append answers relationship as array in JSON responses
     */
    protected $appends = [];

    /**
     * Override toArray to ensure answers relationship is always an array
     * CRITICAL: The Response model has both:
     * 1. answers (JSON column) - legacy format stored in database
     * 2. answers() relationship - proper Answer model records
     * 
     * When serializing, we MUST prioritize the relationship over the JSON column!
     */
    public function toArray()
    {
        $array = parent::toArray();
        
        // CRITICAL FIX: If answers relationship is loaded, use it instead of JSON column
        // The parent::toArray() returns the JSON column value by default
        // We need to replace it with the relationship data
        if ($this->relationLoaded('answers')) {
            $answersRelation = $this->getRelation('answers');
            
            // Convert Collection to array with numeric keys
            if (is_object($answersRelation) && method_exists($answersRelation, 'values')) {
                $array['answers'] = $answersRelation->values()->toArray();
            } elseif (is_array($answersRelation)) {
                // Already an array, but ensure numeric keys
                $array['answers'] = array_values($answersRelation);
            } else {
                $array['answers'] = [];
            }
        }
        
        return $array;
    }
}
