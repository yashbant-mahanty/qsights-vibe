<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'communication_email',
        'password',
        'role',
        'default_services',
        'organization_id',
        'program_id',
        'reports_to_user_id',
        'avatar',
        'phone',
        'status',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        'bio',
        'preferences',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'preferences' => 'array',
            'default_services' => 'array',
        ];
    }

    /**
     * Get the organization that the user belongs to
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the program that the user belongs to
     */
    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    /**
     * Check if user has a specific role
     */
    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    /**
     * Check if user has any of the given roles
     */
    public function hasAnyRole(array $roles): bool
    {
        return in_array($this->role, $roles);
    }

    /**
     * Scope to filter users by role
     */
    public function scopeRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    // ============================================
    // HIERARCHY RELATIONSHIPS
    // ============================================

    /**
     * Get the manager this user reports to (legacy)
     */
    public function reportsTo()
    {
        return $this->belongsTo(User::class, 'reports_to_user_id');
    }

    /**
     * Get the manager this user reports to (new hierarchy system)
     */
    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_user_id');
    }

    /**
     * Get the hierarchical role assigned to this user
     */
    public function hierarchicalRole()
    {
        return $this->belongsTo(HierarchicalRole::class);
    }

    /**
     * Get all hierarchical role assignments for this user
     */
    public function roleHierarchies()
    {
        return $this->hasMany(UserRoleHierarchy::class, 'user_id');
    }

    /**
     * Get the active role hierarchy for a specific program
     */
    public function roleHierarchyForProgram($programId)
    {
        return $this->roleHierarchies()
            ->where('program_id', $programId)
            ->with(['hierarchicalRole', 'manager', 'program'])
            ->first();
    }

    /**
     * Get all users who report directly to this user (new hierarchy system)
     */
    public function managedUsers()
    {
        return $this->hasMany(UserRoleHierarchy::class, 'manager_user_id');
    }

    /**
     * Get manager dashboard access settings
     */
    public function managerDashboardAccess()
    {
        return $this->hasMany(ManagerDashboardAccess::class, 'manager_user_id');
    }

    /**
     * Get hierarchy change logs for this user
     */
    public function hierarchyChangeLogs()
    {
        return $this->hasMany(HierarchyChangeLog::class, 'user_id');
    }

    /**
     * Get all users who report directly to this user (legacy)
     */
    public function directReports()
    {
        return $this->hasMany(User::class, 'reports_to_user_id');
    }

    /**
     * Get all participants who report to this user
     */
    public function participantReports()
    {
        return $this->hasMany(Participant::class, 'reports_to_user_id');
    }

    /**
     * Check if this user is a manager (has direct reports in new hierarchy system)
     */
    public function isManager(): bool
    {
        return $this->managedUsers()->exists() 
            || $this->directReports()->exists() 
            || $this->participantReports()->exists();
    }

    /**
     * Check if this user is a manager in a specific program
     */
    public function isManagerInProgram($programId): bool
    {
        return $this->managedUsers()
            ->where('program_id', $programId)
            ->exists();
    }

    /**
     * Get all direct reports for a specific program
     */
    public function getDirectReportsForProgram($programId)
    {
        return $this->managedUsers()
            ->where('program_id', $programId)
            ->with(['user', 'hierarchicalRole'])
            ->get()
            ->pluck('user');
    }

    /**
     * Get all subordinates recursively in new hierarchy system
     */
    public function getAllSubordinatesInProgram($programId, $depth = 0, $maxDepth = 10): array
    {
        if ($depth >= $maxDepth) {
            return [];
        }

        $subordinates = [];
        $directReports = $this->getDirectReportsForProgram($programId);

        foreach ($directReports as $user) {
            $subordinates[] = [
                'type' => 'user',
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'depth' => $depth + 1
            ];
            
            // Recursively get their subordinates
            $subSubordinates = $user->getAllSubordinatesInProgram($programId, $depth + 1, $maxDepth);
            $subordinates = array_merge($subordinates, $subSubordinates);
        }

        return $subordinates;
    }

    /**
     * Check if assigning a manager would create a circular reference
     */
    public function wouldCreateCircularReference($proposedManagerId, $programId): bool
    {
        if ($this->id === $proposedManagerId) {
            return true; // Self-reference
        }

        // Get all subordinates of this user
        $subordinates = $this->getAllSubordinatesInProgram($programId);
        $subordinateIds = collect($subordinates)->pluck('id')->toArray();

        // If proposed manager is in subordinates, it's circular
        return in_array($proposedManagerId, $subordinateIds);
    }

    /**
     * Check if this user is a manager (has direct reports) - legacy
     * @deprecated Use isManager() instead
     */
    public function isManagerLegacy(): bool
    {
        return $this->directReports()->exists() || $this->participantReports()->exists();
    }

    /**
     * Get all subordinates recursively (users + participants)
     */
    public function getAllSubordinates(): array
    {
        $subordinates = [];
        
        // Direct user reports
        foreach ($this->directReports as $user) {
            $subordinates[] = ['type' => 'user', 'id' => $user->id, 'name' => $user->name, 'email' => $user->email];
            // Recursively get their subordinates
            $subordinates = array_merge($subordinates, $user->getAllSubordinates());
        }
        
        // Direct participant reports
        foreach ($this->participantReports as $participant) {
            $subordinates[] = ['type' => 'participant', 'id' => $participant->id, 'name' => $participant->name, 'email' => $participant->email];
            // Recursively get their subordinates
            $subordinates = array_merge($subordinates, $participant->getAllSubordinates());
        }
        
        return $subordinates;
    }

    /**
     * Get hierarchy level (distance from top)
     */
    public function getHierarchyLevel(): int
    {
        $level = 1;
        $current = $this;
        
        while ($current->reportsTo) {
            $level++;
            $current = $current->reportsTo;
        }
        
        return $level;
    }

    // ============================================
    // EVALUATION RELATIONSHIPS
    // ============================================

    /**
     * Get evaluation events created by this user
     */
    public function createdEvaluationEvents()
    {
        return $this->hasMany(EvaluationEvent::class, 'created_by');
    }

    /**
     * Get evaluation assignments triggered by this user
     */
    public function triggeredEvaluationAssignments()
    {
        return $this->hasMany(EvaluationAssignment::class, 'triggered_by');
    }
}
