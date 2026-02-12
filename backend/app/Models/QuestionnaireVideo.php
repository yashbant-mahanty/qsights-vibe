<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class QuestionnaireVideo extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'questionnaire_id',
        'video_url',
        'thumbnail_url',
        'video_type',
        'display_mode',
        'must_watch',
        'autoplay',
        'video_duration_seconds',
        'created_by',
    ];

    protected $casts = [
        'must_watch' => 'boolean',
        'autoplay' => 'boolean',
        'video_duration_seconds' => 'integer',
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
     * Get the questionnaire that owns the video
     */
    public function questionnaire()
    {
        return $this->belongsTo(Questionnaire::class);
    }

    /**
     * Get all view logs for this video
     */
    public function viewLogs()
    {
        return $this->hasMany(VideoViewLog::class, 'video_id');
    }

    /**
     * Get the creator of the video
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Format watch duration as HH:MM:SS
     */
    public function getFormattedDurationAttribute()
    {
        if (!$this->video_duration_seconds) {
            return '00:00:00';
        }

        $hours = floor($this->video_duration_seconds / 3600);
        $minutes = floor(($this->video_duration_seconds % 3600) / 60);
        $seconds = $this->video_duration_seconds % 60;

        return sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
    }
}
