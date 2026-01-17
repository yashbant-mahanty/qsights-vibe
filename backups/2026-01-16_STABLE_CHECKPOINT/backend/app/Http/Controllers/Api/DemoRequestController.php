<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DemoRequest;
use Illuminate\Http\Request;

class DemoRequestController extends Controller
{
    /**
     * Get all demo requests (Super Admin only)
     */
    public function index(Request $request)
    {
        $query = DemoRequest::query()->orderBy('created_at', 'desc');

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $requests = $query->paginate(20);

        return response()->json($requests);
    }

    protected $notificationService;

    public function __construct(\App\Services\NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Submit demo request (Public endpoint - no auth required)
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'country' => 'required|string|max:100',
            'city' => 'required|string|max:100',
            'message' => 'nullable|string|max:1000',
        ]);

        $demoRequest = DemoRequest::create($request->all());

        // Send notifications
        $this->notificationService->notifyDemoRequestSubmission($demoRequest);

        return response()->json([
            'message' => 'Demo request submitted successfully. We will contact you soon!',
            'request' => $demoRequest,
        ], 201);
    }

    /**
     * Get a specific demo request
     */
    public function show($id)
    {
        $demoRequest = DemoRequest::find($id);
        
        if (!$demoRequest) {
            return response()->json(['error' => 'Demo request not found'], 404);
        }
        
        return response()->json($demoRequest);
    }

    /**
     * Update demo request status
     */
    public function updateStatus(Request $request, $id)
    {
        $demoRequest = DemoRequest::find($id);
        
        if (!$demoRequest) {
            return response()->json(['error' => 'Demo request not found'], 404);
        }

        $request->validate([
            'status' => 'required|in:pending,contacted,closed',
        ]);

        $demoRequest->update([
            'status' => $request->status,
            'contacted_at' => $request->status === 'contacted' ? now() : $demoRequest->contacted_at,
        ]);

        return response()->json([
            'message' => 'Demo request status updated successfully',
            'request' => $demoRequest,
        ]);
    }

    /**
     * Delete demo request
     */
    public function destroy($id)
    {
        $demoRequest = DemoRequest::find($id);
        
        if (!$demoRequest) {
            return response()->json(['error' => 'Demo request not found'], 404);
        }

        $demoRequest->delete();

        return response()->json(['message' => 'Demo request deleted successfully']);
    }
}
