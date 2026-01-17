<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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

            // Try to find user by email first, then by username (stored in 'name' field)
            $user = User::where('email', $request->email)->first();
            if (!$user) {
                // If not found by email, try username (which is stored in 'name' field for program users)
                $user = User::where('name', $request->email)->first();
            }
            \Log::info('User lookup complete', ['found' => $user ? 'yes' : 'no']);

            if (!$user || !Hash::check($request->password, $user->password)) {
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
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated'
            ], 401);
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
