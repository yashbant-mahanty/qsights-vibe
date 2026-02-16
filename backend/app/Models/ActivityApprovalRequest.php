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
        'expected_participants',
        'questions_to_randomize',
        'allow_guests',
        'contact_us_enabled',
        'enable_generated_links',
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
        'activity_id', // Link to existing draft activity
        // Manager review workflow fields
        'manager_review_status',
        'manager_reviewed_at',
        'manager_reviewed_by',
        'manager_review_notes',
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
        'expected_participants' => 'integer',
        'questions_to_randomize' => 'integer',
        'allow_guests' => 'boolean',
        'contact_us_enabled' => 'boolean',
        'enable_generated_links' => 'boolean',
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
        'manager_reviewed_at' => 'datetime',
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

    public function managerReviewedBy()
    {
        return $this->belongsTo(User::class, 'manager_reviewed_by');
    }

    public function managerReviewTokens()
    {
        return $this->hasMany(ManagerReviewToken::class, 'approval_request_id');
    }

    public function activeManagerReviewToken()
    {
        return $this->hasOne(ManagerReviewToken::class, 'approval_request_id')
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->latest();
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
     * Check if awaiting manager review
     */
    public function isAwaitingManagerReview(): bool
    {
        return $this->status === 'pending' && $this->manager_review_status === 'pending';
    }

    /**
     * Check if manager has approved
     */
    public function isManagerApproved(): bool
    {
        return $this->manager_review_status === 'approved';
    }

    /**
     * Check if manager review is not required
     */
    public function isManagerReviewNotRequired(): bool
    {
        return $this->manager_review_status === 'not_required';
    }

    /**
     * Check if ready for super admin approval
     */
    public function isReadyForSuperAdminReview(): bool
    {
        return $this->status === 'pending' 
            && ($this->isManagerApproved() || $this->isManagerReviewNotRequired());
    }

    /**
     * Scope: Awaiting manager review
     */
    public function scopeAwaitingManagerReview($query)
    {
        return $query->where('status', 'pending')
            ->where('manager_review_status', 'pending');
    }

    /**
     * Scope: Manager approved
     */
    public function scopeManagerApproved($query)
    {
        return $query->where('manager_review_status', 'approved');
    }

    /**
     * 
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
