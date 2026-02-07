<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Program;
use App\Models\Response;
use App\Models\Question;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Get participation metrics for an activity
     */
    public function participationMetrics(Request $request, string $activityId)
    {
        $activity = Activity::with('program.participants')->findOrFail($activityId);
        
        $totalParticipants = $activity->program->participants()->where('status', 'active')->count();
        $totalResponses = Response::where('activity_id', $activityId)->count();
        $submittedResponses = Response::where('activity_id', $activityId)->submitted()->count();
        $inProgressResponses = Response::where('activity_id', $activityId)->inProgress()->count();
        $guestResponses = Response::where('activity_id', $activityId)->whereNotNull('guest_identifier')->count();
        
        $participationRate = $totalParticipants > 0 
            ? round(($totalResponses / $totalParticipants) * 100, 2) 
            : 0;
        
        $completionRate = $totalResponses > 0 
            ? round(($submittedResponses / $totalResponses) * 100, 2) 
            : 0;

        // Time-based participation (last 7 days)
        $dailyParticipation = Response::where('activity_id', $activityId)
            ->where('created_at', '>=', now()->subDays(7))
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as count'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Participation by status
        $statusBreakdown = Response::where('activity_id', $activityId)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->get()
            ->mapWithKeys(fn($item) => [$item->status => $item->count]);

        return response()->json([
            'activity_id' => $activityId,
            'activity_name' => $activity->name,
            'total_participants' => $totalParticipants,
            'total_responses' => $totalResponses,
            'submitted_responses' => $submittedResponses,
            'in_progress_responses' => $inProgressResponses,
            'guest_responses' => $guestResponses,
            'participation_rate' => $participationRate,
            'completion_rate' => $completionRate,
            'daily_participation' => $dailyParticipation,
            'status_breakdown' => $statusBreakdown,
        ]);
    }

    /**
     * Get completion metrics for an activity
     */
    public function completionMetrics(Request $request, string $activityId)
    {
        $activity = Activity::findOrFail($activityId);
        
        // Average completion percentage
        $avgCompletion = Response::where('activity_id', $activityId)
            ->avg('completion_percentage');
        
        // Average time spent per question
        $avgTimePerQuestion = DB::table('answers')
            ->join('responses', 'answers.response_id', '=', 'responses.id')
            ->where('responses.activity_id', $activityId)
            ->avg('answers.time_spent');
        
        // Completion distribution
        $completionDistribution = Response::where('activity_id', $activityId)
            ->select(
                DB::raw("CASE 
                    WHEN completion_percentage = 0 THEN '0%'
                    WHEN completion_percentage > 0 AND completion_percentage <= 25 THEN '1-25%'
                    WHEN completion_percentage > 25 AND completion_percentage <= 50 THEN '26-50%'
                    WHEN completion_percentage > 50 AND completion_percentage <= 75 THEN '51-75%'
                    WHEN completion_percentage > 75 AND completion_percentage < 100 THEN '76-99%'
                    ELSE '100%'
                END as range"),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('range')
            ->get()
            ->mapWithKeys(fn($item) => [$item->range => $item->count]);
        
        // Question-level completion rates
        $questionCompletion = DB::table('questions')
            ->leftJoin('answers', 'questions.id', '=', 'answers.question_id')
            ->leftJoin('responses', function($join) use ($activityId) {
                $join->on('answers.response_id', '=', 'responses.id')
                     ->where('responses.activity_id', '=', $activityId);
            })
            ->join('sections', 'questions.section_id', '=', 'sections.id')
            ->join('questionnaires', 'sections.questionnaire_id', '=', 'questionnaires.id')
            ->join('activities', 'questionnaires.id', '=', 'activities.questionnaire_id')
            ->where('activities.id', $activityId)
            ->select(
                'questions.id',
                'questions.title',
                'questions.type',
                'questions.is_required',
                DB::raw('COUNT(DISTINCT answers.id) as answer_count')
            )
            ->groupBy('questions.id', 'questions.title', 'questions.type', 'questions.is_required')
            ->get();
        
        $totalResponses = Response::where('activity_id', $activityId)->count();
        
        $questionCompletion = $questionCompletion->map(function($q) use ($totalResponses) {
            return [
                'question_id' => $q->id,
                'title' => $q->title,
                'type' => $q->type,
                'is_required' => (bool) $q->is_required,
                'answer_count' => $q->answer_count,
                'completion_rate' => $totalResponses > 0 ? round(($q->answer_count / $totalResponses) * 100, 2) : 0,
            ];
        });

        return response()->json([
            'activity_id' => $activityId,
            'average_completion' => round($avgCompletion, 2),
            'average_time_per_question' => round($avgTimePerQuestion, 2),
            'total_responses' => $totalResponses,
            'completion_distribution' => $completionDistribution,
            'question_completion' => $questionCompletion,
        ]);
    }

    /**
     * Get drill-down data for responses
     */
    public function drillDownResponses(Request $request, string $activityId)
    {
        $perPage = $request->input('per_page', 15);
        
        $query = Response::with(['participant', 'answers.question'])
            ->where('activity_id', $activityId);
        
        // Filters
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->has('participant_id')) {
            $query->where('participant_id', $request->participant_id);
        }
        
        if ($request->has('min_completion')) {
            $query->where('completion_percentage', '>=', $request->min_completion);
        }
        
        if ($request->has('max_completion')) {
            $query->where('completion_percentage', '<=', $request->max_completion);
        }
        
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        
        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        
        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);
        
        $responses = $query->paginate($perPage);
        
        return response()->json($responses);
    }

    /**
     * Get question-level analytics
     */
    public function questionAnalytics(Request $request, string $activityId, string $questionId)
    {
        $question = Question::findOrFail($questionId);
        
        $answers = DB::table('answers')
            ->join('responses', 'answers.response_id', '=', 'responses.id')
            ->where('responses.activity_id', $activityId)
            ->where('answers.question_id', $questionId)
            ->select('answers.*')
            ->get();
        
        $totalAnswers = $answers->count();
        $avgTimeSpent = $answers->avg('time_spent');
        
        // Value distribution (for single-value questions)
        $valueDistribution = [];
        if (in_array($question->type, ['radio', 'select', 'yesno'])) {
            $valueDistribution = $answers->groupBy('value')
                ->map(fn($group) => [
                    'value' => $group[0]->value,
                    'count' => $group->count(),
                    'percentage' => round(($group->count() / $totalAnswers) * 100, 2),
                ])
                ->values();
        }
        
        // Array value distribution (for multi-value questions)
        $arrayValueDistribution = [];
        if (in_array($question->type, ['checkbox', 'multiselect'])) {
            $allValues = [];
            foreach ($answers as $answer) {
                if ($answer->value_array) {
                    $values = json_decode($answer->value_array, true);
                    if (is_array($values)) {
                        foreach ($values as $val) {
                            $allValues[] = $val;
                        }
                    }
                }
            }
            
            $valueCounts = array_count_values($allValues);
            foreach ($valueCounts as $value => $count) {
                $arrayValueDistribution[] = [
                    'value' => $value,
                    'count' => $count,
                    'percentage' => round(($count / $totalAnswers) * 100, 2),
                ];
            }
        }
        
        // Text response summary
        $textSamples = [];
        if (in_array($question->type, ['text', 'textarea', 'email', 'url'])) {
            $textSamples = $answers->take(10)->map(fn($a) => $a->value)->toArray();
        }

        return response()->json([
            'question_id' => $questionId,
            'question_title' => $question->title,
            'question_type' => $question->type,
            'total_answers' => $totalAnswers,
            'average_time_spent' => round($avgTimeSpent, 2),
            'value_distribution' => $valueDistribution,
            'array_value_distribution' => $arrayValueDistribution,
            'text_samples' => $textSamples,
        ]);
    }

    /**
     * Get program-level overview
     */
    public function programOverview(Request $request, string $programId)
    {
        $program = Program::with('activities')->findOrFail($programId);
        
        $totalActivities = $program->activities()->count();
        $liveActivities = $program->activities()->where('status', 'live')->count();
        $totalParticipants = $program->participants()->where('status', 'active')->count();
        
        // Activity statistics
        $activityStats = $program->activities()
            ->with(['responses' => function($q) {
                $q->select('activity_id', 'status', DB::raw('COUNT(*) as count'))
                  ->groupBy('activity_id', 'status');
            }])
            ->get()
            ->map(function($activity) {
                $responseCount = Response::where('activity_id', $activity->id)->count();
                $submittedCount = Response::where('activity_id', $activity->id)->submitted()->count();
                
                return [
                    'activity_id' => $activity->id,
                    'activity_name' => $activity->name,
                    'status' => $activity->status,
                    'start_date' => $activity->start_date,
                    'response_count' => $responseCount,
                    'submitted_count' => $submittedCount,
                    'completion_rate' => $responseCount > 0 ? round(($submittedCount / $responseCount) * 100, 2) : 0,
                ];
            });

        return response()->json([
            'program_id' => $programId,
            'program_name' => $program->name,
            'total_activities' => $totalActivities,
            'live_activities' => $liveActivities,
            'total_participants' => $totalParticipants,
            'activity_statistics' => $activityStats,
        ]);
    }

    /**
     * Export activity report in specified format
     */
    public function exportReport(Request $request, string $activityId, string $format)
    {
        $exportService = new \App\Services\ExportService();
        
        try {
            switch ($format) {
                case 'csv':
                    $filepath = $exportService->exportToCSV($activityId);
                    return response()->download($filepath)->deleteFileAfterSend(true);
                    
                case 'excel':
                    $filepath = $exportService->exportToExcel($activityId);
                    if (!$filepath) {
                        return response()->json(['error' => 'Export failed'], 500);
                    }
                    return response()->download($filepath)->deleteFileAfterSend(true);
                    
                case 'pdf':
                    $filepath = $exportService->exportToPDF($activityId);
                    return response()->download($filepath)->deleteFileAfterSend(true);
                    
                default:
                    return response()->json(['error' => 'Invalid format'], 400);
            }
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Export failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export program overview to PDF
     */
    public function exportProgramReport(Request $request, string $programId)
    {
        $exportService = new \App\Services\ExportService();
        
        try {
            $filepath = $exportService->exportProgramOverviewPDF($programId);
            return response()->download($filepath)->deleteFileAfterSend(true);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Export failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
