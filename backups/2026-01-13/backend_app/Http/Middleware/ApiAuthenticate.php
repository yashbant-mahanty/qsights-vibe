<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate;

class ApiAuthenticate extends Authenticate
{
    /**
     * Determine where to redirect when authentication fails.
     */
    protected function redirectTo($request)
    {
        // For API requests or JSON expectations, do not redirect; let it return 401.
        if ($request->expectsJson() || $request->is('api/*')) {
            return null;
        }

        // Fallback for web: send to home instead of a missing named route.
        return '/';
    }
}
