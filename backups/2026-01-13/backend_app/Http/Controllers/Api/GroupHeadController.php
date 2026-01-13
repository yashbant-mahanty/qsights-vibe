<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GroupHead;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

class GroupHeadController extends Controller
{
    /**
     * Display a listing of group heads.
     */
    public function index(Request $request)
    {
        $query = GroupHead::with(['organization', 'user'])->withCount([
            'programs' => function($query) {
                $query->where('status', 'active')
                      ->whereNull('deleted_at');
            }
        ]);
        
        // Only include active, non-deleted group heads
        if (!$request->boolean('with_trashed')) {
            $query->where('status', 'active')
                  ->whereNull('deleted_at');
        }
        
        // Filter by organization
        if ($request->has('organization_id')) {
            $query->where('organization_id', $request->organization_id);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->whereHas('user', function($userQuery) use ($search) {
                    $userQuery->where('name', 'ilike', "%{$search}%")
                              ->orWhere('email', 'ilike', "%{$search}%");
                })
                ->orWhere('phone', 'ilike', "%{$search}%")
                ->orWhere('department', 'ilike', "%{$search}%");
            });
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Include trashed
        if ($request->boolean('with_trashed')) {
            $query->withTrashed();
        }

        $groupHeads = $query->paginate($request->input('per_page', 15));
        
        // Add participant counts for each group head
        $groupHeads->getCollection()->transform(function ($groupHead) {
            // Count active participants from this group head's programs
            $activeParticipants = \App\Models\Participant::whereHas('programs', function($q) use ($groupHead) {
                $q->where('group_head_id', $groupHead->id)
                  ->where('programs.status', 'active')
                  ->whereNull('programs.deleted_at');
            })
            ->where('participants.status', 'active')
            ->whereNull('participants.deleted_at')
            ->distinct()
            ->count('participants.id');
            
            // Count inactive participants from this group head's programs
            $inactiveParticipants = \App\Models\Participant::whereHas('programs', function($q) use ($groupHead) {
                $q->where('group_head_id', $groupHead->id)
                  ->where('programs.status', 'active')
                  ->whereNull('programs.deleted_at');
            })
            ->where('participants.status', 'inactive')
            ->whereNull('participants.deleted_at')
            ->distinct()
            ->count('participants.id');
            
            // Count guest participants from this group head's programs
            $guestParticipants = \App\Models\Participant::whereHas('programs', function($q) use ($groupHead) {
                $q->where('group_head_id', $groupHead->id)
                  ->where('programs.status', 'active')
                  ->whereNull('programs.deleted_at');
            })
            ->where('participants.is_guest', true)
            ->whereNull('participants.deleted_at')
            ->distinct()
            ->count('participants.id');
            
            // Count ALL non-guest participants regardless of status (for total display)
            $totalAuthenticated = \App\Models\Participant::whereHas('programs', function($q) use ($groupHead) {
                $q->where('group_head_id', $groupHead->id)
                  ->where('programs.status', 'active')
                  ->whereNull('programs.deleted_at');
            })
            ->where('participants.is_guest', false)
            ->whereNull('participants.deleted_at')
            ->distinct()
            ->count('participants.id');
            
            $groupHead->active_participants_count = $activeParticipants;
            $groupHead->inactive_participants_count = $inactiveParticipants;
            $groupHead->guest_participants_count = $guestParticipants;
            $groupHead->total_authenticated_count = $totalAuthenticated;
            $groupHead->participants_count = $totalAuthenticated + $guestParticipants;
            
            return $groupHead;
        });
        
