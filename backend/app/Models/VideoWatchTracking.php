<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VideoWatchTracking extends Model
{
    use HasFactory;

    protected $table = 'video_watch_tracking';

    protected $fillable = [
        'response_id',
        'participant_id',
        'activity_id',
        'question_id',
        'watch_time_seconds',
        'watch_time_formatted',
        'completed_watch',
        'completion_percentage',
        'total_plays',
        'total_pauses',
        'total_seeks',
        'first_played_at',
        'last_updated_at',
    ];

    protected $casts = [
        'watch_time_seconds' => 'integer',
        'completed_watch' => 'boolean',
        'completion_percentage' => 'decimal:2',
        'total_plays' => 'integer',
        'total_pauses' => 'integer',
        'total_seeks' => 'integer',
        'first_played_at' => 'datetime',
        'last_updated_at' => 'datetime',
    ];

    /**
     * Get the response this tracking belongs to
     */
    public function response()
    {
        return $this->belongsTo(Response::class, 'response_id');
    }

    /**
     * Get the participant this tracking belongs to
     */
    public function participant()
    {
        return $this->belongsTo(Participant::class, 'participant_id');
    }

    /**
     * Get the activity this tracking belongs to
     */
    public function activity()
    {
        return $this->belongsTo(Activity::class, 'activity_id');
    }

    /**
     * Get the question this tracking belongs to
     */
    public function question()
    {
        return $this->belongsTo(Question::class, 'question_id');
    }

    /**
     * Format seconds to HH:MM:SS
     */
    public static function formatSeconds($seconds)
    {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $secs = $seconds % 60;
        
        return sprintf('%02d:%02d:%02d', $hours, $minutes, $secs);
    }

    /**
     * Update watch time and recalculate formatted time
     */
    public function updateWatchTime($seconds)
    {
        $this->watch_time_seconds = $seconds;
        $this->watch_time_formatted = self::formatSeconds($seconds);
        $this->save();
    }
}
