<?php

namespace App\Http\Middleware;

use App\Services\PermissionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Check Permission Middleware
 * 
 * Usage in routes:
 * Route::middleware(['auth:sanctum', 'permission:questionnaires,canCreate'])->group(...);
 */
class CheckPermission
{
    protected $permissionService;

    public function __construct(PermissionService $permissionService)
    {
        $this->permissionService = $permissionService;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $resource, string $action): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'error' => 'Unauthenticated'
            ], 401);
        }

        if (!$this->permissionService->hasPermission($user, $resource, $action)) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => "You do not have permission to {$action} {$resource}",
            ], 403);
        }

        return $next($request);
    }
}
