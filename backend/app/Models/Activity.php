<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class Activity extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    /**
     * Boot method to handle cascading deletes
     */
    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($activity) {
            if ($activity->isForceDeleting()) {
                // Force delete all related data
                $activity->responses()->forceDelete();
                $activity->notificationTemplates()->forceDelete();
                $activity->participants()->detach();
                
                // Delete from tables that might exist (use try-catch for safety)
                try {
                    \DB::table('notification_logs')->where('activity_id', $activity->id)->delete();
                } catch (\Exception $e) {
                    // Table doesn't exist or column missing
                }
                
                try {
                    \DB::table('activity_access_tokens')->where('activity_id', $activity->id)->delete();
                } catch (\Exception $e) {
                    // Table doesn't exist
                }
                
                try {
                    \DB::table('event_contact_messages')->where('activity_id', $activity->id)->delete();
                } catch (\Exception $e) {
                    // Table doesn't exist
                }
                
                try {
                    \DB::table('evaluation_events')->where('activity_id', $activity->id)->delete();
                } catch (\Exception $e) {
                    // Table doesn't exist
                }
            } else {
                // Soft delete - cascade to related models
                $activity->responses()->delete();
                $activity->notificationTemplates()->delete();
            }
        });
    }

    protected $fillable = [
        'program_id',
        'questionnaire_id',
        'name',
        'description',
        'type',
        'start_date',
        'end_date',
        'close_date',
        'status',
        'allow_guests',
        'allow_participant_reminders',
        'is_multilingual',
        'languages',
        'settings',
        'registration_form_fields',
        'registration_flow', // NEW: 'pre_submission' or 'post_submission'
        'landing_config',
        'time_limit_enabled',
        'time_limit_minutes',
        'pass_percentage',
        'max_retakes',
        'contact_us_enabled',
        'enable_generated_links', // NEW: Enable unique generated links feature
        // Additional fields
        'sender_email',
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
        // Approval audit fields
        'approved_by',
        'approved_at',
        'approval_comments',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'close_date' => 'datetime',
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
        'contact_us_enabled' => 'boolean',
        'allow_participant_reminders' => 'boolean',
        'enable_generated_links' => 'boolean',
        // Additional fields
        'configuration_date' => 'date',
        'configuration_price' => 'decimal:2',
        'subscription_price' => 'decimal:2',
        'tax_percentage' => 'decimal:2',
        'number_of_participants' => 'integer',
        'questions_to_randomize' => 'integer',
        // Approval audit fields
        'approved_at' => 'datetime',
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

    public function responses()
    {
        return $this->hasMany(Response::class);
    }

    public function notificationTemplates()
    {
        return $this->hasMany(NotificationTemplate::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function notificationLogs()
    {
        return $this->hasMany(NotificationLog::class);
    }

    public function accessTokens()
    {
        return $this->hasMany(ActivityAccessToken::class);
    }

    public function contactMessages()
    {
        return $this->hasMany(EventContactMessage::class);
    }

    public function evaluationEvents()
    {
        return $this->hasMany(EvaluationEvent::class);
    }

    /**
     * Get notification template for a specific type
     */
    public function getNotificationTemplate(string $type)
    {
        return $this->notificationTemplates()
            ->where('notification_type', $type)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Analytics methods
     */
    public function getParticipationRate()
    {
        $totalParticipants = $this->program->participants()->where('status', 'active')->count();
        $totalResponses = $this->responses()->count();

        return $totalParticipants > 0 
            ? round(($totalResponses / $totalParticipants) * 100, 2) 
            : 0;
    }

    public function getCompletionRate()
    {
        $totalResponses = $this->responses()->count();
        $submittedResponses = $this->responses()->submitted()->count();

        return $totalResponses > 0 
            ? round(($submittedResponses / $totalResponses) * 100, 2) 
            : 0;
    }

    public function getAverageResponseTime()
    {
        return $this->responses()
            ->whereNotNull('submitted_at')
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (submitted_at - created_at))) as avg_time')
            ->value('avg_time');
    }

    public function getResponseStats()
    {
        return [
            'total' => $this->responses()->count(),
            'submitted' => $this->responses()->submitted()->count(),
            'in_progress' => $this->responses()->inProgress()->count(),
            'guests' => $this->responses()->whereNotNull('guest_identifier')->count(),
        ];
    }

    /**
     * Scopes for date-based status filtering
     */
    public function scopeUpcoming($query)
    {
        $now = Carbon::now();
        return $query->where('status', '!=', 'draft')
            ->where(function($q) use ($now) {
                $q->where('start_date', '>', $now)
                  ->orWhere('status', 'upcoming');
            });
    }

    public function scopeLive($query)
    {
        $now = Carbon::now();
        return $query->where(function($q) use ($now) {
            $q->where('status', 'live')
              ->orWhere(function($q2) use ($now) {
                  $q2->where('start_date', '<=', $now)
                     ->where(function($q3) use ($now) {
                         $q3->whereNull('end_date')
                            ->orWhere('end_date', '>=', $now);
                     });
              });
        });
    }

    public function scopeExpired($query)
    {
        $now = Carbon::now();
        return $query->where(function($q) use ($now) {
            $q->where('status', 'expired')
              ->orWhere(function($q2) use ($now) {
                  $q2->where('end_date', '<', $now)
                     ->where(function($q3) use ($now) {
                         $q3->whereNull('close_date')
                            ->orWhere('close_date', '>=', $now);
                     });
              });
        });
    }

    public function scopeClosed($query)
    {
        $now = Carbon::now();
        return $query->where(function($q) use ($now) {
            $q->where('status', 'closed')
              ->orWhere(function($q2) use ($now) {
                  $q2->whereNotNull('close_date')
                     ->where('close_date', '<', $now);
              });
        });
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeArchived($query)
    {
        return $query->where('status', 'archived');
    }

    public function scopeByProgram($query, $programId)
    {
        return $query->where('program_id', $programId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeWithGuests($query)
    {
        return $query->where('allow_guests', true);
    }

    public function scopeMultilingual($query)
    {
        return $query->where('is_multilingual', true);
    }

    /**
     * Helper methods
     */
    public function getComputedStatus()
    {
        $now = Carbon::now();
        
        // Manual statuses take precedence
        if (in_array($this->status, ['draft', 'archived'])) {
            return $this->status;
        }

        // Check closed status first
        if ($this->close_date && $now->greaterThan($this->close_date)) {
            return 'closed';
        }

        // Check expired status
        if ($this->end_date && $now->greaterThan($this->end_date)) {
            return 'expired';
        }

        // Check live status
        if ($this->start_date && $now->greaterThanOrEqualTo($this->start_date)) {
            if (!$this->end_date || $now->lessThanOrEqualTo($this->end_date)) {
                return 'live';
            }
        }

        // Check upcoming
        if ($this->start_date && $now->lessThan($this->start_date)) {
            return 'upcoming';
        }

        return $this->status;
    }

    public function isLive()
    {
        return $this->getComputedStatus() === 'live';
    }

    public function isUpcoming()
    {
        return $this->getComputedStatus() === 'upcoming';
    }

    public function isExpired()
    {
        return $this->getComputedStatus() === 'expired';
    }

    public function isClosed()
    {
        return $this->getComputedStatus() === 'closed';
    }

    public function isDraft()
    {
        return $this->status === 'draft';
    }

    public function isArchived()
    {
        return $this->status === 'archived';
    }

    public function canAcceptResponses()
    {
        return in_array($this->getComputedStatus(), ['live', 'expired']);
    }

    // Participant Relationships
    public function participants()
    {
        return $this->belongsToMany(Participant::class, 'activity_participant')
                    ->withPivot('joined_at')
                    ->withTimestamps();
    }

    public function authenticatedParticipants()
    {
        return $this->participants()->where('is_guest', false);
    }

    public function guestParticipants()
    {
        return $this->participants()->where('is_guest', true);
    }

    // Response Relationships
    public function authenticatedResponses()
    {
        return $this->hasMany(Response::class)
                    ->whereHas('participant', function($q) {
                        $q->where('is_guest', false);
                    });
    }

    public function guestResponses()
    {
        return $this->hasMany(Response::class)
                    ->whereHas('participant', function($q) {
                        $q->where('is_guest', true);
                    });
    }
}
