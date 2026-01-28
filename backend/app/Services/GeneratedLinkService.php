<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\GeneratedEventLink;
use App\Models\GeneratedLinkGroup;
use Illuminate\Support\Str;
use Carbon\Carbon;

class GeneratedLinkService
{
    /**
     * Generate multiple unique links for an activity
     *
     * @param string $activityId
     * @param array $data [prefix, start_number, count, group_id, link_type, created_by]
     * @return array Generated links
     */
    public function generateLinks(string $activityId, array $data): array
    {
        $activity = Activity::findOrFail($activityId);

        // Validate activity has generated links enabled
        if (!$activity->enable_generated_links) {
            throw new \Exception('Generated links feature is not enabled for this activity');
        }

        $prefix = strtoupper($data['prefix']); // Force uppercase
        $startNumber = (int) $data['start_number'];
        $count = (int) $data['count'];
        $groupId = $data['group_id'] ?? null;
        $linkType = $data['link_type'] ?? 'registration';
        $createdBy = $data['created_by'];

        // Validate count limit
        if ($count > 1000) {
            throw new \Exception('Maximum 1000 links can be generated at once');
        }

        // Get activity close date for expiry
        $expiresAt = $activity->close_date ? Carbon::parse($activity->close_date) : null;

        $links = [];
        $errors = [];

        for ($i = 0; $i < $count; $i++) {
            $number = $startNumber + $i;
            $tag = $this->formatTag($prefix, $number);

            // Check if tag already exists for this activity
            $exists = GeneratedEventLink::where('activity_id', $activityId)
                ->where('tag', $tag)
                ->exists();

            if ($exists) {
                $errors[] = "Tag {$tag} already exists";
                continue;
            }

            // Generate secure token
            $token = GeneratedEventLink::generateToken();

            // Create link
            $link = GeneratedEventLink::create([
                'activity_id' => $activityId,
                'group_id' => $groupId,
                'tag' => $tag,
                'token' => $token,
                'link_type' => $linkType,
                'status' => 'unused',
                'created_by' => $createdBy,
                'expires_at' => $expiresAt,
            ]);

            $links[] = $link;
        }

        // Update group counters if group specified
        if ($groupId && count($links) > 0) {
            $group = GeneratedLinkGroup::find($groupId);
            if ($group) {
                $group->increment('total_links', count($links));
            }
        }

        return [
            'generated' => $links,
            'errors' => $errors,
            'success_count' => count($links),
            'error_count' => count($errors),
        ];
    }

    /**
     * Format tag with zero-padding
     */
    private function formatTag(string $prefix, int $number): string
    {
        // Default to 3-digit padding (001, 002, etc.)
        $paddedNumber = str_pad($number, 3, '0', STR_PAD_LEFT);
        return "{$prefix}-{$paddedNumber}";
    }

    /**
     * Validate a generated link token
     *
     * @param string $token
     * @return GeneratedEventLink|null
     */
    public function validateToken(string $token): ?GeneratedEventLink
    {
        $link = GeneratedEventLink::where('token', $token)->first();

        if (!$link) {
            return null;
        }

        // Check if link is usable
        if (!$link->isUsable()) {
            return null;
        }

        // Check activity expiry
        $link->checkActivityExpiry();

        // Recheck after expiry check
        if (!$link->isUsable()) {
            return null;
        }

        return $link;
    }

    /**
     * Mark link as used after response submission
     *
     * @param string $token
     * @param string $participantId
     * @param string $responseId
     * @return bool
     */
    public function markLinkAsUsed(string $token, string $participantId, string $responseId): bool
    {
        $link = GeneratedEventLink::where('token', $token)->first();

        if (!$link) {
            return false;
        }

        $link->markAsUsed($participantId, $responseId);
        return true;
    }

    /**
     * Get statistics for an activity's generated links
     *
     * @param string $activityId
     * @return array
     */
    public function getStatistics(string $activityId): array
    {
        $total = GeneratedEventLink::where('activity_id', $activityId)->count();
        $unused = GeneratedEventLink::where('activity_id', $activityId)->where('status', 'unused')->count();
        $used = GeneratedEventLink::where('activity_id', $activityId)->where('status', 'used')->count();
        $expired = GeneratedEventLink::where('activity_id', $activityId)->where('status', 'expired')->count();
        $disabled = GeneratedEventLink::where('activity_id', $activityId)->where('status', 'disabled')->count();

        return [
            'total' => $total,
            'unused' => $unused,
            'used' => $used,
            'expired' => $expired,
            'disabled' => $disabled,
            'usage_percentage' => $total > 0 ? round(($used / $total) * 100, 2) : 0,
        ];
    }

    /**
     * Export links to CSV format
     *
     * @param string $activityId
     * @param array $filters
     * @return array
     */
    public function exportLinks(string $activityId, array $filters = []): array
    {
        $query = GeneratedEventLink::with(['group', 'participant', 'creator'])
            ->where('activity_id', $activityId);

        // Apply filters
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['group_id'])) {
            $query->where('group_id', $filters['group_id']);
        }

        $links = $query->orderBy('tag')->get();

        $frontendUrl = config('app.frontend_url', 'https://prod.qsights.com');

        return $links->map(function ($link) use ($frontendUrl) {
            return [
                'tag' => $link->tag,
                'url' => "{$frontendUrl}/activities/take/{$link->activity_id}?token=" . urlencode($link->token),
                'group' => $link->group?->name ?? 'No Group',
                'status' => ucfirst($link->status),
                'created_by' => $link->creator?->name ?? 'N/A',
                'created_at' => $link->created_at->format('Y-m-d H:i:s'),
                'used_at' => $link->used_at ? $link->used_at->format('Y-m-d H:i:s') : '',
                'participant' => $link->participant?->name ?? '',
                'participant_email' => $link->participant?->email ?? '',
            ];
        })->toArray();
    }

    /**
     * Create or get group for an activity
     *
     * @param string $activityId
     * @param string $name
     * @param string|null $description
     * @return GeneratedLinkGroup
     */
    public function createGroup(string $activityId, string $name, ?string $description = null): GeneratedLinkGroup
    {
        return GeneratedLinkGroup::firstOrCreate(
            [
                'activity_id' => $activityId,
                'name' => $name,
            ],
            [
                'description' => $description,
                'total_links' => 0,
                'used_links' => 0,
            ]
        );
    }
}
