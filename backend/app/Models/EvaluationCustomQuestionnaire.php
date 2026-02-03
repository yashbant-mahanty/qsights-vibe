<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EvaluationCustomQuestionnaire extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'evaluation_custom_questionnaires';

    protected $fillable = [
        'organization_id',
        'program_id',
        'questionnaire_id',
        'questionnaire_name',
        'added_by',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the organization that owns this custom questionnaire assignment.
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the questionnaire.
     */
    public function questionnaire()
    {
        return $this->belongsTo(Questionnaire::class);
    }

    /**
     * Get the user who added this questionnaire.
     */
    public function addedBy()
    {
        return $this->belongsTo(User::class, 'added_by');
    }
}
