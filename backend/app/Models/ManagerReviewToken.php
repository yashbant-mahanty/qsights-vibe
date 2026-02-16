<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class ManagerReviewToken extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'approval_request_id',
        'manager_id',
        'manager_email',
        'token_hash',
        'expires_at',
        'used',
        'used_at',
        'used_from_ip',
        'user_agent',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
        'used' => 'boolean',
    ];

    protected $hidden = [
        'token_hash',
    ];

    /**
     * Token expiration time (in hours)
     */
    const TOKEN_EXPIRATION_HOURS = 72; // 3 days

    /**
     * Relationships
     */
    public function approvalRequest()
    {
        return $this->belongsTo(ActivityApprovalRequest::class, 'approval_request_id');
    }

    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /**
     * Generate a secure token for manager review
     */
    public static function generateToken(ActivityApprovalRequest $approvalRequest, string $managerEmail, ?string $managerId = null): array
    {
        // Generate cryptographically secure random token
        $token = Str::random(64) . '_' . time() . '_' . Str::random(16);
        
        // Create token hash for storage
        $tokenHash = Hash::make($token);
        
        // Create the token record
        $reviewToken = self::create([
            'approval_request_id' => $approvalRequest->id,
            'manager_id' => $managerId,
            'manager_email' => $managerEmail,
            'token_hash' => hash('sha256', $token), // Use SHA-256 for verification
            'expires_at' => Carbon::now()->addHours(self::TOKEN_EXPIRATION_HOURS),
            'used' => false,
        ]);
        
        return [
            'token' => $token,
            'record' => $reviewToken,
        ];
    }

    /**
     * Verify and retrieve token
     */
    public static function verifyToken(string $token): ?self
    {
        $tokenHash = hash('sha256', $token);
        
        $reviewToken = self::where('token_hash', $tokenHash)
            ->where('used', false)
            ->where('expires_at', '>', Carbon::now())
            ->first();
        
        return $reviewToken;
    }

    /**
     * Mark token as used
     */
    public function markAsUsed(?string $ipAddress = null, ?string $userAgent = null): bool
    {
        $this->used = true;
        $this->used_at = Carbon::now();
        $this->used_from_ip = $ipAddress;
        $this->user_agent = $userAgent;
        
        return $this->save();
    }

    /**
     * Invalidate all tokens for an approval request
     */
    public static function invalidateForRequest(string $approvalRequestId): int
    {
        return self::where('approval_request_id', $approvalRequestId)
            ->where('used', false)
            ->update([
                'used' => true,
                'used_at' => Carbon::now(),
            ]);
    }

    /**
     * Check if token is valid
     */
    public function isValid(): bool
    {
        return !$this->used 
            && $this->expires_at > Carbon::now()
            && !$this->deleted_at;
    }

    /**
     * Check if token is expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at <= Carbon::now();
    }

    /**
     * Scope: Only valid tokens
     */
    public function scopeValid($query)
    {
        return $query->where('used', false)
            ->where('expires_at', '>', Carbon::now());
    }

    /**
     * Scope: Expired tokens
     */
    public function scopeExpired($query)
    {
        return $query->where('expires_at', '<=', Carbon::now());
    }

    /**
     * Scope: Used tokens
     */
    public function scopeUsed($query)
    {
        return $query->where('used', true);
    }
}
