<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class LogManagerActions
{
    /**
     * Handle an incoming request and log manager actions.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);
        
        // Get authenticated user
        $user = $request->user();
        
        // Prepare action data
        $actionData = [
            'user_id' => $user ? $user->id : null,
            'user_email' => $user ? $user->email : null,
            'action' => $this->getActionName($request),
            'method' => $request->method(),
            'path' => $request->path(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'request_id' => $request->id ?? uniqid('req_', true),
        ];

        // Process the request
        $response = $next($request);

        // Calculate execution time
        $executionTime = round((microtime(true) - $startTime) * 1000, 2);
        $actionData['execution_time_ms'] = $executionTime;
        $actionData['status_code'] = $response->getStatusCode();

        // Log based on status code
        if ($response->getStatusCode() >= 400) {
            $actionData['level'] = 'error';
            $actionData['response_body'] = $response->getContent();
        } elseif ($response->getStatusCode() >= 300) {
            $actionData['level'] = 'warning';
        } else {
            $actionData['level'] = 'info';
        }

        // Store in hierarchy_change_log table for audit trail
        try {
            DB::table('hierarchy_change_log')->insert([
                'id' => \Illuminate\Support\Str::uuid(),
                'user_id' => $user ? $user->id : null,
                'action_type' => $actionData['action'],
                'target_user_id' => $this->extractTargetUserId($request),
                'changes' => json_encode([
                    'method' => $actionData['method'],
                    'path' => $actionData['path'],
                    'ip_address' => $actionData['ip_address'],
                    'status_code' => $actionData['status_code'],
                    'execution_time_ms' => $executionTime,
                    'request_payload' => $this->sanitizePayload($request->all()),
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to log manager action to database', [
                'error' => $e->getMessage(),
                'action_data' => $actionData,
            ]);
        }

        // Also log to file for redundancy
        Log::channel('daily')->log(
            $actionData['level'],
            'Manager Action: ' . $actionData['action'],
            $actionData
        );

        return $response;
    }

    /**
     * Get human-readable action name from request
     */
    private function getActionName(Request $request): string
    {
        $path = $request->path();
        $method = $request->method();

        // Map routes to action names
        $patterns = [
            'hierarchy/managers/\d+/analytics' => 'view_team_analytics',
            'hierarchy/managers/\d+/send-notification' => 'send_team_notification',
            'hierarchy/managers/\d+/team-members' => 'view_team_members',
            'hierarchy/team-members/\d+' => 'view_member_profile',
            'hierarchy/users/\d+/manager' => $method === 'POST' ? 'assign_manager' : 'update_manager',
            'hierarchy/users/\d+/remove-manager' => 'remove_manager',
            'hierarchy/users/\d+/info' => 'view_user_info',
            'hierarchy/users/\d+/subordinates' => 'view_subordinates',
            'hierarchy/users/\d+/statistics' => 'view_user_statistics',
            'hierarchy/programs/[^/]+/hierarchy-tree' => 'view_hierarchy_tree',
            'hierarchy/change-logs' => 'view_change_logs',
        ];

        foreach ($patterns as $pattern => $action) {
            if (preg_match('#^' . str_replace('/', '\/', $pattern) . '$#', $path)) {
                return $action;
            }
        }

        return 'unknown_hierarchy_action';
    }

    /**
     * Extract target user ID from request
     */
    private function extractTargetUserId(Request $request): ?int
    {
        // Try to get from route parameters
        $userId = $request->route('userId') 
            ?? $request->route('memberId')
            ?? $request->route('managerId');

        if ($userId && is_numeric($userId)) {
            return (int) $userId;
        }

        // Try to get from request body
        $body = $request->all();
        if (isset($body['user_id']) && is_numeric($body['user_id'])) {
            return (int) $body['user_id'];
        }

        return null;
    }

    /**
     * Sanitize payload to remove sensitive data
     */
    private function sanitizePayload(array $payload): array
    {
        $sensitiveKeys = ['password', 'password_confirmation', 'token', 'api_key', 'secret'];
        
        foreach ($sensitiveKeys as $key) {
            if (isset($payload[$key])) {
                $payload[$key] = '[REDACTED]';
            }
        }

        return $payload;
    }
}
