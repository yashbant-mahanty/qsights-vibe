<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Participant;
use App\Models\Program;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\ParticipantsTemplateExport;
use App\Imports\ParticipantsImport;

class ParticipantController extends Controller
{
    /**
     * Display a listing of participants
     */
    public function index(Request $request)
    {
        $query = Participant::with(['organization', 'programs'])
            ->withCount([
                'programs as enrolled_programs_count' => function($q) {
                    $q->whereNull('programs.deleted_at');
                }
            ]);
        
        // Only include non-deleted participants (include both active and inactive)
        if (!$request->boolean('with_trashed')) {
            $query->whereNull('deleted_at');
        }
        
        // Filter by organization
        if ($request->has('organization_id')) {
            $query->where('organization_id', $request->organization_id);
        }

        // Filter by program
        if ($request->has('program_id')) {
            $query->whereHas('programs', function ($q) use ($request) {
                $q->where('programs.id', $request->program_id);
            });
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }        // Search by name or email
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $participants = $query->paginate($request->get('per_page', 15));
        
        // Add calculated fields for each participant
        $participants->getCollection()->transform(function ($participant) {
            // Get all program IDs this participant is enrolled in
            $programIds = $participant->programs->pluck('id')->toArray();
            
            // Calculate progress based on responses in activities from enrolled programs
            $totalActivities = \App\Models\Activity::whereIn('program_id', $programIds)
                ->whereNull('deleted_at')
                ->count();
            
            $completedActivities = \App\Models\Response::where('participant_id', $participant->id)
                ->whereHas('activity', function($q) use ($programIds) {
                    $q->whereIn('program_id', $programIds)
                      ->whereNull('deleted_at');
                })
                ->distinct('activity_id')
                ->count('activity_id');
            
            $participant->progress = $totalActivities > 0 
                ? round(($completedActivities / $totalActivities) * 100, 2)
                : 0;
            
            return $participant;
        });

        return response()->json($participants);
    }

