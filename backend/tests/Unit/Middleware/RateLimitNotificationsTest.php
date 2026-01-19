<?php

namespace Tests\Unit\Middleware;

use Tests\TestCase;
use App\Http\Middleware\RateLimitNotifications;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Foundation\Testing\RefreshDatabase;

class RateLimitNotificationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create([
            'email' => 'manager@test.com',
            'role' => 'manager',
        ]);

        // Clear cache before each test
        Cache::flush();
    }

    /** @test */
    public function it_allows_requests_within_hourly_limit()
    {
        $request = Request::create('/api/hierarchy/managers/1/send-notification', 'POST');
        $request->setUserResolver(fn() => $this->user);

        $middleware = new RateLimitNotifications();
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals('50', $response->headers->get('X-RateLimit-Limit-Hourly'));
        $this->assertEquals('49', $response->headers->get('X-RateLimit-Remaining-Hourly'));
    }

    /** @test */
    public function it_blocks_requests_exceeding_hourly_limit()
    {
        $hourlyKey = "notification_rate_limit:hourly:{$this->user->id}";
        Cache::put($hourlyKey, 50, 3600); // Set to max limit

        $request = Request::create('/api/hierarchy/managers/1/send-notification', 'POST');
        $request->setUserResolver(fn() => $this->user);

        $middleware = new RateLimitNotifications();
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(429, $response->getStatusCode());
        
        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data['success']);
        $this->assertStringContainsString('rate limit exceeded', strtolower($data['message']));
        $this->assertArrayHasKey('rate_limit', $data);
    }

    /** @test */
    public function it_blocks_requests_exceeding_daily_limit()
    {
        $dailyKey = "notification_rate_limit:daily:{$this->user->id}";
        Cache::put($dailyKey, 200, 86400); // Set to max limit

        $request = Request::create('/api/hierarchy/managers/1/send-notification', 'POST');
        $request->setUserResolver(fn() => $this->user);

        $middleware = new RateLimitNotifications();
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(429, $response->getStatusCode());
        
        $data = json_decode($response->getContent(), true);
        $this->assertStringContainsString('daily', strtolower($data['message']));
    }

    /** @test */
    public function it_blocks_requests_with_too_many_recipients()
    {
        $request = Request::create(
            '/api/hierarchy/managers/1/send-notification',
            'POST',
            ['recipient_ids' => range(1, 101)] // 101 recipients (exceeds 100 limit)
        );
        $request->setUserResolver(fn() => $this->user);

        $middleware = new RateLimitNotifications();
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(422, $response->getStatusCode());
        
        $data = json_decode($response->getContent(), true);
        $this->assertStringContainsString('too many recipients', strtolower($data['message']));
    }

    /** @test */
    public function it_increments_counters_on_successful_requests()
    {
        $hourlyKey = "notification_rate_limit:hourly:{$this->user->id}";
        $dailyKey = "notification_rate_limit:daily:{$this->user->id}";

        $this->assertEquals(0, Cache::get($hourlyKey, 0));
        $this->assertEquals(0, Cache::get($dailyKey, 0));

        $request = Request::create('/api/hierarchy/managers/1/send-notification', 'POST');
        $request->setUserResolver(fn() => $this->user);

        $middleware = new RateLimitNotifications();
        
        $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(1, Cache::get($hourlyKey));
        $this->assertEquals(1, Cache::get($dailyKey));
    }

    /** @test */
    public function it_does_not_increment_counters_on_failed_requests()
    {
        $hourlyKey = "notification_rate_limit:hourly:{$this->user->id}";
        $dailyKey = "notification_rate_limit:daily:{$this->user->id}";

        $request = Request::create('/api/hierarchy/managers/1/send-notification', 'POST');
        $request->setUserResolver(fn() => $this->user);

        $middleware = new RateLimitNotifications();
        
        $middleware->handle($request, function ($req) {
            return new Response('Error', 500); // Failed request
        });

        $this->assertEquals(0, Cache::get($hourlyKey, 0));
        $this->assertEquals(0, Cache::get($dailyKey, 0));
    }

    /** @test */
    public function it_returns_401_for_unauthenticated_requests()
    {
        $request = Request::create('/api/hierarchy/managers/1/send-notification', 'POST');
        // No user set

        $middleware = new RateLimitNotifications();
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(401, $response->getStatusCode());
    }

    /** @test */
    public function it_adds_rate_limit_headers_to_response()
    {
        $request = Request::create('/api/hierarchy/managers/1/send-notification', 'POST');
        $request->setUserResolver(fn() => $this->user);

        $middleware = new RateLimitNotifications();
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertTrue($response->headers->has('X-RateLimit-Limit-Hourly'));
        $this->assertTrue($response->headers->has('X-RateLimit-Remaining-Hourly'));
        $this->assertTrue($response->headers->has('X-RateLimit-Limit-Daily'));
        $this->assertTrue($response->headers->has('X-RateLimit-Remaining-Daily'));
    }

    /** @test */
    public function it_allows_requests_with_recipient_ids_within_limit()
    {
        $request = Request::create(
            '/api/hierarchy/managers/1/send-notification',
            'POST',
            ['recipient_ids' => range(1, 50)] // 50 recipients (within 100 limit)
        );
        $request->setUserResolver(fn() => $this->user);

        $middleware = new RateLimitNotifications();
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(200, $response->getStatusCode());
    }

    /** @test */
    public function it_handles_multiple_consecutive_requests()
    {
        $request = Request::create('/api/hierarchy/managers/1/send-notification', 'POST');
        $request->setUserResolver(fn() => $this->user);

        $middleware = new RateLimitNotifications();
        
        // Send 5 requests
        for ($i = 0; $i < 5; $i++) {
            $response = $middleware->handle($request, function ($req) {
                return new Response('OK', 200);
            });
            $this->assertEquals(200, $response->getStatusCode());
        }

        // Verify counter
        $hourlyKey = "notification_rate_limit:hourly:{$this->user->id}";
        $this->assertEquals(5, Cache::get($hourlyKey));
    }
}
