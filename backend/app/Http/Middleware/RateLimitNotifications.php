<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class RateLimitNotifications
{
    /**
     * Rate limit configuration
     */
    private const MAX_NOTIFICATIONS_PER_HOUR = 50;
    private const MAX_NOTIFICATIONS_PER_DAY = 200;
    private const MAX_RECIPIENTS_PER_NOTIFICATION = 100;

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }

        $userId = $user->id;

        // Check hourly limit
        $hourlyKey = "notification_rate_limit:hourly:{$userId}";
        $hourlyCount = Cache::get($hourlyKey, 0);

        if ($hourlyCount >= self::MAX_NOTIFICATIONS_PER_HOUR) {
            Log::warning('Notification rate limit exceeded (hourly)', [
                'user_id' => $userId,
                'count' => $hourlyCount,
                'limit' => self::MAX_NOTIFICATIONS_PER_HOUR,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Notification rate limit exceeded. Maximum ' . self::MAX_NOTIFICATIONS_PER_HOUR . ' notifications per hour.',
                'rate_limit' => [
                    'limit' => self::MAX_NOTIFICATIONS_PER_HOUR,
                    'remaining' => 0,
                    'reset_in_seconds' => Cache::get($hourlyKey . ':ttl', 3600),
                ]
            ], 429);
        }

        // Check daily limit
        $dailyKey = "notification_rate_limit:daily:{$userId}";
        $dailyCount = Cache::get($dailyKey, 0);

        if ($dailyCount >= self::MAX_NOTIFICATIONS_PER_DAY) {
            Log::warning('Notification rate limit exceeded (daily)', [
                'user_id' => $userId,
                'count' => $dailyCount,
                'limit' => self::MAX_NOTIFICATIONS_PER_DAY,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Daily notification limit exceeded. Maximum ' . self::MAX_NOTIFICATIONS_PER_DAY . ' notifications per day.',
                'rate_limit' => [
                    'limit' => self::MAX_NOTIFICATIONS_PER_DAY,
                    'remaining' => 0,
                    'reset_in_seconds' => Cache::get($dailyKey . ':ttl', 86400),
                ]
            ], 429);
        }

        // Check recipient count limit
        $recipientIds = $request->input('recipient_ids', []);
        if (is_array($recipientIds) && count($recipientIds) > self::MAX_RECIPIENTS_PER_NOTIFICATION) {
            Log::warning('Recipient count limit exceeded', [
                'user_id' => $userId,
                'recipient_count' => count($recipientIds),
                'limit' => self::MAX_RECIPIENTS_PER_NOTIFICATION,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Too many recipients. Maximum ' . self::MAX_RECIPIENTS_PER_NOTIFICATION . ' recipients per notification.',
            ], 422);
        }

        // Process the request
        $response = $next($request);

        // Increment counters only if request was successful (2xx status)
        if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
            // Increment hourly counter
            if (!Cache::has($hourlyKey)) {
                Cache::put($hourlyKey, 0, 3600); // 1 hour
                Cache::put($hourlyKey . ':ttl', 3600, 3600);
            }
            Cache::increment($hourlyKey);

            // Increment daily counter
            if (!Cache::has($dailyKey)) {
                $secondsUntilMidnight = now()->endOfDay()->diffInSeconds(now());
                Cache::put($dailyKey, 0, $secondsUntilMidnight);
                Cache::put($dailyKey . ':ttl', $secondsUntilMidnight, $secondsUntilMidnight);
            }
            Cache::increment($dailyKey);

            Log::info('Notification rate limit updated', [
                'user_id' => $userId,
                'hourly_count' => Cache::get($hourlyKey),
                'daily_count' => Cache::get($dailyKey),
            ]);
        }

        // Add rate limit headers to response
        $response->headers->set('X-RateLimit-Limit-Hourly', self::MAX_NOTIFICATIONS_PER_HOUR);
        $response->headers->set('X-RateLimit-Remaining-Hourly', max(0, self::MAX_NOTIFICATIONS_PER_HOUR - $hourlyCount - 1));
        $response->headers->set('X-RateLimit-Limit-Daily', self::MAX_NOTIFICATIONS_PER_DAY);
        $response->headers->set('X-RateLimit-Remaining-Daily', max(0, self::MAX_NOTIFICATIONS_PER_DAY - $dailyCount - 1));

        return $response;
    }
}
