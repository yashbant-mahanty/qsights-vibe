<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enforce Program Scoping for Program-level roles
 * 
 * CRITICAL SECURITY: Ensures Program Admin, Program Manager, and Program Moderator
 * can ONLY access data from their assigned program.
 * 
 * This middleware automatically adds program_id filter to requests
 * and blocks access to data from other programs.
 */
class EnforceProgramScoping
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Skip if not authenticated
        if (!$user) {
            return $next($request);
        }

        // Check if user is program-scoped role
        $programScopedRoles = ['program-admin', 'program-manager', 'program-moderator'];
        
        if (!in_array($user->role, $programScopedRoles)) {
            // Not a program-scoped role, allow request
            return $next($request);
        }

        // CRITICAL: User has a program-scoped role but no program assigned
        if (!$user->program_id) {
            return response()->json([
                'message' => 'Access denied: No program assigned to your account',
                'error' => 'PROGRAM_NOT_ASSIGNED'
            ], 403);
        }

        // CRITICAL SECURITY CHECK: Enforce program_id filtering
        // If request has program_id parameter, validate it matches user's program
        if ($request->has('program_id')) {
            $requestedProgramId = $request->input('program_id');
            
            if ($requestedProgramId !== $user->program_id) {
                \Log::warning('Program scope violation attempt', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'user_role' => $user->role,
                    'user_program_id' => $user->program_id,
                    'requested_program_id' => $requestedProgramId,
                    'endpoint' => $request->path(),
                    'method' => $request->method(),
                    'ip' => $request->ip(),
                ]);

                return response()->json([
                    'message' => 'Access denied: You can only access data from your assigned program',
                    'error' => 'PROGRAM_SCOPE_VIOLATION'
                ], 403);
            }
        } else {
            // No program_id in request - automatically add user's program_id
            // This ensures queries are automatically scoped
            $request->merge(['program_id' => $user->program_id]);
        }

        // Check route parameters for program_id (e.g., /programs/{programId})
        if ($request->route('programId')) {
            $routeProgramId = $request->route('programId');
            
            if ($routeProgramId !== $user->program_id) {
                \Log::warning('Program scope violation attempt (route param)', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'user_role' => $user->role,
                    'user_program_id' => $user->program_id,
                    'route_program_id' => $routeProgramId,
                    'endpoint' => $request->path(),
                ]);

                return response()->json([
                    'message' => 'Access denied: You can only access your assigned program',
                    'error' => 'PROGRAM_SCOPE_VIOLATION'
                ], 403);
            }
        }

        // Log successful program-scoped access (for audit)
        \Log::info('Program-scoped access', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'program_id' => $user->program_id,
            'endpoint' => $request->path(),
            'method' => $request->method(),
        ]);

        return $next($request);
    }
}
