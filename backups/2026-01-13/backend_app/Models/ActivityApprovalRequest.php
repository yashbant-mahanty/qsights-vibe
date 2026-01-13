<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ActivityApprovalRequest extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'program_id',
        'questionnaire_id',
        'requested_by',
        'reviewed_by',
        'name',
        'sender_email',
        'description',
        'type',
        'start_date',
        'end_date',
        'close_date',
        'manager_name',
        'manager_email',
        'project_code',
        'configuration_date',
        'configuration_price',
        'subscription_price',
        'subscription_frequency',
        'tax_percentage',
        'number_of_participants',
        'questions_to_randomize',
        'allow_guests',
        'is_multilingual',
        'languages',
        'settings',
        'registration_form_fields',
        'landing_config',
        'time_limit_enabled',
        'time_limit_minutes',
        'pass_percentage',
        'max_retakes',
        'status',
        'remarks',
        'reviewed_at',
        'created_activity_id',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'close_date' => 'datetime',
        'configuration_date' => 'date',
        'configuration_price' => 'decimal:2',
        'subscription_price' => 'decimal:2',
        'tax_percentage' => 'decimal:2',
        'number_of_participants' => 'integer',
        'questions_to_randomize' => 'integer',
        'allow_guests' => 'boolean',
        'is_multilingual' => 'boolean',
        'languages' => 'array',
        'settings' => 'array',
        'registration_form_fields' => 'array',
        'landing_config' => 'array',
        'time_limit_enabled' => 'boolean',
        'time_limit_minutes' => 'integer',
        'pass_percentage' => 'decimal:2',
        'max_retakes' => 'integer',
        'reviewed_at' => 'datetime',
    ];

    /**
     * Relationships
     */
    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    public function questionnaire()
    {
        return $this->belongsTo(Questionnaire::class);
    }

    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewedBy()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function createdActivity()
    {
        return $this->belongsTo(Activity::class, 'created_activity_id');
    }

    /**
     * Scopes
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopeByProgram($query, $programId)
    {
        return $query->where('program_id', $programId);
    }

    /**
     * Check if request is pending
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if request is approved
     */
    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    /**
     * Check if request is rejected
     */
    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    /**
     * Append additional attributes for frontend compatibility
     */
    protected $appends = ['requested_by_user', 'reviewed_by_user'];

    /**
     * Accessor for requested_by_user (snake_case alias for requestedBy)
     */
    public function getRequestedByUserAttribute()
    {
        return $this->requestedBy;
    }

    /**
     * Accessor for reviewed_by_user (snake_case alias for reviewedBy)
     */
    public function getReviewedByUserAttribute()
    {
        return $this->reviewedBy;
    }
}