    /**
     * Store a newly created participant
     */
    public function store(Request $request)
    {
        $orgId = $request->input('organization_id');

        $validated = $request->validate([
            'organization_id' => 'nullable|integer|exists:organizations,id',
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:participants,email,NULL,id,organization_id,' . ($orgId ?? 'NULL'),
            'phone' => 'nullable|string|max:20',
            'avatar' => 'nullable|url|max:500',
            'notes' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
            'program_ids' => 'nullable|array',
            'program_ids.*' => 'uuid|exists:programs,id',
        ]);

        // Auto-assign organization_id from first program if not provided
        $organizationId = $validated['organization_id'] ?? null;
        if (!$organizationId && !empty($validated['program_ids'])) {
            $firstProgram = Program::find($validated['program_ids'][0]);
            if ($firstProgram && $firstProgram->organization_id) {
                $organizationId = $firstProgram->organization_id;
            }
        }

        $participant = Participant::create([
            'organization_id' => $organizationId,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'avatar' => $validated['avatar'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ]);

        // Assign programs if provided
        if (!empty($validated['program_ids'])) {
            $participant->programs()->attach($validated['program_ids']);
            
            // Also link participant to all activities in these programs
            foreach ($validated['program_ids'] as $programId) {
                $program = Program::with('activities')->find($programId);
                if ($program && $program->activities->isNotEmpty()) {
                    $activitySyncData = $program->activities->mapWithKeys(function($activity) {
                        return [$activity->id => ['created_at' => now(), 'updated_at' => now()]];
                    });
                    $participant->activities()->attach($activitySyncData);
                }
            }
        }

        return response()->json([
            'message' => 'Participant created successfully',
            'data' => $participant
        ], 201);
    }

    /**
     * Display the specified participant
     */
    public function show(string $id)
    {
        $participant = Participant::with(['organization', 'programs', 'programs.activities'])
            ->findOrFail($id);

        return response()->json(['data' => $participant]);
    }

    /**
     * Update the specified participant
     */
    public function update(Request $request, string $id)
    {
        $participant = Participant::findOrFail($id);

        $orgId = $request->input('organization_id', $participant->organization_id);

        $validated = $request->validate([
            'organization_id' => 'nullable|integer|exists:organizations,id',
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:participants,email,' . $id . ',id,organization_id,' . ($orgId ?? 'NULL'),
            'phone' => 'nullable|string|max:20',
            'avatar' => 'nullable|url|max:500',
            'notes' => 'nullable|string',
            'status' => 'sometimes|in:active,inactive',
        ]);

        $participant->update($validated);

        return response()->json([
            'message' => 'Participant updated successfully',
            'data' => $participant
        ]);
    }

    /**
     * Soft delete the specified participant
     */
    public function destroy(string $id)
    {
        $participant = Participant::findOrFail($id);
        $participant->delete();

        return response()->json([
            'message' => 'Participant deleted successfully'
        ]);
    }

    /**
     * Bulk delete participants
     */
    public function bulkDelete(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ids' => 'required|array|min:1',
            'ids.*' => 'required|string|exists:participants,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $ids = $request->input('ids');
        $deletedCount = Participant::whereIn('id', $ids)->delete();

        return response()->json([
            'message' => "Successfully deleted {$deletedCount} participant(s)",
            'deleted_count' => $deletedCount
        ]);
    }

    /**
     * Activate participant
     */
    public function activate(string $id)
    {
        $participant = Participant::findOrFail($id);
        $participant->update(['status' => 'active']);

        return response()->json([
            'message' => 'Participant activated successfully',
            'data' => $participant
        ]);
    }

    /**
     * Deactivate participant
     */
    public function deactivate(string $id)
    {
        $participant = Participant::findOrFail($id);
        $participant->update(['status' => 'inactive']);

        return response()->json([
            'message' => 'Participant deactivated successfully',
            'data' => $participant
        ]);
    }

    /**
     * Restore soft deleted participant
     */
    public function restore(string $id)
    {
        $participant = Participant::withTrashed()->findOrFail($id);
        $participant->restore();

        return response()->json([
            'message' => 'Participant restored successfully',
            'data' => $participant
        ]);
    }

    /**
     * Permanently delete participant
     */
    public function forceDestroy(string $id)
    {
        $participant = Participant::withTrashed()->findOrFail($id);
        $participant->forceDelete();

        return response()->json([
            'message' => 'Participant permanently deleted'
        ]);
    }

    /**
     * Assign programs to participant
     */
    public function assignPrograms(Request $request, string $id)
    {
        $participant = Participant::findOrFail($id);

        $validated = $request->validate([
            'program_ids' => 'required|array',
            'program_ids.*' => 'uuid|exists:programs,id',
        ]);

        $participant->programs()->syncWithoutDetaching($validated['program_ids']);

        return response()->json([
            'message' => 'Programs assigned successfully',
            'data' => $participant->load('programs')
        ]);
    }

    /**
     * Unassign programs from participant
     */
    public function unassignPrograms(Request $request, string $id)
    {
        $participant = Participant::findOrFail($id);

        $validated = $request->validate([
            'program_ids' => 'required|array',
            'program_ids.*' => 'uuid|exists:programs,id',
        ]);

        $participant->programs()->detach($validated['program_ids']);

        return response()->json([
            'message' => 'Programs unassigned successfully',
            'data' => $participant->load('programs')
        ]);
    }

    /**
     * Bulk import participants from Excel/CSV
     */
    public function bulkImport(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ]);

        try {
            $import = new ParticipantsImport();
            Excel::import($import, $request->file('file'));

            return response()->json([
                'message' => 'Import completed',
                'successCount' => $import->getSuccessCount(),
                'skippedCount' => $import->getSkippedCount(),
                'skippedRows' => $import->getSkippedRows()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Import failed',
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Download participants template
     */
    public function downloadTemplate()
    {
        return Excel::download(new ParticipantsTemplateExport(), 'participants_template.xlsx');
    }
}
