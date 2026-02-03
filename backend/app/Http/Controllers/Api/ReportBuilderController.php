<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReportTemplate;
use App\Models\ReportSnapshot;
use App\Services\AnalyticsAggregationService;
use App\Services\AIInsightsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ReportBuilderController extends Controller
{
    protected AnalyticsAggregationService $analyticsService;
    protected AIInsightsService $aiInsightsService;

    public function __construct(
        AnalyticsAggregationService $analyticsService,
        AIInsightsService $aiInsightsService
    ) {
        $this->analyticsService = $analyticsService;
        $this->aiInsightsService = $aiInsightsService;
    }

    /**
     * Get all report templates for an activity or organization
     */
    public function index(Request $request)
    {
        $query = ReportTemplate::with(['creator', 'activity', 'program']);

        if ($request->has('activity_id')) {
            $query->where('activity_id', $request->activity_id);
        }

        if ($request->has('program_id')) {
            $query->where('program_id', $request->program_id);
        }

        if ($request->has('organization_id')) {
            $query->where('organization_id', $request->organization_id);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('is_public')) {
            $query->where('is_public', $request->boolean('is_public'));
        }

        $templates = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $templates,
        ]);
    }

    /**
     * Get a single report template
     */
    public function show(string $id)
    {
        $template = ReportTemplate::with(['creator', 'activity', 'program'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $template,
        ]);
    }

    /**
     * Create a new report template
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'activity_id' => 'nullable|uuid|exists:activities,id',
            'program_id' => 'nullable|uuid|exists:programs,id',
            'organization_id' => 'required|uuid|exists:organizations,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:custom,executive_summary,question_analysis,participation_report,sentiment_dashboard,comparison_report,delphi_consensus',
            'config' => 'nullable|array',
            'filters' => 'nullable|array',
            'ai_insights_config' => 'nullable|array',
            'is_public' => 'boolean',
            'is_default' => 'boolean',
        ]);

        $validated['created_by'] = Auth::id();

        $template = ReportTemplate::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Report template created successfully',
            'data' => $template,
        ], 201);
    }

    /**
     * Update a report template
     */
    public function update(Request $request, string $id)
    {
        $template = ReportTemplate::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'type' => 'sometimes|in:custom,executive_summary,question_analysis,participation_report,sentiment_dashboard,comparison_report,delphi_consensus',
            'config' => 'nullable|array',
            'filters' => 'nullable|array',
            'ai_insights_config' => 'nullable|array',
            'is_public' => 'boolean',
            'is_default' => 'boolean',
        ]);

        $template->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Report template updated successfully',
            'data' => $template,
        ]);
    }

    /**
     * Delete a report template
     */
    public function destroy(string $id)
    {
        $template = ReportTemplate::findOrFail($id);
        $template->delete();

        return response()->json([
            'success' => true,
            'message' => 'Report template deleted successfully',
        ]);
    }

    /**
     * Generate report data from a template
     */
    public function generate(Request $request, string $templateId)
    {
        $template = ReportTemplate::findOrFail($templateId);

        $validated = $request->validate([
            'activity_id' => 'required|uuid|exists:activities,id',
            'filters' => 'nullable|array',
            'include_ai_insights' => 'boolean',
        ]);

        $activityId = $validated['activity_id'];
        $filters = array_merge($template->filters ?? [], $validated['filters'] ?? []);
        $includeAIInsights = $validated['include_ai_insights'] ?? true;

        // Generate analytics data
        $analyticsData = $this->analyticsService->getActivityAnalytics($activityId, $filters);

        // Generate AI insights if requested
        $aiInsights = [];
        if ($includeAIInsights) {
            $aiInsights = $this->aiInsightsService->generateInsightsForActivity($activityId);
        }

        // Increment template usage
        $template->incrementUsage();

        return response()->json([
            'success' => true,
            'data' => [
                'template' => $template,
                'analytics' => $analyticsData,
                'ai_insights' => $aiInsights,
                'filters_applied' => $filters,
                'generated_at' => now(),
            ],
        ]);
    }

    /**
     * Get analytics data for report builder (without template)
     */
    public function getAnalytics(Request $request)
    {
        $validated = $request->validate([
            'activity_id' => 'required|uuid|exists:activities,id',
            'filters' => 'nullable|array',
            'include_ai_insights' => 'boolean',
        ]);

        $activityId = $validated['activity_id'];
        $filters = $validated['filters'] ?? [];
        $includeAIInsights = $validated['include_ai_insights'] ?? false;

        $analyticsData = $this->analyticsService->getActivityAnalytics($activityId, $filters);

        $aiInsights = [];
        if ($includeAIInsights) {
            $aiInsights = $this->aiInsightsService->generateInsightsForActivity($activityId);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'analytics' => $analyticsData,
                'ai_insights' => $aiInsights,
                'filters_applied' => $filters,
            ],
        ]);
    }

    /**
     * Get analytics for a specific question
     */
    public function getQuestionAnalytics(Request $request)
    {
        $validated = $request->validate([
            'activity_id' => 'required|uuid|exists:activities,id',
            'question_id' => 'required|uuid|exists:questions,id',
            'filters' => 'nullable|array',
        ]);

        $analytics = $this->analyticsService->getQuestionAnalytics(
            $validated['activity_id'],
            $validated['question_id'],
            $validated['filters'] ?? []
        );

        return response()->json([
            'success' => true,
            'data' => $analytics,
        ]);
    }

    /**
     * Create a snapshot of a report
     */
    public function createSnapshot(Request $request)
    {
        $validated = $request->validate([
            'report_template_id' => 'required|uuid|exists:report_templates,id',
            'activity_id' => 'required|uuid|exists:activities,id',
            'name' => 'required|string|max:255',
            'filters' => 'nullable|array',
        ]);

        $template = ReportTemplate::findOrFail($validated['report_template_id']);
        $filters = array_merge($template->filters ?? [], $validated['filters'] ?? []);

        // Generate report data
        $analyticsData = $this->analyticsService->getActivityAnalytics(
            $validated['activity_id'],
            $filters
        );
        
        $aiInsights = $this->aiInsightsService->generateInsightsForActivity(
            $validated['activity_id']
        );

        $totalResponses = DB::table('responses')
            ->where('activity_id', $validated['activity_id'])
            ->count();

        $snapshot = ReportSnapshot::create([
            'report_template_id' => $validated['report_template_id'],
            'activity_id' => $validated['activity_id'],
            'generated_by' => Auth::id(),
            'name' => $validated['name'],
            'snapshot_date' => now(),
            'data' => $analyticsData,
            'ai_insights' => $aiInsights,
            'total_responses' => $totalResponses,
            'filters_applied' => $filters,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Report snapshot created successfully',
            'data' => $snapshot,
        ], 201);
    }

    /**
     * Get snapshots for a template or activity
     */
    public function getSnapshots(Request $request)
    {
        $query = ReportSnapshot::with(['template', 'activity', 'generator']);

        if ($request->has('report_template_id')) {
            $query->where('report_template_id', $request->report_template_id);
        }

        if ($request->has('activity_id')) {
            $query->where('activity_id', $request->activity_id);
        }

        $snapshots = $query->orderBy('snapshot_date', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $snapshots,
        ]);
    }

    /**
     * Get default templates for different report types
     */
    public function getDefaultTemplates(Request $request)
    {
        $templates = [
            [
                'type' => 'executive_summary',
                'name' => 'Executive Summary',
                'description' => 'High-level KPIs and key insights',
                'config' => [
                    'widgets' => [
                        ['type' => 'summary_card', 'metric' => 'total_responses'],
                        ['type' => 'summary_card', 'metric' => 'completion_rate'],
                        ['type' => 'summary_card', 'metric' => 'average_duration'],
                        ['type' => 'ai_insights', 'limit' => 5],
                        ['type' => 'participation_chart', 'chart_type' => 'line'],
                    ],
                ],
            ],
            [
                'type' => 'question_analysis',
                'name' => 'Question-by-Question Analysis',
                'description' => 'Detailed breakdown of each question',
                'config' => [
                    'widgets' => [
                        ['type' => 'all_questions', 'auto_chart' => true],
                    ],
                ],
            ],
            [
                'type' => 'participation_report',
                'name' => 'Participation Report',
                'description' => 'Response rates, timing, and completion metrics',
                'config' => [
                    'widgets' => [
                        ['type' => 'participation_trend', 'period' => '30days'],
                        ['type' => 'hourly_distribution'],
                        ['type' => 'completion_distribution'],
                    ],
                ],
            ],
            [
                'type' => 'sentiment_dashboard',
                'name' => 'Sentiment Dashboard',
                'description' => 'Text analysis, ratings, and sentiment trends',
                'config' => [
                    'widgets' => [
                        ['type' => 'sentiment_overview'],
                        ['type' => 'text_questions', 'include_wordcloud' => true],
                        ['type' => 'rating_questions'],
                    ],
                ],
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $templates,
        ]);
    }

    /**
     * Clone a report template
     */
    public function clone(Request $request, string $id)
    {
        $template = ReportTemplate::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $newTemplate = $template->replicate();
        $newTemplate->name = $validated['name'];
        $newTemplate->created_by = Auth::id();
        $newTemplate->usage_count = 0;
        $newTemplate->save();

        return response()->json([
            'success' => true,
            'message' => 'Report template cloned successfully',
            'data' => $newTemplate,
        ], 201);
    }
}
