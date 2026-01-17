<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CmsContent;
use Illuminate\Http\Request;

class CmsContentController extends Controller
{
    /**
     * Get all CMS content
     */
    public function index()
    {
        $content = CmsContent::where('is_active', true)->get();
        
        return response()->json([
            'status' => 'success',
            'data' => $content,
        ]);
    }

    /**
     * Get specific CMS content by page_key
     */
    public function show($pageKey)
    {
        $content = CmsContent::where('page_key', $pageKey)
            ->where('is_active', true)
            ->first();
        
        if (!$content) {
            return response()->json([
                'status' => 'error',
                'message' => 'Content not found',
            ], 404);
        }
        
        return response()->json([
            'status' => 'success',
            'data' => $content,
        ]);
    }

    /**
     * Update CMS content (Admin/Super Admin only)
     */
    public function update(Request $request, $pageKey)
    {
        $content = CmsContent::where('page_key', $pageKey)->first();
        
        if (!$content) {
            return response()->json([
                'status' => 'error',
                'message' => 'Content not found',
            ], 404);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'content' => 'nullable|string',
            'form_fields' => 'sometimes|array',
            'messages' => 'sometimes|array',
            'cta_text' => 'nullable|string|max:255',
            'cta_link' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        // Update last_updated_date for privacy_policy and terms_of_service
        if (in_array($pageKey, ['privacy_policy', 'terms_of_service']) && isset($validated['content'])) {
            $validated['last_updated_date'] = now();
        }

        $content->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Content updated successfully',
            'data' => $content->fresh(),
        ]);
    }

    /**
     * Bulk update CMS content
     */
    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'updates' => 'required|array',
            'updates.*.page_key' => 'required|string',
            'updates.*.title' => 'sometimes|string',
            'updates.*.description' => 'nullable|string',
            'updates.*.content' => 'nullable|string',
            'updates.*.form_fields' => 'sometimes|nullable',
            'updates.*.messages' => 'sometimes|nullable',
            'updates.*.cta_text' => 'nullable|string',
            'updates.*.cta_link' => 'nullable|string',
        ]);

        $updated = [];

        foreach ($validated['updates'] as $update) {
            $pageKey = $update['page_key'];
            unset($update['page_key']);

            $content = CmsContent::where('page_key', $pageKey)->first();
            
            if ($content) {
                // Update last_updated_date for privacy/terms
                if (in_array($pageKey, ['privacy_policy', 'terms_of_service']) && isset($update['content'])) {
                    $update['last_updated_date'] = now();
                }

                $content->update($update);
                $updated[] = $content->fresh();
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Content updated successfully',
            'data' => $updated,
        ]);
    }
}
