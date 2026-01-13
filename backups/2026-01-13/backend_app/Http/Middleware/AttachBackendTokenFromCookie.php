<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AttachBackendTokenFromCookie
{
    /**
     * If the request has a backendToken cookie but no Authorization header,
     * attach the cookie value as a Bearer token so Sanctum can authenticate it.
     */
    public function handle(Request $request, Closure $next)
    {
        \Log::info('AttachBackendTokenFromCookie middleware', [
            'uri' => $request->getRequestUri(),
            'has_bearer' => (bool)$request->bearerToken(),
            'bearer_token_preview' => $request->bearerToken() ? substr($request->bearerToken(), 0, 20) . '...' : null,
            'has_cookie' => (bool)$request->cookie('backendToken'),
            'all_cookies' => array_keys($request->cookies->all()),
            'authorization_header' => $request->header('Authorization') ? substr($request->header('Authorization'), 0, 30) . '...' : null,
        ]);
        
        // Only process if there's no bearer token already
        if (!$request->bearerToken()) {
            $cookieToken = $request->cookie('backendToken');
            if ($cookieToken) {
                // URL decode the token in case it's encoded
                $decodedToken = urldecode($cookieToken);
                $request->headers->set('Authorization', 'Bearer '.$decodedToken);
                \Log::info('Set Authorization from cookie', ['token_preview' => substr($decodedToken, 0, 20) . '...']);
            } else {
                \Log::warning('No backendToken cookie found and no bearer token');
            }
        }

        return $next($request);
    }
}
