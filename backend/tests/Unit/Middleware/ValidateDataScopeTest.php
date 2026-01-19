<?php

namespace Tests\Unit\Middleware;

use Tests\TestCase;
use App\Http\Middleware\ValidateDataScope;
use App\Services\HierarchyService;
use App\Models\User;
use App\Models\UserRoleHierarchy;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;

class ValidateDataScopeTest extends TestCase
{
    use RefreshDatabase;

    protected $hierarchyService;
    protected $manager;
    protected $teamMember;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->manager = User::factory()->create([
            'email' => 'manager@test.com',
            'role' => 'manager',
        ]);

        $this->teamMember = User::factory()->create([
            'email' => 'member@test.com',
            'role' => 'staff',
        ]);

        $this->hierarchyService = Mockery::mock(HierarchyService::class);
        $this->app->instance(HierarchyService::class, $this->hierarchyService);
    }

    /** @test */
    public function it_allows_manager_to_access_own_data()
    {
        $request = Request::create('/api/hierarchy/managers/1/analytics', 'GET');
        $request->setUserResolver(fn() => $this->manager);
        $request->setRouteResolver(function () {
            return new class {
                public function parameter($name) {
                    return $name === 'managerId' ? 1 : null;
                }
            };
        });

        // Override manager ID to match user ID
        $this->manager->id = 1;
        $this->manager->save();

        $middleware = new ValidateDataScope($this->hierarchyService);
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(200, $response->getStatusCode());
    }

    /** @test */
    public function it_blocks_manager_from_accessing_other_managers_data()
    {
        $request = Request::create('/api/hierarchy/managers/999/analytics', 'GET');
        $request->setUserResolver(fn() => $this->manager);
        $request->setRouteResolver(function () {
            return new class {
                public function parameter($name) {
                    return $name === 'managerId' ? 999 : null;
                }
            };
        });

        $middleware = new ValidateDataScope($this->hierarchyService);
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(403, $response->getStatusCode());
        
        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data['success']);
        $this->assertStringContainsString('unauthorized', strtolower($data['message']));
    }

    /** @test */
    public function it_allows_access_to_team_member_in_hierarchy()
    {
        $request = Request::create('/api/hierarchy/team-members/2/profile', 'GET');
        $request->setUserResolver(fn() => $this->manager);
        $request->setRouteResolver(function () {
            return new class {
                public function parameter($name) {
                    return $name === 'memberId' ? 2 : null;
                }
            };
        });

        // Mock hierarchy service to return true (member is in manager's team)
        $this->hierarchyService
            ->shouldReceive('getAllSubordinates')
            ->with($this->manager->id)
            ->andReturn(collect([
                ['id' => 2, 'name' => 'Team Member']
            ]));

        $middleware = new ValidateDataScope($this->hierarchyService);
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(200, $response->getStatusCode());
    }

    /** @test */
    public function it_blocks_access_to_team_member_outside_hierarchy()
    {
        $request = Request::create('/api/hierarchy/team-members/999/profile', 'GET');
        $request->setUserResolver(fn() => $this->manager);
        $request->setRouteResolver(function () {
            return new class {
                public function parameter($name) {
                    return $name === 'memberId' ? 999 : null;
                }
            };
        });

        // Mock hierarchy service to return false (member not in manager's team)
        $this->hierarchyService
            ->shouldReceive('getAllSubordinates')
            ->with($this->manager->id)
            ->andReturn(collect([]));

        $middleware = new ValidateDataScope($this->hierarchyService);
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(403, $response->getStatusCode());
    }

    /** @test */
    public function it_allows_admin_to_bypass_restrictions()
    {
        $admin = User::factory()->create([
            'email' => 'admin@test.com',
            'role' => 'admin',
        ]);

        $request = Request::create('/api/hierarchy/managers/999/analytics', 'GET');
        $request->setUserResolver(fn() => $admin);
        $request->setRouteResolver(function () {
            return new class {
                public function parameter($name) {
                    return $name === 'managerId' ? 999 : null;
                }
            };
        });

        // Admin should not trigger hierarchy checks
        $this->hierarchyService->shouldNotReceive('getAllSubordinates');

        $middleware = new ValidateDataScope($this->hierarchyService);
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(200, $response->getStatusCode());
    }

    /** @test */
    public function it_validates_program_access()
    {
        $request = Request::create(
            '/api/hierarchy/managers/1/analytics?program_id=prog-001',
            'GET'
        );
        $request->setUserResolver(fn() => $this->manager);
        $request->setRouteResolver(function () {
            return new class {
                public function parameter($name) {
                    return $name === 'managerId' ? 1 : null;
                }
            };
        });

        $this->manager->id = 1;
        $this->manager->save();

        // Create program access for manager
        UserRoleHierarchy::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'user_id' => $this->manager->id,
            'program_id' => 'prog-001',
            'hierarchical_role_id' => \Illuminate\Support\Str::uuid(),
        ]);

        $middleware = new ValidateDataScope($this->hierarchyService);
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(200, $response->getStatusCode());
    }

    /** @test */
    public function it_blocks_access_to_unauthorized_program()
    {
        $request = Request::create(
            '/api/hierarchy/managers/1/analytics?program_id=prog-999',
            'GET'
        );
        $request->setUserResolver(fn() => $this->manager);
        $request->setRouteResolver(function () {
            return new class {
                public function parameter($name) {
                    return $name === 'managerId' ? 1 : null;
                }
            };
        });

        $this->manager->id = 1;
        $this->manager->save();

        // No program access created

        $middleware = new ValidateDataScope($this->hierarchyService);
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(403, $response->getStatusCode());
    }

    /** @test */
    public function it_returns_401_for_unauthenticated_requests()
    {
        $request = Request::create('/api/hierarchy/managers/1/analytics', 'GET');
        // No user set

        $middleware = new ValidateDataScope($this->hierarchyService);
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(401, $response->getStatusCode());
    }

    /** @test */
    public function it_blocks_user_modifications_outside_hierarchy()
    {
        $request = Request::create('/api/hierarchy/users/999/manager', 'POST');
        $request->setUserResolver(fn() => $this->manager);
        $request->setRouteResolver(function () {
            return new class {
                public function parameter($name) {
                    return $name === 'userId' ? 999 : null;
                }
            };
        });

        // Mock hierarchy service to return false
        $this->hierarchyService
            ->shouldReceive('getAllSubordinates')
            ->with($this->manager->id)
            ->andReturn(collect([]));

        $middleware = new ValidateDataScope($this->hierarchyService);
        
        $response = $middleware->handle($request, function ($req) {
            return new Response('OK', 200);
        });

        $this->assertEquals(403, $response->getStatusCode());
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
