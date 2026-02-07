<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\UserRoleHierarchy;
use Symfony\Component\HttpFoundation\Response;

class CheckManagerAccess
{
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
                'message' => 'Unauthenticated',
            ], 401);
        }

        // Super admin and admin have full access
        if (in_array($user->role, ['super-admin', 'admin'])) {
            return $next($request);
        }

        // Check if user is a manager in any program
        $isManager = UserRoleHierarchy::where('manager_user_id', $user->id)
            ->exists();

        if (!$isManager) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Manager role required.',
            ], 403);
        }

        return $next($request);
    }
}
