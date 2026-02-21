<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShortLink;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ShortLinkController extends Controller
{
    /**
     * Base URL for short links
     */
    private const SHORT_URL_BASE = 'https://prod.qsights.com/e/';
    private const MAX_TOTAL_LENGTH = 50;

    /**
     * Get short links for an activity
     */
    public function getActivityShortLinks($activityId)
    {
        try {
            $activity = Activity::findOrFail($activityId);

            $shortLinks = ShortLink::where('activity_id', $activityId)
                ->where('is_active', true)
                ->get()
                ->keyBy('link_type');

            $result = [];
            foreach (['registration', 'preview', 'anonymous'] as $type) {
                if (isset($shortLinks[$type])) {
                    $link = $shortLinks[$type];
                    $result[$type] = [
                        'id' => $link->id,
                        'slug' => $link->slug,
                        'short_url' => self::SHORT_URL_BASE . $link->slug,
                        'original_url' => $link->original_url,
                        'is_active' => $link->is_active,
                        'click_count' => $link->click_count,
                        'created_at' => $link->created_at,
                    ];
                } else {
                    $result[$type] = null;
                }
            }

            return response()->json([
                'status' => 'success',
                'data' => $result,
                'base_url' => self::SHORT_URL_BASE,
                'max_length' => self::MAX_TOTAL_LENGTH,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching short links: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch short links'
            ], 500);
        }
    }

    /**
     * Create or update a short link
     */
    public function createOrUpdate(Request $request, $activityId)
    {
        try {
            $validated = $request->validate([
                'link_type' => 'required|in:registration,preview,anonymous',
                'slug' => 'nullable|string|max:27',
                'original_url' => 'required|url',
                'auto_generate' => 'nullable|boolean',
            ]);

            $activity = Activity::findOrFail($activityId);
            $linkType = $validated['link_type'];
            $originalUrl = $validated['original_url'];

            // Generate or validate slug
            $slug = null;
            if (!empty($validated['slug'])) {
                $slug = ShortLink::sanitizeSlug($validated['slug']);
            } elseif ($request->input('auto_generate', true)) {
                // Auto-generate from activity name or random
                $slug = ShortLink::generateSlugFromName($activity->name);
            }

            if (!$slug) {
                $slug = ShortLink::generateRandomSlug();
            }

            // Validate the slug
            if (!ShortLink::isValidSlug($slug)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Invalid slug. Use only lowercase letters, numbers, and hyphens.',
                    'field' => 'slug'
                ], 422);
            }

            // Check total URL length
            $totalLength = strlen(self::SHORT_URL_BASE . $slug);
            if ($totalLength > self::MAX_TOTAL_LENGTH) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'URL exceeds maximum length of ' . self::MAX_TOTAL_LENGTH . ' characters',
                    'field' => 'slug'
                ], 422);
            }

            // Check existing short link for this activity and type
            $existingLink = ShortLink::where('activity_id', $activityId)
                ->where('link_type', $linkType)
                ->first();

            // Check slug availability (exclude current if updating)
            $excludeId = $existingLink ? $existingLink->id : null;
            if (!ShortLink::isSlugAvailable($slug, $excludeId)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'This URL is already taken. Please choose a different slug.',
                    'field' => 'slug'
                ], 422);
            }

            $userId = Auth::id();

            if ($existingLink) {
                // Update existing
                $existingLink->update([
                    'slug' => $slug,
                    'original_url' => $originalUrl,
                ]);
                $shortLink = $existingLink;
            } else {
                // Create new
                $shortLink = ShortLink::create([
                    'activity_id' => $activityId,
                    'link_type' => $linkType,
                    'slug' => $slug,
                    'original_url' => $originalUrl,
                    'created_by' => $userId,
                    'is_active' => true,
                ]);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Short link saved successfully',
                'data' => [
                    'id' => $shortLink->id,
                    'slug' => $shortLink->slug,
                    'short_url' => self::SHORT_URL_BASE . $shortLink->slug,
                    'original_url' => $shortLink->original_url,
                    'link_type' => $shortLink->link_type,
                    'is_active' => $shortLink->is_active,
                ]
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating short link: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create short link: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check slug availability
     */
    public function checkSlugAvailability(Request $request)
    {
        try {
            $validated = $request->validate([
                'slug' => 'required|string|max:27',
                'exclude_id' => 'nullable|uuid',
            ]);

            $slug = ShortLink::sanitizeSlug($validated['slug']);
            $excludeId = $validated['exclude_id'] ?? null;

            // Check if valid
            if (!ShortLink::isValidSlug($slug)) {
                return response()->json([
                    'available' => false,
                    'valid' => false,
                    'message' => 'Invalid slug. Use only lowercase letters, numbers, and hyphens.',
                    'sanitized_slug' => $slug,
                ]);
            }

            // Check total length
            $totalLength = strlen(self::SHORT_URL_BASE . $slug);
            if ($totalLength > self::MAX_TOTAL_LENGTH) {
                return response()->json([
                    'available' => false,
                    'valid' => false,
                    'message' => 'URL exceeds maximum length of ' . self::MAX_TOTAL_LENGTH . ' characters',
                    'sanitized_slug' => $slug,
                    'current_length' => $totalLength,
                    'max_length' => self::MAX_TOTAL_LENGTH,
                ]);
            }

            // Check availability
            $isAvailable = ShortLink::isSlugAvailable($slug, $excludeId);

            return response()->json([
                'available' => $isAvailable,
                'valid' => true,
                'message' => $isAvailable ? 'This URL is available!' : 'This URL is already taken',
                'sanitized_slug' => $slug,
                'short_url' => self::SHORT_URL_BASE . $slug,
                'current_length' => $totalLength,
                'max_length' => self::MAX_TOTAL_LENGTH,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'available' => false,
                'valid' => false,
                'message' => 'Error checking availability'
            ], 500);
        }
    }

    /**
     * Delete/deactivate a short link
     */
    public function delete($activityId, $linkType)
    {
        try {
            $shortLink = ShortLink::where('activity_id', $activityId)
                ->where('link_type', $linkType)
                ->first();

            if (!$shortLink) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Short link not found'
                ], 404);
            }

            // Soft delete by deactivating
            $shortLink->update(['is_active' => false]);

            return response()->json([
                'status' => 'success',
                'message' => 'Short link deactivated'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting short link: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete short link'
            ], 500);
        }
    }

    /**
     * Redirect from short URL to original URL (public route)
     */
    public function redirect($slug)
    {
        try {
            $shortLink = ShortLink::where('slug', strtolower($slug))
                ->where('is_active', true)
                ->first();

            if (!$shortLink) {
                // Redirect to a 404 page or home
                return redirect()->away('https://qsights.com?error=link_not_found');
            }

            // Track click
            $shortLink->incrementClickCount();

            // Redirect to original URL
            return redirect()->away($shortLink->original_url, 302);
        } catch (\Exception $e) {
            Log::error('Error redirecting short link: ' . $e->getMessage());
            return redirect()->away('https://qsights.com?error=redirect_failed');
        }
    }

    /**
     * Generate suggested slug from activity name
     */
    public function suggestSlug(Request $request, $activityId)
    {
        try {
            $activity = Activity::findOrFail($activityId);
            $slug = ShortLink::generateSlugFromName($activity->name);

            return response()->json([
                'status' => 'success',
                'data' => [
                    'suggested_slug' => $slug,
                    'short_url' => self::SHORT_URL_BASE . $slug,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to generate slug suggestion'
            ], 500);
        }
    }

    /**
     * API endpoint for short link redirect (returns JSON for frontend handling)
     */
    public function redirectApi($slug)
    {
        try {
            $shortLink = ShortLink::where('slug', strtolower($slug))
                ->where('is_active', true)
                ->first();

            if (!$shortLink) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Link not found'
                ], 404);
            }

            // Track click
            $shortLink->incrementClickCount();

            return response()->json([
                'status' => 'success',
                'redirect_url' => $shortLink->original_url,
                'activity_id' => $shortLink->activity_id,
                'link_type' => $shortLink->link_type,
            ]);
        } catch (\Exception $e) {
            Log::error('Error processing short link redirect: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to process redirect'
            ], 500);
        }
    }
}
