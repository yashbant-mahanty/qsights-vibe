<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Program;
use App\Models\HierarchicalRole;
use App\Models\UserRoleHierarchy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class HierarchyApiTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $manager;
    protected $staff;
    protected $program;
    protected $managerRole;
    protected $staffRole;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->manager = User::factory()->create(['role' => 'manager']);
        $this->staff = User::factory()->create(['role' => 'staff']);
        
        $this->program = Program::factory()->create();
        
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

        // Setup manager hierarchy
        UserRoleHierarchy::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'user_id' => $this->manager->id,
            'program_id' => $this->program->id,
            'hierarchical_role_id' => $this->managerRole->id,
        ]);

        UserRoleHierarchy::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'user_id' => $this->staff->id,
            'program_id' => $this->program->id,
            'hierarchical_role_id' => $this->staffRole->id,
            'manager_id' => $this->manager->id,
        ]);
    }

    /** @test */
    public function it_requires_authentication_for_hierarchy_endpoints()
    {
        $response = $this->getJson('/api/hierarchy/roles');

        $response->assertStatus(401);
    }

    /** @test */
    public function admin_can_get_hierarchical_roles()
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/hierarchy/roles');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'roles' => [
                    '*' => ['id', 'role_name', 'role_type']
                ]
            ]);
    }

    /** @test */
    public function manager_can_view_their_team_analytics()
    {
        Sanctum::actingAs($this->manager);

        $response = $this->getJson("/api/hierarchy/managers/{$this->manager->id}/analytics");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'analytics' => [
                    'team_size',
                    'activity_stats',
                    'notification_stats',
                    'top_performers',
                    'completion_trend',
                ]
            ]);
    }

    /** @test */
    public function manager_cannot_view_another_managers_analytics()
    {
        $otherManager = User::factory()->create(['role' => 'manager']);
        
        Sanctum::actingAs($this->manager);

        $response = $this->getJson("/api/hierarchy/managers/{$otherManager->id}/analytics");

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);
    }

    /** @test */
    public function manager_can_view_team_member_profile_in_their_team()
    {
        Sanctum::actingAs($this->manager);

        $response = $this->getJson("/api/hierarchy/team-members/{$this->staff->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'member' => [
                    'id',
                    'name',
                    'email',
                    'activity_stats',
                    'recent_activities',
                    'notification_stats',
                ]
            ]);
    }

    /** @test */
    public function manager_cannot_view_profile_of_user_outside_their_team()
    {
        $outsider = User::factory()->create();
        
        Sanctum::actingAs($this->manager);

        $response = $this->getJson("/api/hierarchy/team-members/{$outsider->id}");

        $response->assertStatus(403);
    }

    /** @test */
    public function manager_can_send_notification_to_team()
    {
        Sanctum::actingAs($this->manager);

        $response = $this->postJson("/api/hierarchy/managers/{$this->manager->id}/send-notification", [
            'subject' => 'Team Meeting',
            'message' => 'Please join the team meeting at 3 PM',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'sent_count'
            ]);
    }

    /** @test */
    public function notification_sending_validates_required_fields()
    {
        Sanctum::actingAs($this->manager);

        $response = $this->postJson("/api/hierarchy/managers/{$this->manager->id}/send-notification", [
            'subject' => '', // Empty subject
            'message' => '',  // Empty message
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['subject', 'message']);
    }

    /** @test */
    public function notification_sending_respects_rate_limits()
    {
        Sanctum::actingAs($this->manager);

        // Send 50 notifications (hourly limit)
        for ($i = 0; $i < 50; $i++) {
            $response = $this->postJson("/api/hierarchy/managers/{$this->manager->id}/send-notification", [
                'subject' => "Notification $i",
                'message' => "Message $i",
            ]);
            $response->assertStatus(200);
        }

        // 51st should be rate limited
        $response = $this->postJson("/api/hierarchy/managers/{$this->manager->id}/send-notification", [
            'subject' => 'Notification 51',
            'message' => 'Message 51',
        ]);

        $response->assertStatus(429)
            ->assertJson([
                'success' => false,
            ])
            ->assertJsonStructure([
                'rate_limit' => ['limit', 'remaining', 'reset_in_seconds']
            ]);
    }

    /** @test */
    public function admin_can_assign_manager_to_user()
    {
        Sanctum::actingAs($this->admin);

        $newUser = User::factory()->create();

        $response = $this->postJson('/api/hierarchy/assign-manager', [
            'user_id' => $newUser->id,
            'manager_id' => $this->manager->id,
            'program_id' => $this->program->id,
            'role_id' => $this->staffRole->id,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('user_role_hierarchy', [
            'user_id' => $newUser->id,
            'manager_id' => $this->manager->id,
            'program_id' => $this->program->id,
        ]);
    }

    /** @test */
    public function non_admin_cannot_assign_managers()
    {
        Sanctum::actingAs($this->manager);

        $newUser = User::factory()->create();

        $response = $this->postJson('/api/hierarchy/assign-manager', [
            'user_id' => $newUser->id,
            'manager_id' => $this->manager->id,
            'program_id' => $this->program->id,
            'role_id' => $this->staffRole->id,
        ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function admin_can_get_hierarchy_tree()
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson("/api/hierarchy/programs/{$this->program->id}/tree");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'tree' => [
                    '*' => [
                        'id',
                        'name',
                        'email',
                        'role',
                        'subordinates',
                    ]
                ],
                'statistics',
            ]);
    }

    /** @test */
    public function it_logs_all_hierarchy_actions()
    {
        Sanctum::actingAs($this->manager);

        $this->getJson("/api/hierarchy/managers/{$this->manager->id}/analytics");

        $this->assertDatabaseHas('hierarchy_change_log', [
            'user_id' => $this->manager->id,
            'action_type' => 'view_team_analytics',
        ]);
    }

    /** @test */
    public function manager_can_get_user_hierarchy_info()
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson("/api/hierarchy/users/{$this->manager->id}/info");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'user',
                'is_manager',
                'managed_programs',
                'statistics',
            ]);
    }

    /** @test */
    public function it_prevents_circular_references_in_manager_assignment()
    {
        Sanctum::actingAs($this->admin);

        // Try to make manager report to staff (who already reports to manager)
        $response = $this->postJson('/api/hierarchy/assign-manager', [
            'user_id' => $this->manager->id,
            'manager_id' => $this->staff->id,
            'program_id' => $this->program->id,
            'role_id' => $this->managerRole->id,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);
    }

    /** @test */
    public function admin_can_view_change_logs()
    {
        Sanctum::actingAs($this->admin);

        // Create some activity first
        Sanctum::actingAs($this->manager);
        $this->getJson("/api/hierarchy/managers/{$this->manager->id}/analytics");

        // Now view logs as admin
        Sanctum::actingAs($this->admin);
        $response = $this->getJson('/api/hierarchy/change-logs');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'logs' => [
                    '*' => [
                        'id',
                        'user_id',
                        'action_type',
                        'created_at',
                    ]
                ]
            ]);
    }

    /** @test */
    public function analytics_endpoint_filters_by_program()
    {
        $program2 = Program::factory()->create();
        
        Sanctum::actingAs($this->manager);

        $response = $this->getJson(
            "/api/hierarchy/managers/{$this->manager->id}/analytics?program_id={$program2->id}"
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function analytics_endpoint_filters_by_date_range()
    {
        Sanctum::actingAs($this->manager);

        $response = $this->getJson(
            "/api/hierarchy/managers/{$this->manager->id}/analytics?start_date=2026-01-01&end_date=2026-01-31"
        );

        $response->assertStatus(200)
            ->assertJsonPath('analytics.date_range.start', '2026-01-01')
            ->assertJsonPath('analytics.date_range.end', '2026-01-31');
    }
}
