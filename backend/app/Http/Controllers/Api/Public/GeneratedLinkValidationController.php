<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Services\GeneratedLinkService;
use Illuminate\Http\Request;

class GeneratedLinkValidationController extends Controller
{
    protected GeneratedLinkService $linkService;

    public function __construct(GeneratedLinkService $linkService)
    {
        $this->linkService = $linkService;
    }

    /**
     * Validate a generated link token (public endpoint for participants)
     * GET /api/public/generated-link/validate/{token}
     */
    public function validate(string $token)
    {
        try {
            $link = $this->linkService->validateToken($token);

            if (!$link) {
                return response()->json([
                    'valid' => false,
                    'message' => 'Invalid or expired link',
                ], 404);
            }

            return response()->json([
                'valid' => true,
                'data' => [
                    'activity_id' => $link->activity_id,
                    'tag' => $link->tag,
                    'link_type' => $link->link_type,
                    'status' => $link->status,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'valid' => false,
                'message' => 'Link validation failed',
            ], 500);
        }
    }

    /**
     * Mark link as used after submission (called by response submission)
     * POST /api/public/generated-link/mark-used
     */
    public function markAsUsed(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'participant_id' => 'required|uuid',
            'response_id' => 'required|uuid',
        ]);

        try {
            $success = $this->linkService->markLinkAsUsed(
                $validated['token'],
                $validated['participant_id'],
                $validated['response_id']
            );

            if (!$success) {
                return response()->json([
                    'message' => 'Link not found',
                ], 404);
            }

            return response()->json([
                'message' => 'Link marked as used',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to mark link as used',
            ], 500);
        }
    }
}
