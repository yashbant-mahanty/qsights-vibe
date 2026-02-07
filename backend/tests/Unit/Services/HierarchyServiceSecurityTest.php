<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\HierarchyService;
use App\Models\User;
use App\Models\UserRoleHierarchy;
use App\Models\HierarchicalRole;
use Illuminate\Foundation\Testing\RefreshDatabase;

class HierarchyServiceSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected $hierarchyService;
    protected $program;
    protected $managerRole;
    protected $staffRole;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->hierarchyService = app(HierarchyService::class);
        $this->program = \App\Models\Program::factory()->create();
        
        $this->managerRole = HierarchicalRole::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'role_name' => 'Team Manager',
            'role_type' => 'Manager',
        ]);

        $this->staffRole = HierarchicalRole::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'role_name' => 'Staff Member',
            'role_type' => 'Staff',
        ]);
    }

    /** @test */
    public function it_validates_hierarchy_permission_for_managers()
    {
        $manager = User::factory()->create(['role' => 'manager']);

        $canViewAnalytics = $this->hierarchyService->hasHierarchyPermission(
            $manager->id,
            'view_analytics'
        );

        $this->assertTrue($canViewAnalytics);
    }

    /** @test */
    public function it_validates_hierarchy_permission_for_admins()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $canModifyStructure = $this->hierarchyService->hasHierarchyPermission(
            $admin->id,
            'modify_structure'
        );

        $this->assertTrue($canModifyStructure);
    }

    /** @test */
    public function it_denies_permission_for_non_configured_actions()
    {
        $manager = User::factory()->create(['role' => 'manager']);

        // 'assign_activities' is set to false in config
        $canAssignActivities = $this->hierarchyService->hasHierarchyPermission(
            $manager->id,
            'assign_activities'
        );

        $this->assertFalse($canAssignActivities);
    }

    /** @test */
    public function it_validates_program_access_for_users_with_role()
    {
        $user = User::factory()->create();

        UserRoleHierarchy::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'user_id' => $user->id,
            'program_id' => $this->program->id,
            'hierarchical_role_id' => $this->staffRole->id,
        ]);

        $hasAccess = $this->hierarchyService->canAccessProgram(
            $user->id,
            $this->program->id
        );

        $this->assertTrue($hasAccess);
    }

    /** @test */
    public function it_denies_program_access_for_users_without_role()
    {
        $user = User::factory()->create();

        $hasAccess = $this->hierarchyService->canAccessProgram(
            $user->id,
            $this->program->id
        );

        $this->assertFalse($hasAccess);
    }

    /** @test */
    public function it_allows_program_access_for_admins()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $hasAccess = $this->hierarchyService->canAccessProgram(
            $admin->id,
            'any-program-id'
        );

        $this->assertTrue($hasAccess);
    }

    /** @test */
    public function it_detects_self_management_in_validation()
    {
        $user = User::factory()->create();

        $validation = $this->hierarchyService->validateManagerAssignmentSecurity(
            $user->id,
            $user->id, // Same user as manager
            $this->program->id
        );

        $this->assertFalse($validation['valid']);
        $this->assertContains('User cannot be their own manager', $validation['errors']);
    }

    /** @test */
    public function it_detects_circular_references()
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        // Create hierarchy: B manages A
        UserRoleHierarchy::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'user_id' => $userA->id,
            'program_id' => $this->program->id,
            'hierarchical_role_id' => $this->staffRole->id,
            'manager_id' => $userB->id,
        ]);

        UserRoleHierarchy::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'user_id' => $userB->id,
            'program_id' => $this->program->id,
            'hierarchical_role_id' => $this->managerRole->id,
        ]);

        // Try to make A manage B (circular reference)
        $validation = $this->hierarchyService->validateManagerAssignmentSecurity(
            $userB->id,
            $userA->id,
            $this->program->id
        );

        $this->assertFalse($validation['valid']);
        $this->assertTrue(
            collect($validation['errors'])->contains(function ($error) {
                return str_contains($error, 'circular');
            })
        );
    }

    /** @test */
    public function it_validates_successful_manager_assignment()
    {
        $manager = User::factory()->create();
        $staff = User::factory()->create();

        // Give both users access to program
        UserRoleHierarchy::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'user_id' => $manager->id,
            'program_id' => $this->program->id,
            'hierarchical_role_id' => $this->managerRole->id,
        ]);

        UserRoleHierarchy::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'user_id' => $staff->id,
            'program_id' => $this->program->id,
            'hierarchical_role_id' => $this->staffRole->id,
        ]);

        $validation = $this->hierarchyService->validateManagerAssignmentSecurity(
            $staff->id,
            $manager->id,
            $this->program->id
        );

        $this->assertTrue($validation['valid']);
        $this->assertEmpty($validation['errors']);
    }

    /** @test */
    public function it_checks_if_user_is_in_manager_chain()
    {
        $manager = User::factory()->create();
        $staff = User::factory()->create();

        UserRoleHierarchy::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'user_id' => $manager->id,
            'program_id' => $this->program->id,
            'hierarchical_role_id' => $this->managerRole->id,
        ]);

        UserRoleHierarchy::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'user_id' => $staff->id,
            'program_id' => $this->program->id,
            'hierarchical_role_id' => $this->staffRole->id,
            'manager_id' => $manager->id,
        ]);

        $isInChain = $this->hierarchyService->isUserInManagerChain(
            $staff->id,
            $manager->id,
            $this->program->id
        );

        $this->assertTrue($isInChain);
    }

    /** @test */
    public function it_returns_false_for_users_not_in_manager_chain()
    {
        $manager = User::factory()->create();
        $otherUser = User::factory()->create();

        UserRoleHierarchy::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'user_id' => $manager->id,
            'program_id' => $this->program->id,
            'hierarchical_role_id' => $this->managerRole->id,
        ]);

        UserRoleHierarchy::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'user_id' => $otherUser->id,
            'program_id' => $this->program->id,
            'hierarchical_role_id' => $this->staffRole->id,
            // No manager_id set - independent user
        ]);

        $isInChain = $this->hierarchyService->isUserInManagerChain(
            $otherUser->id,
            $manager->id,
            $this->program->id
        );

        $this->assertFalse($isInChain);
    }

    /** @test */
    public function it_handles_nonexistent_user_gracefully()
    {
        $hasPermission = $this->hierarchyService->hasHierarchyPermission(
            99999, // Non-existent user ID
            'view_analytics'
        );

        $this->assertFalse($hasPermission);
    }

    /** @test */
    public function it_validates_hierarchy_depth_limits()
    {
        // Create a deep hierarchy (more than max depth)
        $users = [];
        for ($i = 0; $i < 12; $i++) {
            $users[] = User::factory()->create();
        }

        // Create chain: user0 <- user1 <- user2 <- ... <- user11
        for ($i = 0; $i < 12; $i++) {
            UserRoleHierarchy::create([
                'id' => \Illuminate\Support\Str::uuid(),
                'user_id' => $users[$i]->id,
                'program_id' => $this->program->id,
                'hierarchical_role_id' => $i === 0 ? $this->managerRole->id : $this->staffRole->id,
                'manager_id' => $i > 0 ? $users[$i - 1]->id : null,
            ]);
        }

        // Try to add one more level (should exceed max depth of 10)
        $newUser = User::factory()->create();
        
        UserRoleHierarchy::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'user_id' => $newUser->id,
            'program_id' => $this->program->id,
            'hierarchical_role_id' => $this->staffRole->id,
        ]);

        $validation = $this->hierarchyService->validateManagerAssignmentSecurity(
            $newUser->id,
            $users[11]->id, // Manager at depth 11
            $this->program->id
        );

        $this->assertFalse($validation['valid']);
        $this->assertTrue(
            collect($validation['errors'])->contains(function ($error) {
                return str_contains($error, 'depth');
            })
        );
    }
}
