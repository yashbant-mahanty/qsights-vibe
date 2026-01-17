<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// Create a request
$request = Illuminate\Http\Request::create(
    '/api/auth/login',
    'POST',
    [],
    [],
    [],
    ['CONTENT_TYPE' => 'application/json'],
    json_encode([
        'email' => 'yashagarwal52121@gmail.com',
        'password' => 'admin123'
    ])
);

try {
    $response = $kernel->handle($request);
    echo "Status: " . $response->getStatusCode() . "\n";
    echo "Headers:\n";
    foreach ($response->headers->all() as $key => $values) {
        foreach ($values as $value) {
            echo "  $key: $value\n";
        }
    }
    echo "\nBody:\n";
    echo $response->getContent() . "\n";
} catch (\Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}

$kernel->terminate($request, $response);
