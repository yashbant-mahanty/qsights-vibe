<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\TemporarySubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TemporarySubmissionController extends Controller
{
    /**
     * Store temporary submission (post-submission flow - before registration)
     */
    public function store(Request $request, $activityId)
    {
        $request->validate([
            'answers' => 'required|array',
            'session_token' => 'nullable|string',
        ]);

        $activity = Activity::findOrFail($activityId);
        
        // Verify activity uses post-submission flow
        if ($activity->registration_flow !== 'post_submission') {
            return response()->json([
                'message' => 'This activity does not use post-submission registration flow'
            ], 400);
        }

        // Generate or use provided session token
        $sessionToken = $request->input('session_token') ?? Str::random(64);
        
        // Check if temporary submission already exists for this token
        $tempSubmission = TemporarySubmission::where('session_token', $sessionToken)->first();
        
        if ($tempSubmission) {
            // Update existing temporary submission
            $tempSubmission->update([
                'responses' => $request->input('answers'),
                'metadata' => [
                    'updated_at' => now(),
                    'user_agent' => $request->header('User-Agent'),
                ],
                'expires_at' => now()->addHours(24), // Reset expiration on update
            ]);
        } else {
            // Create new temporary submission
            $tempSubmission = TemporarySubmission::create([
                'activity_id' => $activityId,
                'session_token' => $sessionToken,
                'responses' => $request->input('answers'),
                'metadata' => [
                    'created_at' => now(),
                    'user_agent' => $request->header('User-Agent'),
                ],
                'status' => 'pending',
                'expires_at' => now()->addHours(24),
            ]);
        }

        return response()->json([
            'message' => 'Temporary submission saved successfully',
            'data' => [
                'session_token' => $sessionToken,
                'expires_at' => $tempSubmission->expires_at,
            ]
        ]);
    }

    /**
     * Link temporary submission to participant after registration
     */
    public function link(Request $request, $activityId)
    {
        $request->validate([
            'session_token' => 'required|string',
            'participant_id' => 'required|exists:participants,id',
        ]);

        $tempSubmission = TemporarySubmission::where('activity_id', $activityId)
            ->where('session_token', $request->input('session_token'))
            ->where('status', 'pending')
            ->first();

        if (!$tempSubmission) {
            return response()->json([
                'message' => 'Temporary submission not found or already linked'
            ], 404);
        }

        if ($tempSubmission->hasExpired()) {
            $tempSubmission->markAsExpired();
            return response()->json([
                'message' => 'Temporary submission has expired'
            ], 410);
        }

        // Link to participant
        $tempSubmission->linkToParticipant($request->input('participant_id'));

        return response()->json([
            'message' => 'Temporary submission linked successfully',
            'data' => [
                'participant_id' => $request->input('participant_id'),
                'responses' => $tempSubmission->responses,
            ]
        ]);
    }

    /**
     * Retrieve temporary submission by session token
     */
    public function show(Request $request, $activityId, $sessionToken)
    {
        $tempSubmission = TemporarySubmission::where('activity_id', $activityId)
            ->where('session_token', $sessionToken)
            ->where('status', 'pending')
            ->first();

        if (!$tempSubmission) {
            return response()->json([
                'message' => 'Temporary submission not found'
            ], 404);
        }

        if ($tempSubmission->hasExpired()) {
            $tempSubmission->markAsExpired();
            return response()->json([
                'message' => 'Temporary submission has expired'
            ], 410);
        }

        return response()->json([
            'data' => [
                'session_token' => $tempSubmission->session_token,
                'responses' => $tempSubmission->responses,
                'expires_at' => $tempSubmission->expires_at,
            ]
        ]);
    }
}
