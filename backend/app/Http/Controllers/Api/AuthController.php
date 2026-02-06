<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Build a consistent backend token cookie.
     */
    private function backendTokenCookie(string $token, ?int $minutes = null)
    {
        $minutes = $minutes ?? (int) config('session.lifetime', 120);
        $domain = config('session.domain');
        $secure = (bool) config('session.secure');
        $sameSite = config('session.same_site', 'lax');

        return cookie(
            'backendToken',
            $token,
            $minutes,
            '/',
            $domain,
            $secure,
            true,   // httpOnly
            true,   // raw - don't URL encode (we'll exclude from encryption too)
            $sameSite
        );
    }

    /**
     * Forget the backend token cookie.
     */
    private function forgetBackendTokenCookie()
    {
        $domain = config('session.domain');
        $secure = (bool) config('session.secure');
        $sameSite = config('session.same_site', 'lax');

        return cookie()->forget('backendToken', '/', $domain, $secure, $sameSite);
    }

    /**
     * Validate if email exists in system
     */
    public function validateEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'exists' => false,
                'message' => 'Email not found in system'
            ], 404);
        }

        return response()->json([
            'exists' => true,
            'email' => $user->email,
            'role' => $user->role
        ]);
    }

    /**
     * Login user and return Sanctum token
     */
    public function login(Request $request)
    {
        \Log::info('Login method called', ['email' => $request->email]);
        
        try {
            $request->validate([
                'email' => 'required|string',
                'password' => 'required',
            ]);

            \Log::info('Validation passed');

            $user = null;
            $passwordVerified = false;

            // Try to find user by email first, then by username (stored in 'name' field)
            $user = User::where('email', $request->email)->first();
            if (!$user) {
                // If not found by email, try username (which is stored in 'name' field for program users)
                $user = User::where('name', $request->email)->first();
            }
            
            // If found in users table, verify password
            if ($user) {
                $passwordVerified = Hash::check($request->password, $user->password);
                \Log::info('User found in users table', ['verified' => $passwordVerified]);
            }
            
            // If still not found or password doesn't match, check program_roles table
            if (!$passwordVerified) {
                \Log::info('Checking program_roles table');
                $programRole = DB::table('program_roles')
                    ->where(function($query) use ($request) {
                        $query->where('email', $request->email)
                              ->orWhere('username', $request->email);
                    })
                    ->where('status', 'active')
                    ->first();
                
                if ($programRole) {
                    \Log::info('Program role found', ['email' => $programRole->email, 'program_id' => $programRole->program_id]);
                    $passwordVerified = Hash::check($request->password, $programRole->password);
                    
                    if ($passwordVerified) {
                        \Log::info('Password verified for program role');
                        
                        // Determine the role for users table
                        // System roles (program_id = null) should use role_name directly
                        // Program roles should use 'program-user' as the role
                        $userRole = is_null($programRole->program_id) 
                            ? 'system-user' // System-wide role
                            : 'program-user'; // Program-specific role
                        
                        // Create or sync user record for this program role
                        $user = User::updateOrCreate(
                            ['email' => $programRole->email],
                            [
                                'name' => $programRole->username,
                                'password' => $programRole->password, // Already hashed
                                'role' => $userRole,
                                'program_id' => $programRole->program_id, // Will be null for system roles
                                'status' => 'active'
                            ]
                        );
                        \Log::info('User synced from program_roles', ['email' => $user->email, 'role' => $userRole, 'program_id' => $programRole->program_id]);
                    }
                }
            }
            
            \Log::info('Authentication check', ['user_exists' => $user ? 'yes' : 'no', 'password_verified' => $passwordVerified]);

            if (!$user || !$passwordVerified) {
                \Log::info('Authentication failed');
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }

            \Log::info('Authentication successful, creating token');

            // Create Sanctum token
            $token = $user->createToken('auth-token')->plainTextToken;
            \Log::info('Token created successfully');
            
            $cookie = $this->backendTokenCookie($token);
            \Log::info('Cookie created');

            $response = response()->json([
                'user' => [
                    'userId' => $user->id,
                    'email' => $user->email,
                    'name' => $user->name,
                    'role' => $user->role,
                    'organizationId' => $user->organization_id,
                    'programId' => $user->program_id,
                ],
                'token' => $token,
                'token_type' => 'Bearer'
            ])->cookie($cookie);
            
            \Log::info('Response created, returning');
            return $response;
        } catch (\Exception $e) {
            \Log::error('Login exception', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            throw $e;
        }
    }

    /**
     * Logout user and revoke token
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ])->withCookie($this->forgetBackendTokenCookie());
    }

    /**
     * Get authenticated user
     */
    public function me(Request $request)
    {
        // Debug logging
        \Log::info('[AuthController::me] Request received', [
            'has_auth_header' => $request->hasHeader('Authorization'),
            'auth_header' => $request->header('Authorization') ? substr($request->header('Authorization'), 0, 30) . '...' : null,
            'bearer_token' => $request->bearerToken() ? substr($request->bearerToken(), 0, 20) . '...' : null,
        ]);
        
        $user = $request->user();
        
        \Log::info('[AuthController::me] User loaded', [
            'user_found' => $user ? true : false,
            'user_id' => $user ? $user->id : null,
            'user_email' => $user ? $user->email : null,
            'user_role' => $user ? $user->role : null,
        ]);

        if (!$user) {
            \Log::warning('[AuthController::me] User not authenticated - returning 401');
            return response()->json([
                'message' => 'Unauthenticated'
            ], 401);
        }

        // Get services/permissions for program roles and system roles
        $services = [];
        $allowedProgramIds = null; // For system users with program restrictions
        
        // Super Admin gets all services by default (hardcoded list for backward compatibility)
        if ($user->role === 'super-admin') {
            $services = [
                "Overview",
                "Organizations",
                "Programs",
                "Group Management",
                "Participants",
                "Activities",
                "Questionnaires",
                "Communications",
                "Reports",
                "AI Reports",
                "Evaluation",
                "Settings",
                "Users",
                "Roles",
                "Permissions",
                "Special Access",
                "Authentication"
            ];
        } 
        // Admin gets all services by default
        elseif ($user->role === 'admin') {
            $services = [
                "Overview",
                "Organizations",
                "Programs",
                "Group Management",
                "Participants",
                "Activities",
                "Questionnaires",
                "Communications",
                "Reports",
                "AI Reports",
                "Evaluation",
                "Settings",
                "Users",
                "Roles",
                "Permissions",
                "Special Access",
                "Authentication"
            ];
        }
        // Program-scoped roles (program-admin, program-manager, program-moderator, evaluation-admin) use default_services from database
        elseif (in_array($user->role, ['program-admin', 'program-manager', 'program-moderator', 'evaluation-admin'])) {
            // Load services from default_services column (predefined services from role_service_definitions)
            if ($user->default_services) {
                $services = is_array($user->default_services) ? $user->default_services : json_decode($user->default_services, true);
            } else {
                // Fallback to empty array if no default_services set
                $services = [];
            }
        } 
        else {
            // Check program_roles table for both system roles (program_id = null) and program roles
            $programRole = DB::table('program_roles')
                ->where('email', $user->email)
                ->where(function($query) use ($user) {
                    // Match system roles (program_id = null) OR match specific program
                    $query->whereNull('program_id')
                          ->orWhere('program_id', $user->program_id);
                })
                ->first();
            
            if ($programRole && $programRole->services) {
                $roleServices = json_decode($programRole->services, true) ?? [];
                // For system-user and program-user roles, ONLY use services from program_roles
                // (don't merge with default_services)
                if ($user->role === 'system-user' || $user->role === 'program-user') {
                    $services = $roleServices;
                    
                    // For system users, also get allowed_program_ids
                    if ($user->role === 'system-user' && isset($programRole->allowed_program_ids)) {
                        $allowedProgramIds = json_decode($programRole->allowed_program_ids, true);
                    }
                } else {
                    // For other roles, use default_services as base if available
                    if ($user->default_services) {
                        $services = $user->default_services;
                    }
                    // Merge with role services (role services take precedence)
                    $services = array_unique(array_merge($services, $roleServices));
                }
            } else {
                // No program role found, use default_services if available
                if ($user->default_services) {
                    $services = $user->default_services;
                }
            }
        }

        return response()->json([
            'user' => [
                'userId' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
                'role' => $user->role,
                'organizationId' => $user->organization_id,
                'programId' => $user->program_id,
                'phone' => $user->phone,
                'communication_email' => $user->communication_email,
                'address' => $user->address,
                'city' => $user->city,
                'state' => $user->state,
                'country' => $user->country,
                'postal_code' => $user->postal_code,
                'bio' => $user->bio,
                'preferences' => $user->preferences,
                'services' => $services, // Add services for permission checks
                'defaultServices' => $user->default_services, // Original default services for reference
                'allowedProgramIds' => $allowedProgramIds, // For system users with program restrictions
            ]
        ]);
    }

    /**
     * Refresh token (create new token and revoke old one)
     */
    public function refresh(Request $request)
    {
        $user = $request->user();
        
        // Revoke current token
        $request->user()->currentAccessToken()->delete();
        
        // Create new token
        $token = $user->createToken('auth-token')->plainTextToken;
        $cookie = $this->backendTokenCookie($token);

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer'
        ])->cookie($cookie);
    }
}
