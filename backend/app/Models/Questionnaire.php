<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Questionnaire extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'program_id',
        'title',
        'description',
        'type',
        'is_multilingual',
        'languages',
        'status',
        'scheduled_start',
        'scheduled_end',
        'settings',
    ];

    protected $casts = [
        'is_multilingual' => 'boolean',
        'languages' => 'array',
        'settings' => 'array',
        'scheduled_start' => 'datetime',
        'scheduled_end' => 'datetime',
    ];

    /**
     * Boot method to handle cascading deletes
     */
    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($questionnaire) {
            if ($questionnaire->isForceDeleting()) {
                $questionnaire->sections()->forceDelete();
            } else {
                $questionnaire->sections()->delete();
            }
        });

        static::restoring(function ($questionnaire) {
            $questionnaire->sections()->withTrashed()->restore();
        });
    }

    /**
     * Get the program that owns the questionnaire
     */
    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    /**
     * Get all sections for the questionnaire
     */
    public function sections()
    {
        return $this->hasMany(Section::class)->orderBy('order');
    }

    public function activities()
    {
        return $this->hasMany(Activity::class);
    }

    public function responses()
    {
        return $this->hasManyThrough(
            Response::class,
            Activity::class,
            'questionnaire_id',  // Foreign key on activities table
            'activity_id',       // Foreign key on responses table
            'id',                // Local key on questionnaires table
            'id'                 // Local key on activities table
        );
    }


    /**
     * Scope to filter by program
     */
    public function scopeByProgram($query, $programId)
    {
        return $query->where('program_id', $programId);
    }

    /**
     * Scope to get only published questionnaires
     */
    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    /**
     * Scope to get only draft questionnaires
     */
    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    /**
     * Check if questionnaire is currently active based on schedule
     */
    public function isActive(): bool
    {
        if ($this->status !== 'published') {
            return false;
        }

        $now = now();
        
        if ($this->scheduled_start && $now->isBefore($this->scheduled_start)) {
            return false;
        }

        if ($this->scheduled_end && $now->isAfter($this->scheduled_end)) {
            return false;
        }

        return true;
    }
}
