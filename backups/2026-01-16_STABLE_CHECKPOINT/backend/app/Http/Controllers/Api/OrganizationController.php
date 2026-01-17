<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OrganizationController extends Controller
{
    /**
     * Display a listing of organizations.
     */
    public function index(Request $request)
    {
        $query = Organization::query();
        
        // Only exclude soft-deleted organizations (include both active and inactive)
        if (!$request->boolean('with_trashed')) {
            $query->whereNull('deleted_at');
        }
        
        // Add relationship counts per organization using full hierarchy
        $query->withCount([
            // Count only group heads for this organization (active only)
            'groupHeads' => function($query) {
                $query->where('group_heads.status', 'active')
                      ->whereNull('group_heads.deleted_at');
            },
            // Count only programs for this organization (active only)
            'programs' => function($query) {
                $query->where('programs.status', 'active')
                      ->whereNull('programs.deleted_at');
            },
            // Count active participants (non-guest, active status) directly from participants table
            'participants as active_participants_count' => function($query) {
                $query->where('participants.is_guest', false)
                      ->where('participants.status', 'active')
                      ->whereNull('participants.deleted_at');
            },
            // Count inactive participants (non-guest, inactive status) directly from participants table
            'participants as inactive_participants_count' => function($query) {
                $query->where('participants.is_guest', false)
                      ->where('participants.status', 'inactive')
                      ->whereNull('participants.deleted_at');
            },
            // Count ALL non-guest participants regardless of status
            'participants as total_authenticated_count' => function($query) {
                $query->where('participants.is_guest', false)
                      ->whereNull('participants.deleted_at');
            },
            // Count guest participants (all statuses) directly from participants table
            'participants as guest_participants_count' => function($query) {
                $query->where('participants.is_guest', true)
                      ->whereNull('participants.deleted_at');
            }
        ]);
        
        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('city', 'ilike', "%{$search}%");
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

        $organizations = $query->paginate($request->input('per_page', 15));
        
        return response()->json($organizations);
    }

    /**
     * Store a newly created organization.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:organizations,email',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'website' => 'nullable|string|max:255',
            'logo' => 'nullable|string|max:500',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['status'] = $validated['status'] ?? 'active';
        
        $organization = Organization::create($validated);
        
        return response()->json([
            'message' => 'Organization created successfully',
            'data' => $organization
        ], 201);
    }

    /**
     * Display the specified organization.
     */
    public function show(string $id)
    {
        $organization = Organization::with(['groupHeads', 'programs'])
            ->withCount(['groupHeads', 'programs'])
            ->findOrFail($id);

        return response()->json(['data' => $organization]);
    }

    /**
     * Update the specified organization.
     */
    public function update(Request $request, string $id)
    {
        $organization = Organization::findOrFail($id);
        
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:organizations,email,' . $id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'website' => 'nullable|string|max:255',
            'logo' => 'nullable|string|max:500',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:active,inactive',
        ]);

        $organization->update($validated);
        
        return response()->json([
            'message' => 'Organization updated successfully',
            'data' => $organization
        ]);
    }

    /**
     * Soft delete the specified organization.
     */
    public function destroy(string $id)
    {
        $organization = Organization::findOrFail($id);
        $organization->delete();
        
        return response()->json([
            'message' => 'Organization deleted successfully'
        ]);
    }

    /**
     * Deactivate organization.
     */
    public function deactivate(string $id)
    {
        $organization = Organization::findOrFail($id);
        $organization->update(['status' => 'inactive']);
        
        return response()->json([
            'message' => 'Organization deactivated successfully',
            'data' => $organization
        ]);
    }

    /**
     * Activate organization.
     */
    public function activate(string $id)
    {
        $organization = Organization::findOrFail($id);
        $organization->update(['status' => 'active']);
        
        return response()->json([
            'message' => 'Organization activated successfully',
            'data' => $organization
        ]);
    }

    /**
     * Permanently delete organization.
     */
    public function forceDestroy(string $id)
    {
        $organization = Organization::withTrashed()->findOrFail($id);
        $organization->forceDelete();
        
        return response()->json([
            'message' => 'Organization permanently deleted'
        ]);
    }

    /**
     * Restore soft deleted organization.
     */
    public function restore(string $id)
    {
        $organization = Organization::withTrashed()->findOrFail($id);
        $organization->restore();
        
        return response()->json([
            'message' => 'Organization restored successfully',
            'data' => $organization
        ]);
    }
}
