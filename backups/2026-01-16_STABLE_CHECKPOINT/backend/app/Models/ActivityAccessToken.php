<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Carbon\Carbon;

class ActivityAccessToken extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'activity_id',
        'participant_id',
        'token',
        'expires_at',
        'used_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    /**
     * Get the activity that owns the token.
     */
    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    /**
     * Get the participant that owns the token.
     */
    public function participant()
    {
        return $this->belongsTo(Participant::class);
    }

    /**
     * Generate a secure token for a participant and activity.
     */
    public static function generateToken($activityId, $participantId, $expiresInDays = 30)
    {
        // Invalidate any existing unused tokens for this participant-activity combination
        self::where('activity_id', $activityId)
            ->where('participant_id', $participantId)
            ->whereNull('used_at')
            ->delete();

        // Generate a new secure token
        $token = Str::random(64);

        return self::create([
            'activity_id' => $activityId,
            'participant_id' => $participantId,
            'token' => $token,
            'expires_at' => $expiresInDays ? Carbon::now()->addDays($expiresInDays) : null,
        ]);
    }

    /**
     * Validate a token and return the associated data.
     */
    public static function validateToken($token)
    {
        $accessToken = self::where('token', $token)
            ->with(['activity', 'participant'])
            ->first();

        if (!$accessToken) {
            return [
                'valid' => false,
                'error' => 'Invalid token'
            ];
        }

        // Check if token has expired
        if ($accessToken->expires_at && Carbon::now()->isAfter($accessToken->expires_at)) {
            return [
                'valid' => false,
                'error' => 'Token has expired'
            ];
        }

        // Check if activity is still active (status should be 'live')
        if ($accessToken->activity->status !== 'live') {
            return [
                'valid' => false,
                'error' => 'This activity is no longer active'
            ];
        }

        // Check if already used (submitted response)
        if ($accessToken->used_at) {
            // Check if there's a completed response
            $hasCompletedResponse = Response::where('activity_id', $accessToken->activity_id)
                ->where('participant_id', $accessToken->participant_id)
                ->where('status', 'completed')
                ->exists();

            if ($hasCompletedResponse) {
                return [
                    'valid' => false,
                    'error' => 'You have already completed this activity',
                    'already_completed' => true
                ];
            }
        }

        return [
            'valid' => true,
            'activity' => $accessToken->activity,
            'participant' => $accessToken->participant,
            'token_id' => $accessToken->id
        ];
    }

    /**
     * Mark the token as used.
     */
    public function markAsUsed()
    {
        $this->used_at = Carbon::now();
        $this->save();
    }

    /**
     * Check if token is expired.
     */
    public function isExpired()
    {
        return $this->expires_at && Carbon::now()->isAfter($this->expires_at);
    }

    /**
     * Check if token is used.
     */
    public function isUsed()
    {
        return !is_null($this->used_at);
    }
}
