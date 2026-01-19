<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Services\ResponseAuditService;
use App\Services\NotificationLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DataSafetyController extends Controller
{
    protected $responseAuditService;
    protected $notificationLogService;

    public function __construct(
        ResponseAuditService $responseAuditService,
        NotificationLogService $notificationLogService
    ) {
        $this->responseAuditService = $responseAuditService;
        $this->notificationLogService = $notificationLogService;
    }

    /**
     * Get all data safety settings
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getSettings()
    {
        try {
            $settings = SystemSetting::where('category', 'data_safety')->get();

            $formatted = [];
            foreach ($settings as $setting) {
                $key = str_replace('data_safety_', '', $setting->key);
                $formatted[$key] = [
                    'value' => $this->parseValue($setting->value, $setting->type),
                    'type' => $setting->type,
                    'description' => $setting->description,
                ];
            }

            return response()->json([
                'success' => true,
                'settings' => $formatted
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update data safety settings
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateSettings(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'enable_response_backup' => 'nullable|boolean',
                'include_anonymous' => 'nullable|boolean',
                'retention_policy' => 'nullable|in:never,1year,2years,5years,7years',
                'enable_notification_logging' => 'nullable|boolean',
                'log_notification_content' => 'nullable|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $updated = [];

            // Update each setting
            if ($request->has('enable_response_backup')) {
                $this->updateSetting('data_safety_enable_response_backup', $request->enable_response_backup);
                $updated['enable_response_backup'] = $request->enable_response_backup;
            }

            if ($request->has('include_anonymous')) {
                $this->updateSetting('data_safety_include_anonymous', $request->include_anonymous);
                $updated['include_anonymous'] = $request->include_anonymous;
            }

            if ($request->has('retention_policy')) {
                $this->updateSetting('data_safety_retention_policy', $request->retention_policy);
                $updated['retention_policy'] = $request->retention_policy;
            }

            if ($request->has('enable_notification_logging')) {
                $this->updateSetting('data_safety_enable_notification_logging', $request->enable_notification_logging);
                $updated['enable_notification_logging'] = $request->enable_notification_logging;
            }

            if ($request->has('log_notification_content')) {
                $this->updateSetting('data_safety_log_notification_content', $request->log_notification_content);
                $updated['log_notification_content'] = $request->log_notification_content;
            }

            return response()->json([
                'success' => true,
                'message' => 'Settings updated successfully',
                'updated' => $updated
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to update settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get response audit statistics
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getResponseAuditStats(Request $request)
    {
        try {
            $filters = [];

            if ($request->has('event_id')) {
                $filters['event_id'] = $request->event_id;
            }

            if ($request->has('date_from')) {
                $filters['date_from'] = $request->date_from;
            }

            if ($request->has('date_to')) {
                $filters['date_to'] = $request->date_to;
            }

            $stats = $this->responseAuditService->getStatistics($filters);

            return response()->json([
                'success' => true,
                'statistics' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch statistics: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get notification log statistics
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getNotificationStats(Request $request)
    {
        try {
            $eventId = $request->input('event_id');

            if (!$eventId) {
                return response()->json([
                    'success' => false,
                    'error' => 'event_id is required'
                ], 422);
            }

            $stats = $this->notificationLogService->getStatistics($eventId);

            return response()->json([
                'success' => true,
                'statistics' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch statistics: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get system health check for data safety
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getHealthCheck()
    {
        try {
            $health = [
                'response_backup_enabled' => $this->isSettingEnabled('data_safety_enable_response_backup'),
                'notification_logging_enabled' => $this->isSettingEnabled('data_safety_enable_notification_logging'),
                'retention_policy' => SystemSetting::getValue('data_safety_retention_policy') ?? 'never',
                'tables_exist' => [
                    'response_audit_logs' => \Schema::hasTable('response_audit_logs'),
                    'notification_logs' => \Schema::hasTable('notification_logs'),
                    'response_backups' => \Schema::hasTable('response_backups'),
                ],
                'timestamp' => now()->toIso8601String(),
            ];

            return response()->json([
                'success' => true,
                'health' => $health
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to get health check: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper: Update a single setting
     */
    protected function updateSetting(string $key, $value)
    {
        $setting = SystemSetting::where('key', $key)->first();
        
        if ($setting) {
            $setting->value = is_bool($value) ? ($value ? 'true' : 'false') : $value;
            $setting->updated_at = now();
            $setting->save();
        }
    }

    /**
     * Helper: Parse setting value based on type
     */
    protected function parseValue($value, $type)
    {
        switch ($type) {
            case 'boolean':
                return filter_var($value, FILTER_VALIDATE_BOOLEAN);
            case 'integer':
                return (int) $value;
            case 'json':
                return json_decode($value, true);
            default:
                return $value;
        }
    }

    /**
     * Helper: Check if a setting is enabled
     */
    protected function isSettingEnabled(string $key): bool
    {
        try {
            $value = SystemSetting::getValue($key);
            return filter_var($value, FILTER_VALIDATE_BOOLEAN);
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get migration statistics for JSON to backups
     */
    public function migrationStats()
    {
        try {
            // Total responses
            $totalResponses = \App\Models\Response::count();
            
            // Responses with JSON answers - PostgreSQL compatible
            $withJson = \App\Models\Response::whereNotNull('answers')
                ->whereRaw("answers::text != '{}'")
                ->whereRaw("answers::text != 'null'")
                ->count();
            
            // Responses with backup records
            $backedUp = \DB::table('response_backups')
                ->distinct('response_id')
                ->count('response_id');
            
            // Total backup records
            $totalBackups = \DB::table('response_backups')->count();
            
            return response()->json([
                'total_responses' => $totalResponses,
                'with_json' => $withJson,
                'backed_up' => $backedUp,
                'total_backups' => $totalBackups,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch migration stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get recent backup records
     */
    public function getBackups(Request $request)
    {
        try {
            $limit = $request->input('limit', 50);
            
            $backups = \DB::table('response_backups')
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get();
            
            return response()->json([
                'data' => $backups,
                'count' => $backups->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch backups',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Migrate JSON answers to backup table
     */
    public function migrateJsonToBackups()
    {
        try {
            \DB::beginTransaction();
            
            // Get responses with JSON answers - PostgreSQL compatible
            $responses = \App\Models\Response::whereNotNull('answers')
                ->whereRaw("answers::text != '{}'")
                ->whereRaw("answers::text != 'null'")
                ->get();
            
            $migratedCount = 0;
            $errorCount = 0;
            $errors = [];
            
            foreach ($responses as $response) {
                try {
                    $jsonAnswers = is_string($response->answers) 
                        ? json_decode($response->answers, true) 
                        : $response->answers;
                    
                    if (empty($jsonAnswers) || !is_array($jsonAnswers)) {
                        continue;
                    }
                    
                    // Check if already backed up
                    $existingBackup = \DB::table('response_backups')
                        ->where('response_id', $response->id)
                        ->exists();
                    
                    if ($existingBackup) {
                        continue; // Skip if already backed up
                    }
                    
                    foreach ($jsonAnswers as $questionId => $value) {
                        \DB::table('response_backups')->insert([
                            'response_id' => $response->id,
                            'activity_id' => $response->activity_id,
                            'participant_id' => $response->participant_id,
                            'question_id' => $questionId,
                            'question_type' => 'unknown',
                            'raw_value' => is_array($value) ? json_encode($value) : $value,
                            'display_label' => is_array($value) ? json_encode($value) : $value,
                            'source' => 'json_migration',
                            'created_at' => $response->created_at ?? now(),
                            'updated_at' => now(),
                        ]);
                    }
                    
                    $migratedCount++;
                } catch (\Exception $e) {
                    $errorCount++;
                    $errors[] = [
                        'response_id' => $response->id,
                        'error' => $e->getMessage()
                    ];
                }
            }
            
            \DB::commit();
            
            return response()->json([
                'message' => 'Migration completed',
                'migrated' => $migratedCount,
                'errors' => $errorCount,
                'error_details' => $errors,
            ]);
        } catch (\Exception $e) {
            \DB::rollBack();
            return response()->json([
                'message' => 'Migration failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
