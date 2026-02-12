<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class VideoViewLog extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'participant_id',
        'questionnaire_id',
        'video_id',
        'activity_id',
        'watch_duration_seconds',
        'completed',
        'completion_percentage',
        'participant_email',
        'participant_name',
    ];

    protected $casts = [
        'watch_duration_seconds' => 'integer',
        'completed' => 'boolean',
        'completion_percentage' => 'decimal:2',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    /**
     * Get the questionnaire
     */
    public function questionnaire()
    {
        return $this->belongsTo(Questionnaire::class);
    }

    /**
     * Get the video
     */
    public function video()
    {
        return $this->belongsTo(QuestionnaireVideo::class, 'video_id');
    }

    /**
     * Get the activity
     */
    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    /**
     * Get the participant
     */
    public function participant()
    {
        return $this->belongsTo(Participant::class);
    }

    /**
     * Get the user
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Format watch duration as HH:MM:SS
     */
    public function getFormattedDurationAttribute()
    {
        $hours = floor($this->watch_duration_seconds / 3600);
        $minutes = floor(($this->watch_duration_seconds % 3600) / 60);
        $seconds = $this->watch_duration_seconds % 60;

        return sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
    }

    /**
     * Scope to filter by completed status
     */
    public function scopeCompleted($query)
    {
        return $query->where('completed', true);
    }

    /**
     * Scope to filter by questionnaire
     */
    public function scopeByQuestionnaire($query, $questionnaireId)
    {
        return $query->where('questionnaire_id', $questionnaireId);
    }

    /**
     * Scope to filter by video
     */
    public function scopeByVideo($query, $videoId)
    {
        return $query->where('video_id', $videoId);
    }

    /**
     * Scope to filter by activity
     */
    public function scopeByActivity($query, $activityId)
    {
        return $query->where('activity_id', $activityId);
    }
}
