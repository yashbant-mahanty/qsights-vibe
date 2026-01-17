<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
            // Override default auth middleware to avoid redirect-to-login for API requests
            'auth' => \App\Http\Middleware\ApiAuthenticate::class,
        ]);

        // Ensure backendToken cookie is decoded to Bearer FIRST (before Sanctum checks auth)
        $middleware->prependToGroup('api', \App\Http\Middleware\AttachBackendTokenFromCookie::class);

        // Prevent redirect-to-login for API requests; return 401 JSON instead
        $middleware->redirectGuestsTo(function ($request) {
            return $request->is('api/*') ? null : '/';
        });
        
        // Disable CSRF for all API routes (using token-based auth)
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Handle authentication exceptions
        $exceptions->renderable(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated.'
                ], 401);
            }
        });
        
        // Handle validation exceptions for API routes
        $exceptions->renderable(function (\Illuminate\Validation\ValidationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'The given data was invalid.',
                    'errors' => $e->errors()
                ], 422);
            }
        });
    })->create();
