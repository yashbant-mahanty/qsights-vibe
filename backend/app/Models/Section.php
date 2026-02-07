<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Section extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'questionnaire_id',
        'title',
        'description',
        'order',
        'conditional_logic',
        'translations',
    ];

    protected $casts = [
        'conditional_logic' => 'array',
        'translations' => 'array',
        'order' => 'integer',
    ];

    /**
     * Boot method to handle cascading deletes
     */
    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($section) {
            if ($section->isForceDeleting()) {
                $section->questions()->forceDelete();
            } else {
                $section->questions()->delete();
            }
        });

        static::restoring(function ($section) {
            $section->questions()->withTrashed()->restore();
        });
    }

    /**
     * Get the questionnaire that owns the section
     */
    public function questionnaire()
    {
        return $this->belongsTo(Questionnaire::class);
    }

    /**
     * Get all questions for the section
     */
    public function questions()
    {
        return $this->hasMany(Question::class)->orderBy('order');
    }
}
