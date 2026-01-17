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
     * Get the manager this user reports to
     */
    public function reportsTo()
    {
        return $this->belongsTo(User::class, 'reports_to_user_id');
    }

    /**
     * Get all users who report directly to this user
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
     * Check if this user is a manager (has direct reports)
     */
    public function isManager(): bool
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
