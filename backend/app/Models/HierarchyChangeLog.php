<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HierarchyChangeLog extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'hierarchy_change_log';

    protected $fillable = [
        'user_id',
        'program_id',
        'old_manager_id',
        'new_manager_id',
        'changed_by_user_id',
        'change_type',
        'reason',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user whose hierarchy changed
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the program
     */
    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    /**
     * Get the old manager
     */
    public function oldManager()
    {
        return $this->belongsTo(User::class, 'old_manager_id');
    }

    /**
     * Get the new manager
     */
    public function newManager()
    {
        return $this->belongsTo(User::class, 'new_manager_id');
    }

    /**
     * Get the user who made the change
     */
    public function changedBy()
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }

    /**
     * Scope for a specific user
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope for a specific program
     */
    public function scopeForProgram($query, $programId)
    {
        return $query->where('program_id', $programId);
    }

    /**
     * Scope by change type
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('change_type', $type);
    }

    /**
     * Scope for recent changes
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Log a hierarchy assignment
     */
    public static function logAssignment($userId, $programId, $newManagerId, $changedByUserId, $reason = null)
    {
        return static::create([
            'user_id' => $userId,
            'program_id' => $programId,
            'old_manager_id' => null,
            'new_manager_id' => $newManagerId,
            'changed_by_user_id' => $changedByUserId,
            'change_type' => 'assigned',
            'reason' => $reason,
        ]);
    }

    /**
     * Log a hierarchy reassignment
     */
    public static function logReassignment($userId, $programId, $oldManagerId, $newManagerId, $changedByUserId, $reason = null)
    {
        return static::create([
            'user_id' => $userId,
            'program_id' => $programId,
            'old_manager_id' => $oldManagerId,
            'new_manager_id' => $newManagerId,
            'changed_by_user_id' => $changedByUserId,
            'change_type' => 'reassigned',
            'reason' => $reason,
        ]);
    }

    /**
     * Log a hierarchy removal
     */
    public static function logRemoval($userId, $programId, $oldManagerId, $changedByUserId, $reason = null)
    {
        return static::create([
            'user_id' => $userId,
            'program_id' => $programId,
            'old_manager_id' => $oldManagerId,
            'new_manager_id' => null,
            'changed_by_user_id' => $changedByUserId,
            'change_type' => 'removed',
            'reason' => $reason,
        ]);
    }
}
