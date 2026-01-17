<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactSales;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class ContactSalesController extends Controller
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Get all contact sales requests (Super Admin only)
     */
    public function index(Request $request)
    {
        $query = ContactSales::query()->orderBy('created_at', 'desc');

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $requests = $query->paginate(20);

        return response()->json($requests);
    }

    /**
     * Submit contact sales request (Public endpoint - no auth required)
     */
    public function store(Request $request)
    {
        $request->validate([
            'firstName' => 'required|string|max:255',
            'lastName' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'company' => 'nullable|string|max:255',
            'companySize' => 'nullable|string|max:100',
            'role' => 'nullable|string|max:255',
            'interest' => 'nullable|string|max:255',
            'message' => 'nullable|string|max:2000',
        ]);

        $contactSales = ContactSales::create([
            'first_name' => $request->firstName,
            'last_name' => $request->lastName,
            'email' => $request->email,
            'phone' => $request->phone,
            'company' => $request->company,
            'company_size' => $request->companySize,
            'role' => $request->role,
            'interest' => $request->interest,
            'message' => $request->message,
        ]);

        // Send notifications
        $this->notificationService->notifyContactSalesSubmission($contactSales);

        return response()->json([
            'message' => 'Your message has been sent successfully. Our sales team will contact you within 24 hours.',
            'request' => $contactSales,
        ], 201);
    }

    /**
     * Get a specific contact sales request
     */
    public function show($id)
    {
        $contactSales = ContactSales::find($id);
        
        if (!$contactSales) {
            return response()->json(['error' => 'Contact sales request not found'], 404);
        }
        
        return response()->json($contactSales);
    }

    /**
     * Update contact sales request status
     */
    public function updateStatus(Request $request, $id)
    {
        $contactSales = ContactSales::find($id);
        
        if (!$contactSales) {
            return response()->json(['error' => 'Contact sales request not found'], 404);
        }

        $request->validate([
            'status' => 'required|in:pending,contacted,closed',
        ]);

        $contactSales->update([
            'status' => $request->status,
            'contacted_at' => $request->status === 'contacted' ? now() : $contactSales->contacted_at,
        ]);

        return response()->json([
            'message' => 'Contact sales request status updated successfully',
            'request' => $contactSales,
        ]);
    }

    /**
     * Delete contact sales request
     */
    public function destroy($id)
    {
        $contactSales = ContactSales::find($id);
        
        if (!$contactSales) {
            return response()->json(['error' => 'Contact sales request not found'], 404);
        }

        $contactSales->delete();

        return response()->json(['message' => 'Contact sales request deleted successfully']);
    }
}
