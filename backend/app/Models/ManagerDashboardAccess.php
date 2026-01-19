<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ManagerDashboardAccess extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'manager_dashboard_access';

    protected $fillable = [
        'manager_user_id',
        'program_id',
        'can_view_activities',
        'can_view_events',
        'can_view_questionnaires',
        'can_view_notifications',
        'can_export_reports',
    ];

    protected $casts = [
        'can_view_activities' => 'boolean',
        'can_view_events' => 'boolean',
        'can_view_questionnaires' => 'boolean',
        'can_view_notifications' => 'boolean',
        'can_export_reports' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the manager user
     */
    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_user_id');
    }

    /**
     * Get the program
     */
    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    /**
     * Scope for a specific manager
     */
    public function scopeForManager($query, $managerId)
    {
        return $query->where('manager_user_id', $managerId);
    }

    /**
     * Scope for a specific program
     */
    public function scopeForProgram($query, $programId)
    {
        return $query->where('program_id', $programId);
    }

    /**
     * Check if manager has full access
     */
    public function hasFullAccess(): bool
    {
        return $this->can_view_activities
            && $this->can_view_events
            && $this->can_view_questionnaires
            && $this->can_view_notifications
            && $this->can_export_reports;
    }

    /**
     * Grant full access to manager
     */
    public function grantFullAccess(): void
    {
        $this->update([
            'can_view_activities' => true,
            'can_view_events' => true,
            'can_view_questionnaires' => true,
            'can_view_notifications' => true,
            'can_export_reports' => true,
        ]);
    }

    /**
     * Revoke all access from manager
     */
    public function revokeAllAccess(): void
    {
        $this->update([
            'can_view_activities' => false,
            'can_view_events' => false,
            'can_view_questionnaires' => false,
            'can_view_notifications' => false,
            'can_export_reports' => false,
        ]);
    }
}
