<?php

namespace App\Policies;

use App\Models\Organization;
use App\Models\User;

class OrganizationPolicy
{
    /**
     * Determine if the user can view any organizations.
     */
    public function viewAny(User $user): bool
    {
        return true; // All authenticated users can view list
    }

    /**
     * Determine if the user can view the organization.
     */
    public function view(User $user, Organization $organization): bool
    {
        return true; // All authenticated users can view
    }

    /**
     * Determine if the user can create organizations.
     */
    public function create(User $user): bool
    {
        return $user->hasAnyRole(['super-admin', 'admin']);
    }

    /**
     * Determine if the user can update the organization.
     */
    public function update(User $user, Organization $organization): bool
    {
        return $user->hasAnyRole(['super-admin', 'admin']);
    }

    /**
     * Determine if the user can delete the organization.
     */
    public function delete(User $user, Organization $organization): bool
    {
        return $user->hasAnyRole(['super-admin', 'admin']);
    }

    /**
     * Determine if the user can restore the organization.
     */
    public function restore(User $user, Organization $organization): bool
    {
        return $user->hasRole('super-admin');
    }

    /**
     * Determine if the user can permanently delete the organization.
     */
    public function forceDelete(User $user, Organization $organization): bool
    {
        return $user->hasRole('super-admin');
    }
}
