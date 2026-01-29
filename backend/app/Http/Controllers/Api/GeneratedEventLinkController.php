<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\GeneratedEventLink;
use App\Models\GeneratedLinkGroup;
use App\Models\SystemSetting;
use App\Services\GeneratedLinkService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GeneratedEventLinkController extends Controller
{
    protected GeneratedLinkService $linkService;

    public function __construct(GeneratedLinkService $linkService)
    {
        $this->linkService = $linkService;
    }

    /**
     * Generate multiple unique links
     * POST /api/activities/{id}/generated-links
     */
    public function generate(Request $request, string $activityId)
    {
        $user = $request->user();

        // Check permissions (Admin, Super Admin, Program Admin)
        if (!in_array($user->role, ['super-admin', 'admin', 'program-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'prefix' => 'required|string|max:10|regex:/^[A-Z0-9_-]+$/i',
            'start_number' => 'required|integer|min:1',
            'count' => 'required|integer|min:1|max:1000',
            'group_id' => 'nullable|uuid|exists:generated_link_groups,id',
            'group_name' => 'nullable|string|max:100',
            'group_description' => 'nullable|string',
            'link_type' => 'nullable|in:registration,anonymous',
        ]);

        try {
            // Create group if group_name provided
            $groupId = $validated['group_id'] ?? null;
            
            if (isset($validated['group_name'])) {
                $group = $this->linkService->createGroup(
                    $activityId,
                    $validated['group_name'],
                    $validated['group_description'] ?? null
                );
                $groupId = $group->id;
            }

            // Generate links
            $result = $this->linkService->generateLinks($activityId, [
                'prefix' => $validated['prefix'],
                'start_number' => $validated['start_number'],
                'count' => $validated['count'],
                'group_id' => $groupId,
                'link_type' => $validated['link_type'] ?? 'registration',
                'created_by' => $user->id,
            ]);

            return response()->json([
                'message' => 'Links generated successfully',
                'data' => $result,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to generate links',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all generated links for an activity
     * GET /api/activities/{id}/generated-links
     */
    public function index(Request $request, string $activityId)
    {
        $user = $request->user();

        // Check permissions
        if (!in_array($user->role, ['super-admin', 'admin', 'program-admin', 'program-manager'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = GeneratedEventLink::with(['group', 'creator', 'participant', 'response'])
            ->where('activity_id', $activityId);

        // Apply filters
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('group_id')) {
            $query->where('group_id', $request->group_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('tag', 'like', "%{$search}%")
                  ->orWhereHas('participant', function ($pq) use ($search) {
                      $pq->where('name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $links = $query->orderBy('tag')->paginate(50);

        // Get statistics
        $stats = $this->linkService->getStatistics($activityId);

        // Generate URLs for frontend
        $frontendUrl = config('app.frontend_url', 'https://prod.qsights.com');
        
        $links->getCollection()->transform(function ($link) use ($frontendUrl) {
            $link->full_url = "{$frontendUrl}/activities/take/{$link->activity_id}?token=" . urlencode($link->token);
            return $link;
        });

        return response()->json([
            'data' => $links,
            'statistics' => $stats,
        ]);
    }

    /**
     * Get groups for an activity
     * GET /api/activities/{id}/generated-links/groups
     */
    public function getGroups(string $activityId)
    {
        $groups = GeneratedLinkGroup::where('activity_id', $activityId)
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $groups]);
    }

    /**
     * Create a new group
     * POST /api/activities/{id}/generated-links/groups
     */
    public function createGroup(Request $request, string $activityId)
    {
        $user = $request->user();

        if (!in_array($user->role, ['super-admin', 'admin', 'program-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
        ]);

        try {
            $group = $this->linkService->createGroup(
                $activityId,
                $validated['name'],
                $validated['description'] ?? null
            );

            return response()->json([
                'message' => 'Group created successfully',
                'data' => $group,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create group',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update link status (expire, disable)
     * PATCH /api/activities/{activityId}/generated-links/{linkId}
     */
    public function updateStatus(Request $request, string $activityId, string $linkId)
    {
        $user = $request->user();

        if (!in_array($user->role, ['super-admin', 'admin', 'program-admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:expired,disabled,unused',
        ]);

        $link = GeneratedEventLink::where('id', $linkId)
            ->where('activity_id', $activityId)
            ->firstOrFail();

        $link->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Link status updated',
            'data' => $link,
        ]);
    }

    /**
     * Delete a generated link
     * DELETE /api/activities/{activityId}/generated-links/{linkId}
     */
    public function destroy(Request $request, string $activityId, string $linkId)
    {
        $user = $request->user();

        if (!in_array($user->role, ['super-admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $link = GeneratedEventLink::where('id', $linkId)
            ->where('activity_id', $activityId)
            ->firstOrFail();

        // Prevent deletion of used links
        if ($link->status === 'used') {
            return response()->json([
                'message' => 'Cannot delete used links. Set to disabled instead.',
            ], 400);
        }

        $link->delete();

        return response()->json(['message' => 'Link deleted successfully']);
    }

    /**
     * Export links to CSV
     * GET /api/activities/{id}/generated-links/export
     */
    public function export(Request $request, string $activityId)
    {
        $user = $request->user();

        if (!in_array($user->role, ['super-admin', 'admin', 'program-admin', 'program-manager'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $filters = [];
        
        if ($request->has('status')) {
            $filters['status'] = $request->status;
        }

        if ($request->has('group_id')) {
            $filters['group_id'] = $request->group_id;
        }

        $data = $this->linkService->exportLinks($activityId, $filters);

        return response()->json([
            'data' => $data,
            'filename' => 'generated_links_' . date('Y-m-d_His') . '.csv',
        ]);
    }

    /**
     * Email selected links to a recipient
     * POST /api/activities/{id}/generated-links/email
     */
    public function emailLinks(Request $request, string $activityId)
    {
        $user = $request->user();

        if (!in_array($user->role, ['super-admin', 'admin', 'program-admin', 'program-manager'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'email' => 'required|email',
            'link_ids' => 'required|array|min:1',
            'link_ids.*' => 'uuid',
            'activity_name' => 'nullable|string',
        ]);

        try {
            // Fetch the selected links
            $links = GeneratedEventLink::with(['group'])
                ->where('activity_id', $activityId)
                ->whereIn('id', $validated['link_ids'])
                ->get();

            if ($links->isEmpty()) {
                return response()->json(['message' => 'No valid links found'], 404);
            }

            // Generate full URLs for the links
            $frontendUrl = config('app.frontend_url', 'https://prod.qsights.com');
            foreach ($links as $link) {
                $link->full_url = "{$frontendUrl}/activities/take/{$link->activity_id}?token=" . urlencode($link->token);
            }

            // Build HTML email content with tabular format
            $activityName = $validated['activity_name'] ?? 'Activity';
            $htmlContent = $this->buildEmailHtml($links, $activityName);

            // Load SendGrid configuration from System Settings (database) - same as NotificationController
            $sendGridApiKey = SystemSetting::getValue('email_sendgrid_api_key');
            $fromEmail = SystemSetting::getValue('email_sender_email') ?? 'info@qsights.com';
            $fromName = SystemSetting::getValue('email_sender_name') ?? 'QSights';

            Log::info('GeneratedEventLinkController: Sending email', [
                'to' => $validated['email'],
                'activity_id' => $activityId,
                'link_count' => count($links),
                'from_email' => $fromEmail,
                'api_key_prefix' => substr($sendGridApiKey ?? '', 0, 15) . '...',
            ]);

            if (!$sendGridApiKey) {
                throw new \Exception('SendGrid API key not configured in System Settings');
            }

            // Send via SendGrid directly (same approach as NotificationController)
            $sendgrid = new \SendGrid($sendGridApiKey);
            $mail = new \SendGrid\Mail\Mail();
            $mail->setFrom($fromEmail, $fromName);
            $mail->setSubject("Generated Links for {$activityName}");
            $mail->addTo($validated['email']);
            $mail->addContent("text/html", $htmlContent);

            $response = $sendgrid->send($mail);

            Log::info('GeneratedEventLinkController: SendGrid response', [
                'status_code' => $response->statusCode(),
                'to' => $validated['email'],
            ]);

            if ($response->statusCode() >= 200 && $response->statusCode() < 300) {
                return response()->json([
                    'message' => 'Email sent successfully to ' . $validated['email'],
                ]);
            } else {
                Log::error('GeneratedEventLinkController: SendGrid failed', [
                    'status_code' => $response->statusCode(),
                    'body' => $response->body(),
                ]);
                throw new \Exception('SendGrid returned status ' . $response->statusCode());
            }

        } catch (\Exception $e) {
            Log::error('Email links error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to send email',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Build HTML email content
     */
    private function buildEmailHtml($links, $activityName): string
    {
        $rows = '';
        foreach ($links as $index => $link) {
            $groupName = $link->group?->name ?? '—';
            $rows .= "
                <tr style='border-bottom: 1px solid #e5e7eb;'>
                    <td style='padding: 12px; text-align: left;'>" . ($index + 1) . "</td>
                    <td style='padding: 12px; text-align: left; font-family: monospace; font-weight: 600;'>{$link->tag}</td>
                    <td style='padding: 12px; text-align: left; word-break: break-all;'>
                        <a href='{$link->full_url}' style='color: #6366f1;'>{$link->full_url}</a>
                    </td>
                    <td style='padding: 12px; text-align: left;'>{$groupName}</td>
                    <td style='padding: 12px; text-align: left;'>{$link->status}</td>
                </tr>
            ";
        }

        return "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 900px; margin: 0 auto; padding: 20px; }
                h1 { color: #6366f1; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background-color: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #d1d5db; }
                tr:hover { background-color: #f9fafb; }
            </style>
        </head>
        <body>
            <div class='container'>
                <h1>Generated Links for {$activityName}</h1>
                <p>Here are the requested links (" . count($links) . " total):</p>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Tag</th>
                            <th>URL</th>
                            <th>Group</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {$rows}
                    </tbody>
                </table>
                <p style='margin-top: 30px; color: #6b7280; font-size: 14px;'>
                    This email was sent from QSights. Please do not reply to this email.
                </p>
            </div>
        </body>
        </html>
        ";
    }

    /**
     * Build plain text email content
     */
    private function buildEmailText($links, $activityName): string
    {
        $text = "Generated Links for {$activityName}\n";
        $text .= "================================\n\n";
        $text .= "Total Links: " . count($links) . "\n\n";

        foreach ($links as $index => $link) {
            $groupName = $link->group?->name ?? 'No Group';
            $text .= ($index + 1) . ". Tag: {$link->tag}\n";
            $text .= "   URL: {$link->full_url}\n";
            $text .= "   Group: {$groupName}\n";
            $text .= "   Status: {$link->status}\n\n";
        }

        $text .= "---\nThis email was sent from QSights. Please do not reply to this email.\n";
        
        return $text;
    }

    /**
     * Get link statistics
     * GET /api/activities/{id}/generated-links/statistics
     */
    public function statistics(string $activityId)
    {
        $stats = $this->linkService->getStatistics($activityId);
        
        // Get group-wise stats
        $groupStats = DB::table('generated_event_links')
            ->select('group_id', DB::raw('count(*) as total'), DB::raw("count(case when status = 'used' then 1 end) as used"))
            ->where('activity_id', $activityId)
            ->whereNotNull('group_id')
            ->groupBy('group_id')
            ->get();

        $groups = GeneratedLinkGroup::whereIn('id', $groupStats->pluck('group_id'))->get()->keyBy('id');

        $groupStatsWithNames = $groupStats->map(function ($stat) use ($groups) {
            $group = $groups->get($stat->group_id);
            return [
                'group_id' => $stat->group_id,
                'group_name' => $group?->name ?? 'Unknown',
                'total' => $stat->total,
                'used' => $stat->used,
                'unused' => $stat->total - $stat->used,
                'usage_percentage' => $stat->total > 0 ? round(($stat->used / $stat->total) * 100, 2) : 0,
            ];
        });

        return response()->json([
            'overall' => $stats,
            'by_group' => $groupStatsWithNames,
        ]);
    }
}
