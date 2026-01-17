<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Program;
use App\Models\Activity;
use App\Models\Participant;
use App\Models\Response;
use App\Models\GroupHead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Get global platform statistics for Super Admin dashboard
     */
    public function globalStatistics()
    {
        // Global counts - only active, non-deleted records
        $totalOrganizations = Organization::where('status', 'active')
            ->whereNull('deleted_at')
            ->count();
        
        $totalGroupHeads = GroupHead::where('status', 'active')
            ->whereNull('deleted_at')
            ->count();
        
        $totalPrograms = Program::where('status', 'active')
            ->whereNull('deleted_at')
            ->count();
        
        $totalActivities = Activity::whereNull('deleted_at')
            ->count();
        
        // Global participants count breakdown (authenticated: active + inactive non-guest, and guest)
        $activeParticipants = Participant::where('is_guest', false)
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->count();
        
        $inactiveParticipants = Participant::where('is_guest', false)
            ->where('status', 'inactive')
            ->whereNull('deleted_at')
            ->count();
        
        $guestParticipants = Participant::where('is_guest', true)
            ->whereNull('deleted_at')
            ->count();
        
        $totalParticipants = $activeParticipants + $inactiveParticipants + $guestParticipants;
        
        // Global active responses count (from active participants only)
        $totalResponses = Response::whereHas('participant', function($q) {
            $q->where('status', 'active')
              ->whereNull('deleted_at');
        })->count();
        
        // Authenticated responses (from registered participants)
        $authenticatedResponses = Response::whereHas('participant', function($q) {
            $q->where('is_guest', false)
              ->where('status', 'active')
              ->whereNull('deleted_at');
        })->count();
        
        // Guest/Anonymous responses
        $guestResponses = Response::whereHas('participant', function($q) {
            $q->where('status', 'active')
              ->whereNull('deleted_at')
              ->where(function($guestQ) {
                  $guestQ->where('is_guest', true)
                         ->orWhereRaw("additional_data IS NOT NULL AND additional_data->>'participant_type' = 'anonymous'");
              });
        })->count();
        
        // Activity type breakdown (all statuses)
        $surveys = Activity::where('type', 'survey')
            ->whereNull('deleted_at')
            ->count();
        
        $polls = Activity::where('type', 'poll')
            ->whereNull('deleted_at')
            ->count();
        
        $assessments = Activity::where('type', 'assessment')
            ->whereNull('deleted_at')
            ->count();
        
        // Platform engagement (global - based on active participants only)
        // Calculate engagement as percentage of participants who have responded at least once
        // Cap at 100% to ensure it never exceeds maximum
        if ($activeParticipants > 0) {
            $participantsWithResponses = Response::whereHas('participant', function($q) {
                $q->where('status', 'active')
                  ->whereNull('deleted_at');
            })->distinct('participant_id')->count('participant_id');
            
            $platformEngagement = round(($participantsWithResponses / $activeParticipants) * 100, 2);
            $platformEngagement = min($platformEngagement, 100); // Cap at 100%
        } else {
            $platformEngagement = 0;
        }
        
        // Activity completion stats - how many activities have responses vs total
        $activitiesWithResponses = Activity::whereHas('responses')
            ->whereNull('deleted_at')
            ->count();
        
        $liveActivities = Activity::where('status', 'live')
            ->whereNull('deleted_at')
            ->count();
        
        $activityCompletionRate = $liveActivities > 0 
            ? round(($activitiesWithResponses / $liveActivities) * 100, 2) 
            : 0;
        
        return response()->json([
            'organizations' => $totalOrganizations,
            'group_heads' => $totalGroupHeads,
            'programs' => $totalPrograms,
            'activities' => $totalActivities,
            'participants' => $totalParticipants,
            'active_participants' => $activeParticipants,
            'inactive_participants' => $inactiveParticipants,
            'guest_participants' => $guestParticipants,
            'responses' => $totalResponses,
            'authenticated_responses' => $authenticatedResponses,
            'guest_responses' => $guestResponses,
            'activity_types' => [
                'surveys' => $surveys,
                'polls' => $polls,
                'assessments' => $assessments,
            ],
            'platform_engagement' => $platformEngagement,
            'activities_with_responses' => $activitiesWithResponses,
            'live_activities' => $liveActivities,
            'activity_completion_rate' => $activityCompletionRate,
        ]);
    }
    
    /**
     * Get organization performance metrics for dashboard table
     */
    public function organizationPerformance()
    {
        // Get all active organizations with their performance metrics
        $organizations = Organization::where('status', 'active')
            ->whereNull('deleted_at')
            ->get()
            ->map(function ($org) {
                // Count active group heads for this organization
                $groupHeadsCount = GroupHead::where('organization_id', $org->id)
                    ->where('status', 'active')
                    ->whereNull('deleted_at')
                    ->count();
                
                // Count active programs via group heads
                $programsCount = Program::whereHas('groupHead', function($q) use ($org) {
                    $q->where('organization_id', $org->id)
                      ->where('group_heads.status', 'active')
                      ->whereNull('group_heads.deleted_at');
                })
                ->where('programs.status', 'active')
                ->whereNull('programs.deleted_at')
                ->count();
                
                // Count active participants (non-guest, active) by organization_id
                $activeParticipantsCount = \App\Models\Participant::where('organization_id', $org->id)
                    ->where('is_guest', false)
                    ->where('status', 'active')
                    ->whereNull('deleted_at')
                    ->count();
                
                // Count inactive participants (non-guest, inactive) by organization_id
                $inactiveParticipantsCount = \App\Models\Participant::where('organization_id', $org->id)
                    ->where('is_guest', false)
                    ->where('status', 'inactive')
                    ->whereNull('deleted_at')
                    ->count();
                
                // Count guest participants by organization_id
                $guestParticipantsCount = \App\Models\Participant::where('organization_id', $org->id)
                    ->where('is_guest', true)
                    ->whereNull('deleted_at')
                    ->count();
                
                // Count ALL non-guest participants (for total display)
                $totalAuthenticatedCount = \App\Models\Participant::where('organization_id', $org->id)
                    ->where('is_guest', false)
                    ->whereNull('deleted_at')
                    ->count();
                
                // Total participants = total authenticated + guest
                $participantsCount = $totalAuthenticatedCount + $guestParticipantsCount;
                
                // Count active responses from active participants in this organization
                $responsesCount = \App\Models\Response::whereHas('participant', function($q) use ($org) {
                    $q->where('organization_id', $org->id)
                      ->where('status', 'active')
                      ->whereNull('deleted_at');
                })->count();
                
                // Calculate effectiveness
                $effectiveness = $participantsCount > 0
                    ? round(($responsesCount / $participantsCount) * 100, 2)
                    : 0;
                
                return [
                    'id' => $org->id,
                    'name' => $org->name,
                    'group_heads_count' => $groupHeadsCount,
                    'programs_count' => $programsCount,
                    'active_participants_count' => $activeParticipantsCount,
                    'inactive_participants_count' => $inactiveParticipantsCount,
                    'guest_participants_count' => $guestParticipantsCount,
                    'total_authenticated_count' => $totalAuthenticatedCount,
                    'participants_count' => $participantsCount,
                    'responses_count' => $responsesCount,
                    'effectiveness' => $effectiveness,
                ];
            })
            ->sortByDesc('effectiveness')
            ->values();
        
        return response()->json([
            'data' => $organizations
        ]);
    }

    /**
     * Get subscription and participant metrics for Super Admin dashboard
     */
    public function subscriptionMetrics()
    {
        // Get all activities with subscription data (all statuses)
        $activities = Activity::with(['program.groupHead.user'])
            ->whereNull('deleted_at')
            ->whereNotNull('subscription_price')
            ->get();

        // Calculate total and average subscription price
        $totalSubscriptionRevenue = $activities->sum('subscription_price');
        $averageSubscriptionPrice = $activities->count() > 0 
            ? round($activities->avg('subscription_price'), 2) 
            : 0;

        // Calculate total participants from Participant table (actual registered participants)
        // Count only participants that are linked to activities with subscription data
        $activityIds = $activities->pluck('id');
        $totalRegisteredParticipants = Participant::whereHas('activities', function($query) use ($activityIds) {
            $query->whereIn('activities.id', $activityIds);
        })
        ->whereNull('deleted_at')
        ->distinct('id')
        ->count();
        
        // Get authenticated (non-guest) and anonymous (guest) breakdown
        $authenticatedParticipants = Participant::whereHas('activities', function($query) use ($activityIds) {
            $query->whereIn('activities.id', $activityIds);
        })
        ->where('is_guest', false)
        ->whereNull('deleted_at')
        ->distinct('id')
        ->count();
        
        $anonymousParticipants = Participant::whereHas('activities', function($query) use ($activityIds) {
            $query->whereIn('activities.id', $activityIds);
        })
        ->where('is_guest', true)
        ->whereNull('deleted_at')
        ->distinct('id')
        ->count();

        // Calculate average tax percentage
        $averageTaxPercentage = $activities->whereNotNull('tax_percentage')->count() > 0
            ? round($activities->whereNotNull('tax_percentage')->avg('tax_percentage'), 2)
            : 0;

        // Get subscription frequency breakdown
        $frequencyBreakdown = $activities
            ->whereNotNull('subscription_frequency')
            ->groupBy('subscription_frequency')
            ->map(function ($group, $frequency) {
                // Count actual participants for this frequency group
                $groupActivityIds = $group->pluck('id');
                $participantsInGroup = Participant::whereHas('activities', function($query) use ($groupActivityIds) {
                    $query->whereIn('activities.id', $groupActivityIds);
                })
                ->whereNull('deleted_at')
                ->distinct('id')
                ->count();
                
                return [
                    'frequency' => $frequency,
                    'count' => $group->count(),
                    'total_revenue' => $group->sum('subscription_price'),
                    'avg_price' => round($group->avg('subscription_price'), 2),
                    'total_participants' => $participantsInGroup,
                ];
            })
            ->values();

        // Calculate total revenue after tax
        $totalTaxAmount = $activities->sum(function ($activity) {
            $price = $activity->subscription_price ?? 0;
            $tax = $activity->tax_percentage ?? 0;
            return ($price * $tax) / 100;
        });
        $totalRevenueWithTax = $totalSubscriptionRevenue + $totalTaxAmount;
        
        // Calculate total configuration price
        $totalConfigurationPrice = $activities->sum('configuration_price');

        // Get detailed activity list with all pricing information
        $activityDetails = $activities->map(function ($activity) {
            $subscriptionPrice = $activity->subscription_price ?? 0;
            $taxPercentage = $activity->tax_percentage ?? 0;
            $configPrice = $activity->configuration_price ?? 0;
            
            $taxAmount = ($subscriptionPrice * $taxPercentage) / 100;
            $totalPrice = $configPrice + $subscriptionPrice + $taxAmount;
            
            return [
                'id' => $activity->id,
                'name' => $activity->name,
                'type' => $activity->type,
                'group_head' => $activity->program && $activity->program->groupHead && $activity->program->groupHead->user 
                    ? $activity->program->groupHead->user->name 
                    : 'N/A',
                'program' => $activity->program->name ?? 'N/A',
                'start_date' => $activity->start_date ? $activity->start_date->format('d M Y') : null,
                'end_date' => $activity->end_date ? $activity->end_date->format('d M Y') : null,
                'configuration_date' => $activity->configuration_date ? \Carbon\Carbon::parse($activity->configuration_date)->format('d M Y') : null,
                'configuration_price' => round($configPrice, 2),
                'subscription_price' => round($subscriptionPrice, 2),
                'subscription_frequency' => $activity->subscription_frequency,
                'tax_percentage' => round($taxPercentage, 2),
                'tax_amount' => round($taxAmount, 2),
                'number_of_participants' => $activity->number_of_participants ?? 0,
                'total_price' => round($totalPrice, 2),
            ];
        })->values();

        return response()->json([
            'total_subscription_revenue' => round($totalSubscriptionRevenue, 2),
            'total_configuration_price' => round($totalConfigurationPrice, 2),
            'average_subscription_price' => $averageSubscriptionPrice,
            'total_participants' => $totalRegisteredParticipants,
            'authenticated_participants' => $authenticatedParticipants,
            'anonymous_participants' => $anonymousParticipants,
            'average_tax_percentage' => $averageTaxPercentage,
            'total_tax_amount' => round($totalTaxAmount, 2),
            'total_revenue_with_tax' => round($totalRevenueWithTax, 2),
            'activities_with_subscription' => $activities->count(),
            'frequency_breakdown' => $frequencyBreakdown,
            'activity_details' => $activityDetails,
        ]);
    }

    /**
     * Get engagement trends for a specific program
     * Returns daily participant activity and completion rates for the last 30 days
     */
    public function programEngagementTrends(Request $request)
    {
        $programId = $request->input('program_id');
        
        if (!$programId) {
            return response()->json(['error' => 'Program ID is required'], 400);
        }

        // Get data for the last 30 days
        $days = 30;
        $startDate = now()->subDays($days)->startOfDay();
        
        // Get all responses for the program in the last 30 days
        $responses = Response::whereHas('activity', function($q) use ($programId) {
            $q->where('program_id', $programId)
              ->whereNull('deleted_at');
        })
        ->where('created_at', '>=', $startDate)
        ->whereNull('deleted_at')
        ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as count'))
        ->groupBy('date')
        ->orderBy('date', 'asc')
        ->get();

        // Get unique active participants per day
        $activeParticipants = Response::whereHas('activity', function($q) use ($programId) {
            $q->where('program_id', $programId)
              ->whereNull('deleted_at');
        })
        ->where('created_at', '>=', $startDate)
        ->whereNull('deleted_at')
        ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(DISTINCT participant_id) as count'))
        ->groupBy('date')
        ->orderBy('date', 'asc')
        ->get();

        // Get program activities count (all statuses)
        $totalActivities = Activity::where('program_id', $programId)
            ->whereNull('deleted_at')
            ->count();

        // Get total unique participants who have responded
        $totalParticipants = Response::whereHas('activity', function($q) use ($programId) {
            $q->where('program_id', $programId)
              ->whereNull('deleted_at');
        })
        ->whereNull('deleted_at')
        ->distinct('participant_id')
        ->count('participant_id');

        // Create a complete date range
        $trends = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $dateFormatted = now()->subDays($i)->format('M d');
            
            // Find responses for this date
            $dayResponses = $responses->firstWhere('date', $date);
            $dayParticipants = $activeParticipants->firstWhere('date', $date);
            
            $responseCount = $dayResponses ? $dayResponses->count : 0;
            $participantCount = $dayParticipants ? $dayParticipants->count : 0;
            
            // Calculate completion rate (responses / total activities * 100)
            $completionRate = 0;
            if ($totalActivities > 0) {
                $completionRate = round(($responseCount / $totalActivities) * 100, 1);
                $completionRate = min($completionRate, 100); // Cap at 100%
            }
            
            $trends[] = [
                'date' => $dateFormatted,
                'responses' => $responseCount,
                'activeParticipants' => $participantCount,
                'completionRate' => $completionRate,
            ];
        }

        return response()->json([
            'trends' => $trends,
            'summary' => [
                'total_activities' => $totalActivities,
                'total_participants' => $totalParticipants,
                'period_days' => $days,
            ]
        ]);
    }
}
