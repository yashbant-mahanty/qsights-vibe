<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\NotificationTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class NotificationTemplateController extends Controller
{
    /**
     * Get all templates for an activity
     */
    public function index(Request $request, string $activityId)
    {
        $activity = Activity::findOrFail($activityId);

        $customTemplates = $activity->notificationTemplates()
            ->orderBy('notification_type')
            ->get()
            ->keyBy('notification_type');

        $allTypes = NotificationTemplate::getNotificationTypes();
        $templates = [];

        // For each notification type, return custom or default template
        foreach ($allTypes as $type) {
            if (isset($customTemplates[$type])) {
                // Custom template exists
                $templates[] = $customTemplates[$type];
            } else {
                // Return default template
                $defaultTemplate = NotificationTemplate::getDefaultTemplate($type);
                $templates[] = [
                    'id' => null, // No ID for default templates
                    'activity_id' => $activityId,
                    'notification_type' => $type,
                    'subject' => $defaultTemplate['subject'],
                    'body_html' => $defaultTemplate['body_html'],
                    'body_text' => $defaultTemplate['body_text'],
                    'is_active' => true,
                    'is_default' => true, // Flag to indicate it's a default
                    'placeholders' => NotificationTemplate::getAvailablePlaceholders(),
                ];
            }
        }

        // Include available notification types and placeholders
        return response()->json([
            'data' => $templates,
            'available_types' => $allTypes,
            'available_placeholders' => NotificationTemplate::getAvailablePlaceholders(),
        ]);
    }

    /**
     * Get a specific template
     */
    public function show(Request $request, string $activityId, string $templateId)
    {
        $activity = Activity::findOrFail($activityId);
        
        $template = NotificationTemplate::where('id', $templateId)
            ->where('activity_id', $activityId)
            ->firstOrFail();

        return response()->json([
            'template' => $template,
            'available_placeholders' => NotificationTemplate::getAvailablePlaceholders(),
        ]);
    }

    /**
     * Get template by notification type
     */
    public function getByType(Request $request, string $activityId, string $type)
    {
        $activity = Activity::findOrFail($activityId);
        
        $template = NotificationTemplate::where('activity_id', $activityId)
            ->where('notification_type', $type)
            ->first();

        // If no custom template, return default
        if (!$template) {
            $defaultTemplate = NotificationTemplate::getDefaultTemplate($type);
            return response()->json([
                'template' => [
                    'notification_type' => $type,
                    'subject' => $defaultTemplate['subject'],
                    'body_html' => $defaultTemplate['body_html'],
                    'body_text' => $defaultTemplate['body_text'],
                    'is_default' => true,
                ],
                'available_placeholders' => NotificationTemplate::getAvailablePlaceholders(),
            ]);
        }

        return response()->json([
            'template' => $template,
            'available_placeholders' => NotificationTemplate::getAvailablePlaceholders(),
        ]);
    }

    /**
     * Create or update a notification template
     */
    public function store(Request $request, string $activityId)
    {
        $activity = Activity::findOrFail($activityId);

        $validated = $request->validate([
            'notification_type' => [
                'required',
                'string',
                Rule::in(NotificationTemplate::getNotificationTypes()),
            ],
            'subject' => 'required|string|max:255',
            'body_html' => 'required|string',
            'body_text' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        // Check if template already exists for this activity and type
        $template = NotificationTemplate::where('activity_id', $activityId)
            ->where('notification_type', $validated['notification_type'])
            ->first();

        if ($template) {
            // Update existing template
            $template->update($validated);
            $message = 'Notification template updated successfully';
        } else {
            // Create new template
            $template = NotificationTemplate::create([
                'id' => Str::uuid(),
                'activity_id' => $activityId,
                'notification_type' => $validated['notification_type'],
                'subject' => $validated['subject'],
                'body_html' => $validated['body_html'],
                'body_text' => $validated['body_text'] ?? strip_tags($validated['body_html']),
                'is_active' => $validated['is_active'] ?? true,
                'placeholders' => NotificationTemplate::getAvailablePlaceholders(),
            ]);
            $message = 'Notification template created successfully';
        }

        return response()->json([
            'message' => $message,
            'template' => $template->fresh(),
        ], $template->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Update a specific template
     */
    public function update(Request $request, string $activityId, string $templateId)
    {
        $activity = Activity::findOrFail($activityId);

        $template = NotificationTemplate::where('id', $templateId)
            ->where('activity_id', $activityId)
            ->firstOrFail();

        $validated = $request->validate([
            'notification_type' => [
                'sometimes',
                'string',
                Rule::in(NotificationTemplate::getNotificationTypes()),
            ],
            'subject' => 'sometimes|string|max:255',
            'body_html' => 'sometimes|string',
            'body_text' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $template->update($validated);

        return response()->json([
            'message' => 'Notification template updated successfully',
            'template' => $template->fresh(),
        ]);
    }

    /**
     * Delete a template (revert to default)
     */
    public function destroy(Request $request, string $activityId, string $templateId)
    {
        $activity = Activity::findOrFail($activityId);

        $template = NotificationTemplate::where('id', $templateId)
            ->where('activity_id', $activityId)
            ->firstOrFail();

        $notificationType = $template->notification_type;
        $template->delete();

        return response()->json([
            'message' => 'Notification template deleted. Default template will be used.',
            'notification_type' => $notificationType,
        ]);
    }

    /**
     * Reset template to default
     */
    public function resetToDefault(Request $request, string $activityId, string $type)
    {
        $activity = Activity::findOrFail($activityId);

        $request->validate([
            'type' => [
                'sometimes',
                'string',
                Rule::in(NotificationTemplate::getNotificationTypes()),
            ],
        ]);

        $type = $request->input('type', $type);

        // Delete existing custom template
        NotificationTemplate::where('activity_id', $activityId)
            ->where('notification_type', $type)
            ->delete();

        // Get default template
        $defaultTemplate = NotificationTemplate::getDefaultTemplate($type);

        return response()->json([
            'message' => 'Template reset to default successfully',
            'default_template' => [
                'notification_type' => $type,
                'subject' => $defaultTemplate['subject'],
                'body_html' => $defaultTemplate['body_html'],
                'body_text' => $defaultTemplate['body_text'],
            ],
        ]);
    }

    /**
     * Preview template with sample data
     */
    public function preview(Request $request, string $activityId)
    {
        $activity = Activity::with(['program.organization'])->findOrFail($activityId);

        $validated = $request->validate([
            'notification_type' => [
                'required',
                'string',
                Rule::in(NotificationTemplate::getNotificationTypes()),
            ],
            'subject' => 'required|string',
            'body_html' => 'required|string',
            'body_text' => 'nullable|string',
        ]);

        // Sample data for preview
        $sampleData = [
            'participant_name' => 'John Doe',
            'participant_email' => 'john.doe@example.com',
            'activity_name' => $activity->name,
            'activity_description' => $activity->description ?? 'Sample activity description',
            'activity_type' => $activity->type,
            'activity_start_date' => $activity->start_date ? $activity->start_date->format('F j, Y') : 'TBD',
            'activity_end_date' => $activity->end_date ? $activity->end_date->format('F j, Y') : 'TBD',
            'program_name' => $activity->program->name,
            'program_description' => $activity->program->description ?? '',
            'organization_name' => $activity->program->organization->name ?? 'QSights',
            'activity_url' => env('APP_URL') . '/activities/' . $activityId,
            'days_until_start' => $activity->start_date ? now()->diffInDays($activity->start_date, false) : 0,
            'current_date' => now()->format('F j, Y'),
            'response_count' => $activity->responses()->count(),
            'completion_rate' => $activity->getCompletionRate(),
        ];

        // Create temporary template object
        $tempTemplate = new NotificationTemplate([
            'subject' => $validated['subject'],
            'body_html' => $validated['body_html'],
            'body_text' => $validated['body_text'] ?? strip_tags($validated['body_html']),
        ]);

        // Render with sample data
        $rendered = $tempTemplate->renderTemplate($sampleData);

        return response()->json([
            'preview' => $rendered,
            'sample_data' => $sampleData,
        ]);
    }

    /**
     * Bulk create default templates for an activity
     */
    public function createDefaults(Request $request, string $activityId)
    {
        $activity = Activity::findOrFail($activityId);

        $types = NotificationTemplate::getNotificationTypes();
        $created = [];

        foreach ($types as $type) {
            // Check if template already exists
            $exists = NotificationTemplate::where('activity_id', $activityId)
                ->where('notification_type', $type)
                ->exists();

            if (!$exists) {
                $defaultTemplate = NotificationTemplate::getDefaultTemplate($type);
                
                $template = NotificationTemplate::create([
                    'id' => Str::uuid(),
                    'activity_id' => $activityId,
                    'notification_type' => $type,
                    'subject' => $defaultTemplate['subject'],
                    'body_html' => $defaultTemplate['body_html'],
                    'body_text' => $defaultTemplate['body_text'],
                    'is_active' => true,
                    'placeholders' => NotificationTemplate::getAvailablePlaceholders(),
                ]);

                $created[] = $template;
            }
        }

        return response()->json([
            'message' => count($created) . ' default templates created',
            'created_templates' => $created,
        ], 201);
    }

    /**
     * Get available notification types
     */
    public function getNotificationTypes()
    {
        return response()->json([
            'types' => NotificationTemplate::getNotificationTypes(),
        ]);
    }

    /**
     * Get available placeholders
     */
    public function getPlaceholders()
    {
        return response()->json([
            'placeholders' => NotificationTemplate::getAvailablePlaceholders(),
        ]);
    }
}
