<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactRequest;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class ContactRequestController extends Controller
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Submit contact request (Public endpoint - no auth required)
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'message' => 'required|string|max:2000',
        ]);

        $contactRequest = ContactRequest::create([
            'name' => $request->name,
            'email' => $request->email,
            'message' => $request->message,
            'status' => 'pending',
        ]);

        // Send notifications
        $this->notificationService->notifyContactRequestSubmission($contactRequest);

        return response()->json([
            'message' => 'Request received. Our team will contact you shortly.',
            'request' => $contactRequest,
        ], 201);
    }

    /**
     * Get all contact requests (Super Admin only)
     */
    public function index()
    {
        $requests = ContactRequest::orderBy('created_at', 'desc')->paginate(20);
        return response()->json($requests);
    }

    /**
     * Get a specific contact request
     */
    public function show($id)
    {
        $contactRequest = ContactRequest::find($id);
        
        if (!$contactRequest) {
            return response()->json(['error' => 'Contact request not found'], 404);
        }
        
        return response()->json($contactRequest);
    }

    /**
     * Update contact request status
     */
    public function updateStatus(Request $request, $id)
    {
        $contactRequest = ContactRequest::find($id);
        
        if (!$contactRequest) {
            return response()->json(['error' => 'Contact request not found'], 404);
        }

        $request->validate([
            'status' => 'required|in:pending,contacted,closed',
        ]);

        $contactRequest->update(['status' => $request->status]);

        return response()->json([
            'message' => 'Contact request status updated successfully',
            'request' => $contactRequest,
        ]);
    }

    /**
     * Delete contact request
     */
    public function destroy($id)
    {
        $contactRequest = ContactRequest::find($id);
        
        if (!$contactRequest) {
            return response()->json(['error' => 'Contact request not found'], 404);
        }

        $contactRequest->delete();

        return response()->json(['message' => 'Contact request deleted successfully']);
    }
}
