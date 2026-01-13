<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Participant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'name',
        'email',
        'phone',
        'avatar',
        'notes',
        'additional_data',
        'status',
        'is_guest',
        'guest_code',
        'is_preview',
        'preview_user_role',
        'preview_user_email',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'is_guest' => 'boolean',
        'is_preview' => 'boolean',
        'additional_data' => 'array',
    ];

    protected $appends = ['participant_type'];

    /**
     * Boot method to handle cascading deletes
     */
    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($participant) {
            if ($participant->isForceDeleting()) {
                // Force delete pivot relationships
                $participant->programs()->detach();
                $participant->activities()->detach();
            }
            // Soft deletes automatically handled by pivot table queries
        });
    }

    /**
     * Get the organization that the participant belongs to
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get all programs assigned to this participant (many-to-many)
     */
    public function programs()
    {
        return $this->belongsToMany(Program::class, 'participant_program')
                    ->withTimestamps()
                    ->withPivot('assigned_at');
    }

    /**
     * Get all activities linked to this participant
     */
    public function activities()
    {
        return $this->belongsToMany(Activity::class, 'activity_participant')
                    ->withPivot('joined_at')
                    ->withTimestamps();
    }

    /**
     * Get all responses by this participant
     */
    public function responses()
    {
        return $this->hasMany(Response::class);
    }

    /**
     * Scope to filter by organization
     */
    public function scopeByOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter by program
     */
    public function scopeByProgram($query, $programId)
    {
        return $query->whereHas('programs', function ($q) use ($programId) {
            $q->where('programs.id', $programId);
        });
    }

    /**
     * Scope to get only active participants
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to get only inactive participants
     */
    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }

    /**
     * Scope to get only authenticated participants
     */
    public function scopeAuthenticated($query)
    {
        return $query->where('is_guest', false);
    }

    /**
     * Scope to get only guest participants
     */
    public function scopeGuest($query)
    {
        return $query->where('is_guest', true);
    }

    /**
     * Accessor for participant type
     */
    public function getParticipantTypeAttribute()
    {
        return $this->is_guest ? 'guest' : 'authenticated';
    }

    /**
     * Create a guest participant
     */
    public static function createGuest($name, $email, $activityId, $additionalData = null)
    {
        $activity = Activity::findOrFail($activityId);
        
        // Check if guest with this email already exists for this activity
        $existingGuest = self::where('email', $email)
                            ->where('is_guest', true)
                            ->whereHas('activities', function($q) use ($activityId) {
                                $q->where('activities.id', $activityId);
                            })
                            ->first();

        if ($existingGuest) {
            return $existingGuest;
        }

        // Create new guest participant
        $guest = self::create([
            'name' => $name,
            'email' => $email,
            'organization_id' => $activity->program->organization_id,
            'is_guest' => true,
            'guest_code' => (string) Str::uuid(),
            'status' => 'active',
            'additional_data' => $additionalData,
        ]);

        // Link to activity's program
        $guest->programs()->syncWithoutDetaching([$activity->program_id]);
        
        // Link to activity
        $guest->activities()->syncWithoutDetaching([$activityId]);

        return $guest;
    }

    /**
     * Find or create participant from activity link
     */
    public static function findOrCreateFromActivityLink($name, $email, $activityId, $additionalData = null)
    {
        $activity = Activity::with('program')->findOrFail($activityId);
        
        // Determine if this is anonymous registration
        $isAnonymous = isset($additionalData['participant_type']) && $additionalData['participant_type'] === 'anonymous';

        // Check if authenticated participant exists
        $existingParticipant = self::where('email', $email)
                                  ->where('is_guest', false)
                                  ->first();

        if ($existingParticipant) {
            // Update additional_data if provided (for anonymous flag, etc.)
            if ($additionalData) {
                $existingParticipant->update(['additional_data' => $additionalData]);
            }
            
            // Add to program if not already in it
            $existingParticipant->programs()->syncWithoutDetaching([$activity->program_id]);
            
            // Add to activity
            $existingParticipant->activities()->syncWithoutDetaching([$activityId]);

            return $existingParticipant;
        }

        // Check if guest with this email exists
        $existingGuest = self::where('email', $email)
                            ->where('is_guest', true)
                            ->first();

        if ($existingGuest) {
            // Update name and additional_data if provided
            $updateData = [];
            if ($name) {
                $updateData['name'] = $name;
            }
            if ($additionalData) {
                $updateData['additional_data'] = $additionalData;
            }
            if (!empty($updateData)) {
                $existingGuest->update($updateData);
            }
            
            // Add to program and activity
            $existingGuest->programs()->syncWithoutDetaching([$activity->program_id]);
            $existingGuest->activities()->syncWithoutDetaching([$activityId]);

            return $existingGuest;
        }

        // Create new participant - guest if anonymous, regular participant otherwise
        if ($isAnonymous) {
            return self::createGuest($name, $email, $activityId, $additionalData);
        } else {
            // Create regular participant for Registration link
            $participant = self::create([
                'name' => $name,
                'email' => $email,
                'organization_id' => $activity->program->organization_id,
                'is_guest' => false,
                'status' => 'active',
                'additional_data' => $additionalData,
            ]);

            // Link to activity's program
            $participant->programs()->syncWithoutDetaching([$activity->program_id]);
            
            // Link to activity
            $participant->activities()->syncWithoutDetaching([$activityId]);

            return $participant;
        }
    }
}