        return response()->json($groupHeads);
    }

    /**
     * Store a newly created group head.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'organization_id' => 'required|integer|exists:organizations,id',
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'department' => 'nullable|string|max:100',
            'designation' => 'nullable|string|max:100',
            'status' => 'nullable|in:active,inactive',
            'logo' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:2048', // 2MB max
        ]);

        // Handle logo upload
        $logoPath = null;
        if ($request->hasFile('logo')) {
            $logo = $request->file('logo');
            $filename = time() . '_' . Str::random(10) . '.' . $logo->getClientOriginalExtension();
            $logoPath = $logo->storeAs('group-heads', $filename, 'public');
        }

        // Generate a random password
        $generatedPassword = Str::random(12);
        
        // Create user account
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($generatedPassword),
            'role' => 'admin', // Group heads are admins
        ]);

        // Create group head
        $groupHead = GroupHead::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'organization_id' => $validated['organization_id'],
            'user_id' => $user->id,
            'phone' => $validated['phone'] ?? null,
            'department' => $validated['department'] ?? null,
            'designation' => $validated['designation'] ?? null,
            'status' => $validated['status'] ?? 'active',
            'logo' => $logoPath,
        ]);

        $groupHead->load(['organization', 'user']);
        
        return response()->json([
            'message' => 'Group Head created successfully',
            'data' => $groupHead,
            'credentials' => [
                'email' => $user->email,
                'password' => $generatedPassword,
                'note' => 'Please save these credentials. The password will not be shown again.'
            ]
        ], 201);
    }

    /**
     * Display the specified group head.
     */
    public function show(string $id)
    {
        $groupHead = GroupHead::with(['organization', 'user', 'programs'])
            ->findOrFail($id);

        return response()->json(['data' => $groupHead]);
    }

    /**
     * Update the specified group head.
     */
    public function update(Request $request, string $id)
    {
        $groupHead = GroupHead::findOrFail($id);
        
        $validated = $request->validate([
            'organization_id' => 'sometimes|required|integer|exists:organizations,id',
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $groupHead->user_id,
            'phone' => 'nullable|string|max:20',
            'department' => 'nullable|string|max:100',
            'designation' => 'nullable|string|max:100',
            'status' => 'sometimes|in:active,inactive',
            'logo' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:2048', // 2MB max
        ]);

        // Handle logo upload
        if ($request->hasFile('logo')) {
            // Delete old logo if exists
            if ($groupHead->logo && \Storage::disk('public')->exists($groupHead->logo)) {
                \Storage::disk('public')->delete($groupHead->logo);
            }
            
            $logo = $request->file('logo');
            $filename = time() . '_' . Str::random(10) . '.' . $logo->getClientOriginalExtension();
            $validated['logo'] = $logo->storeAs('group-heads', $filename, 'public');
        }

        // Update user if name or email changed
        if (isset($validated['name']) || isset($validated['email'])) {
            $groupHead->user->update([
                'name' => $validated['name'] ?? $groupHead->user->name,
                'email' => $validated['email'] ?? $groupHead->user->email,
            ]);
        }

        // Update group head
        $groupHead->update([
            'organization_id' => $validated['organization_id'] ?? $groupHead->organization_id,
            'phone' => $validated['phone'] ?? $groupHead->phone,
            'department' => $validated['department'] ?? $groupHead->department,
            'designation' => $validated['designation'] ?? $groupHead->designation,
            'status' => $validated['status'] ?? $groupHead->status,
            'logo' => $validated['logo'] ?? $groupHead->logo,
        ]);

        $groupHead->load(['organization', 'user']);
        
        return response()->json([
            'message' => 'Group Head updated successfully',
            'data' => $groupHead
        ]);
    }

    /**
     * Soft delete the specified group head.
     */
    public function destroy(string $id)
    {
        $groupHead = GroupHead::findOrFail($id);
        $groupHead->delete();

        // Also soft delete the associated user
        $groupHead->user->delete();
        
        return response()->json([
            'message' => 'Group Head deleted successfully'
        ]);
    }

    /**
     * Deactivate group head.
     */
    public function deactivate(string $id)
    {
        $groupHead = GroupHead::findOrFail($id);
        $groupHead->update(['status' => 'inactive']);
        
        return response()->json([
            'message' => 'Group Head deactivated successfully',
            'data' => $groupHead
        ]);
    }

    /**
     * Activate group head.
     */
    public function activate(string $id)
    {
        $groupHead = GroupHead::findOrFail($id);
        $groupHead->update(['status' => 'active']);
        
        return response()->json([
            'message' => 'Group Head activated successfully',
            'data' => $groupHead
        ]);
    }

    /**
     * Reset password for group head.
     */
    public function resetPassword(string $id)
    {
        $groupHead = GroupHead::findOrFail($id);
        
        // Generate new password
        $newPassword = Str::random(12);
        
        $groupHead->user->update([
            'password' => Hash::make($newPassword)
        ]);

        return response()->json([
            'message' => 'Password reset successfully',
            'credentials' => [
                'email' => $groupHead->user->email,
                'password' => $newPassword,
                'note' => 'Please save these credentials. The password will not be shown again.'
            ]
        ]);
    }

    /**
     * Permanently delete group head.
     */
    public function forceDestroy(string $id)
    {
        $groupHead = GroupHead::withTrashed()->findOrFail($id);
        $user = $groupHead->user()->withTrashed()->first();
        
        $groupHead->forceDelete();
        $user?->forceDelete();

        return response()->json([
            'message' => 'Group Head permanently deleted'
        ]);
    }

    /**
     * Restore soft deleted group head.
     */
    public function restore(string $id)
    {
        $groupHead = GroupHead::withTrashed()->findOrFail($id);
        $groupHead->restore();
        
        // Also restore the user
        $groupHead->user()->withTrashed()->first()?->restore();
        
        $groupHead->load(['organization', 'user']);
        
        return response()->json([
            'message' => 'Group Head restored successfully',
            'data' => $groupHead
        ]);
    }
}
