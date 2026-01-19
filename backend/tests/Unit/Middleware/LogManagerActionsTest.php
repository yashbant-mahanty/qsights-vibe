<?php

namespace Tests\Unit\Middleware;

use Tests\TestCase;
use App\Http\Middleware\LogManagerActions;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\RefreshDatabase;

class LogManagerActionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test user
        $this->user = User::factory()->create([
            'email' => 'manager@test.com',
            'role' => 'manager',
        ]);
    }

    /** @test */
    public function it_logs_manager_actions_to_database()
    {
        $request = Request::create('/api/hierarchy/managers/1/analytics', 'GET');
        $request->setUserResolver(fn() => $this->user);

        $middleware = new LogManagerActions();
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('Test response', 200);
        });

        $this->assertEquals(200, $response->getStatusCode());
        
        // Check database log
        $this->assertDatabaseHas('hierarchy_change_log', [
            'user_id' => $this->user->id,
            'action_type' => 'view_team_analytics',
        ]);
    }

    /** @test */
    public function it_extracts_correct_action_names()
    {
        $testCases = [
            '/api/hierarchy/managers/123/analytics' => 'view_team_analytics',
            '/api/hierarchy/managers/123/send-notification' => 'send_team_notification',
            '/api/hierarchy/team-members/456' => 'view_member_profile',
            '/api/hierarchy/users/789/info' => 'view_user_info',
        ];

        foreach ($testCases as $path => $expectedAction) {
            $request = Request::create($path, 'GET');
            $request->setUserResolver(fn() => $this->user);

            $middleware = new LogManagerActions();
            
            $middleware->handle($request, function ($req) {
                return new Response('OK', 200);
            });

            $log = DB::table('hierarchy_change_log')
                ->where('user_id', $this->user->id)
                ->latest('created_at')
                ->first();

            $this->assertEquals($expectedAction, $log->action_type, "Failed for path: $path");
            
            // Clean up for next iteration
            DB::table('hierarchy_change_log')->where('id', $log->id)->delete();
        }
    }

    /** @test */
    public function it_sanitizes_sensitive_data_in_payload()
    {
        $request = Request::create('/api/hierarchy/test', 'POST', [
            'name' => 'John Doe',
            'password' => 'secret123',
            'token' => 'abc-token',
            'api_key' => 'key-123',
        ]);
        $request->setUserResolver(fn() => $this->user);

        $middleware = new LogManagerActions();
        
        $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $log = DB::table('hierarchy_change_log')
            ->where('user_id', $this->user->id)
            ->latest('created_at')
            ->first();

        $changes = json_decode($log->changes, true);
        $payload = $changes['request_payload'];

        $this->assertEquals('John Doe', $payload['name']);
        $this->assertEquals('[REDACTED]', $payload['password']);
        $this->assertEquals('[REDACTED]', $payload['token']);
        $this->assertEquals('[REDACTED]', $payload['api_key']);
    }

    /** @test */
    public function it_tracks_execution_time()
    {
        $request = Request::create('/api/hierarchy/test', 'GET');
        $request->setUserResolver(fn() => $this->user);

        $middleware = new LogManagerActions();
        
        $middleware->handle($request, function ($req) {
            usleep(50000); // 50ms delay
            return new Response('OK', 200);
        });

        $log = DB::table('hierarchy_change_log')
            ->where('user_id', $this->user->id)
            ->latest('created_at')
            ->first();

        $changes = json_decode($log->changes, true);
        
        $this->assertArrayHasKey('execution_time_ms', $changes);
        $this->assertGreaterThanOrEqual(40, $changes['execution_time_ms']);
    }

    /** @test */
    public function it_logs_error_responses_with_error_level()
    {
        $request = Request::create('/api/hierarchy/test', 'GET');
        $request->setUserResolver(fn() => $this->user);

        $middleware = new LogManagerActions();
        
        $middleware->handle($request, function ($req) {
            return new Response('Error occurred', 500);
        });

        $log = DB::table('hierarchy_change_log')
            ->where('user_id', $this->user->id)
            ->latest('created_at')
            ->first();

        $changes = json_decode($log->changes, true);
        
        $this->assertEquals(500, $changes['status_code']);
    }

    /** @test */
    public function it_handles_unauthenticated_requests()
    {
        $request = Request::create('/api/hierarchy/test', 'GET');
        // No user set

        $middleware = new LogManagerActions();
        
        $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $log = DB::table('hierarchy_change_log')
            ->latest('created_at')
            ->first();

        $this->assertNull($log->user_id);
    }

    /** @test */
    public function it_extracts_target_user_id_from_route()
    {
        $request = Request::create('/api/hierarchy/team-members/789', 'GET');
        $request->setUserResolver(fn() => $this->user);
        $request->setRouteResolver(function () {
            return new class {
                public function parameter($name) {
                    return $name === 'memberId' ? 789 : null;
                }
            };
        });

        $middleware = new LogManagerActions();
        
        $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $log = DB::table('hierarchy_change_log')
            ->where('user_id', $this->user->id)
            ->latest('created_at')
            ->first();

        $this->assertEquals(789, $log->target_user_id);
    }
}
