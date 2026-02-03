<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Response;
use App\Models\Question;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class AnalyticsAggregationService
{
    /**
     * Get comprehensive analytics for an activity
     */
    public function getActivityAnalytics(string $activityId, array $filters = []): array
    {
        $activity = Activity::with(['questionnaire.sections.questions', 'program'])->findOrFail($activityId);

        return [
            'overview' => $this->getOverviewMetrics($activityId, $filters),
            'participation' => $this->getParticipationMetrics($activityId, $filters),
            'completion' => $this->getCompletionMetrics($activityId, $filters),
            'time_analysis' => $this->getTimeAnalysis($activityId, $filters),
            'question_breakdown' => $this->getQuestionBreakdown($activityId, $filters),
        ];
    }

    /**
     * Get overview metrics
     */
    public function getOverviewMetrics(string $activityId, array $filters = []): array
    {
        $query = Response::where('activity_id', $activityId);
        $this->applyFilters($query, $filters);

        $total = $query->count();
        $submitted = (clone $query)->where('status', 'submitted')->count();
        $inProgress = (clone $query)->where('status', 'in_progress')->count();
        $avgCompletion = (clone $query)->avg('completion_percentage') ?? 0;

        return [
            'total_responses' => $total,
            'submitted_responses' => $submitted,
            'in_progress_responses' => $inProgress,
            'completion_rate' => $total > 0 ? round(($submitted / $total) * 100, 2) : 0,
            'average_completion_percentage' => round($avgCompletion, 2),
        ];
    }

    /**
     * Get participation metrics over time
     */
    public function getParticipationMetrics(string $activityId, array $filters = []): array
    {
        $query = Response::where('activity_id', $activityId);
        $this->applyFilters($query, $filters);

        // Daily participation for last 30 days
        $dailyData = (clone $query)
            ->where('created_at', '>=', now()->subDays(30))
            ->select(
                DB::raw('created_at::date as date'),
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(CASE WHEN status = \'submitted\' THEN 1 ELSE 0 END) as submitted_count')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Hourly distribution
        $hourlyData = (clone $query)
            ->select(
                DB::raw('EXTRACT(HOUR FROM created_at) as hour'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('hour')
            ->orderBy('hour')
            ->get()
            ->mapWithKeys(fn($item) => [$item->hour => $item->count]);

        return [
            'daily_participation' => $dailyData,
            'hourly_distribution' => $hourlyData,
        ];
    }

    /**
     * Get completion metrics
     */
    public function getCompletionMetrics(string $activityId, array $filters = []): array
    {
        $query = Response::where('activity_id', $activityId);
        $this->applyFilters($query, $filters);

        // Completion distribution
        $distribution = (clone $query)
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

        return [
            'completion_distribution' => $distribution,
        ];
    }

    /**
     * Get time analysis metrics
     */
    public function getTimeAnalysis(string $activityId, array $filters = []): array
    {
        $query = Response::where('activity_id', $activityId)
            ->whereNotNull('started_at')
            ->whereNotNull('submitted_at');
        
        $this->applyFilters($query, $filters);

        $responses = $query->get();
        
        $durations = $responses->map(function($response) {
            return $response->started_at->diffInMinutes($response->submitted_at);
        })->filter();

        if ($durations->isEmpty()) {
            return [
                'average_duration_minutes' => 0,
                'median_duration_minutes' => 0,
                'min_duration_minutes' => 0,
                'max_duration_minutes' => 0,
            ];
        }

        return [
            'average_duration_minutes' => round($durations->avg(), 2),
            'median_duration_minutes' => $durations->median(),
            'min_duration_minutes' => $durations->min(),
            'max_duration_minutes' => $durations->max(),
        ];
    }

    /**
     * Get question-level breakdown with chart data
     */
    public function getQuestionBreakdown(string $activityId, array $filters = []): array
    {
        $activity = Activity::with(['questionnaire.sections.questions'])->findOrFail($activityId);
        
        $questions = $activity->questionnaire->sections
            ->flatMap(fn($section) => $section->questions)
            ->map(function($question) use ($activityId, $filters) {
                return $this->getQuestionAnalytics($activityId, $question->id, $filters);
            });

        return $questions->toArray();
    }

    /**
     * Get analytics for a specific question
     */
    public function getQuestionAnalytics(string $activityId, string $questionId, array $filters = []): array
    {
        $question = Question::findOrFail($questionId);
        
        $answersQuery = DB::table('answers')
            ->join('responses', 'answers.response_id', '=', 'responses.id')
            ->where('responses.activity_id', $activityId)
            ->where('answers.question_id', $questionId);

        // Apply filters to the join
        if (!empty($filters['date_from'])) {
            $answersQuery->where('responses.created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $answersQuery->where('responses.created_at', '<=', $filters['date_to']);
        }
        if (!empty($filters['status'])) {
            $answersQuery->where('responses.status', $filters['status']);
        }

        $answers = $answersQuery->select('answers.*')->get();
        
        $totalResponses = Response::where('activity_id', $activityId)->count();
        $answerCount = $answers->count();

        $baseData = [
            'question_id' => $question->id,
            'question_title' => $question->title,
            'question_type' => $question->type,
            'answer_count' => $answerCount,
            'response_rate' => $totalResponses > 0 ? round(($answerCount / $totalResponses) * 100, 2) : 0,
            'suggested_chart_type' => $this->suggestChartType($question->type),
        ];

        // Generate chart data based on question type
        $chartData = $this->generateChartData($question, $answers);

        return array_merge($baseData, $chartData);
    }

    /**
     * Generate chart data based on question type
     */
    protected function generateChartData(Question $question, Collection $answers): array
    {
        switch ($question->type) {
            case 'radio':
            case 'select':
            case 'yesno':
                return $this->generateSingleChoiceChartData($question, $answers);
            
            case 'checkbox':
            case 'multiselect':
                return $this->generateMultipleChoiceChartData($question, $answers);
            
            case 'rating':
            case 'scale':
            case 'slider_scale':
                return $this->generateScaleChartData($question, $answers);
            
            case 'nps':
                return $this->generateNPSChartData($question, $answers);
            
            case 'text':
            case 'textarea':
                return $this->generateTextChartData($question, $answers);
            
            default:
                return ['chart_data' => []];
        }
    }

    /**
     * Generate single choice chart data (pie/donut/bar)
     */
    protected function generateSingleChoiceChartData(Question $question, Collection $answers): array
    {
        $options = $question->options ?? [];
        $total = $answers->count();
        
        $distribution = $answers->groupBy('answer_value')->map->count();
        
        $chartData = collect($options)->map(function($option) use ($distribution, $total) {
            $label = is_array($option) ? ($option['label'] ?? $option['value']) : $option;
            $value = is_array($option) ? $option['value'] : $option;
            $count = $distribution->get($value, 0);
            
            return [
                'label' => $label,
                'value' => $value,
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100, 2) : 0,
            ];
        })->values();

        return [
            'chart_data' => $chartData,
            'total_answers' => $total,
        ];
    }

    /**
     * Generate multiple choice chart data
     */
    protected function generateMultipleChoiceChartData(Question $question, Collection $answers): array
    {
        $options = $question->options ?? [];
        $total = $answers->count();
        
        // Parse JSON arrays in answer_value
        $allSelections = $answers->flatMap(function($answer) {
            $value = $answer->answer_value;
            if (is_string($value)) {
                $decoded = json_decode($value, true);
                return is_array($decoded) ? $decoded : [$value];
            }
            return is_array($value) ? $value : [$value];
        });
        
        $distribution = $allSelections->groupBy(fn($v) => $v)->map->count();
        
        $chartData = collect($options)->map(function($option) use ($distribution, $total) {
            $label = is_array($option) ? ($option['label'] ?? $option['value']) : $option;
            $value = is_array($option) ? $option['value'] : $option;
            $count = $distribution->get($value, 0);
            
            return [
                'label' => $label,
                'value' => $value,
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100, 2) : 0,
            ];
        })->values();

        return [
            'chart_data' => $chartData,
            'total_answers' => $total,
        ];
    }

    /**
     * Generate scale/rating chart data
     */
    protected function generateScaleChartData(Question $question, Collection $answers): array
    {
        $total = $answers->count();
        $values = $answers->pluck('answer_value')->filter();
        
        if ($values->isEmpty()) {
            return ['chart_data' => [], 'statistics' => []];
        }

        $distribution = $values->groupBy(fn($v) => $v)->map->count()->sortKeys();
        
        $chartData = $distribution->map(function($count, $value) use ($total) {
            return [
                'label' => (string) $value,
                'value' => $value,
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100, 2) : 0,
            ];
        })->values();

        return [
            'chart_data' => $chartData,
            'statistics' => [
                'average' => round($values->avg(), 2),
                'median' => $values->median(),
                'min' => $values->min(),
                'max' => $values->max(),
            ],
            'total_answers' => $total,
        ];
    }

    /**
     * Generate NPS chart data
     */
    protected function generateNPSChartData(Question $question, Collection $answers): array
    {
        $total = $answers->count();
        $values = $answers->pluck('answer_value')->map(fn($v) => (int) $v)->filter();
        
        if ($values->isEmpty()) {
            return ['chart_data' => [], 'nps_score' => 0];
        }

        $detractors = $values->filter(fn($v) => $v >= 0 && $v <= 6)->count();
        $passives = $values->filter(fn($v) => $v >= 7 && $v <= 8)->count();
        $promoters = $values->filter(fn($v) => $v >= 9 && $v <= 10)->count();
        
        $npsScore = $total > 0 ? round((($promoters - $detractors) / $total) * 100, 2) : 0;
        
        return [
            'chart_data' => [
                ['label' => 'Detractors (0-6)', 'count' => $detractors, 'percentage' => round(($detractors / $total) * 100, 2)],
                ['label' => 'Passives (7-8)', 'count' => $passives, 'percentage' => round(($passives / $total) * 100, 2)],
                ['label' => 'Promoters (9-10)', 'count' => $promoters, 'percentage' => round(($promoters / $total) * 100, 2)],
            ],
            'nps_score' => $npsScore,
            'total_answers' => $total,
        ];
    }

    /**
     * Generate text response chart data (word frequency)
     */
    protected function generateTextChartData(Question $question, Collection $answers): array
    {
        $texts = $answers->pluck('answer_value')->filter();
        $total = $texts->count();
        
        // Simple word frequency (for word cloud)
        $words = $texts->flatMap(function($text) {
            return str_word_count(strtolower($text), 1);
        })->filter(function($word) {
            // Filter out common stop words
            $stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'it', 'this', 'that', 'these', 'those'];
            return strlen($word) > 3 && !in_array($word, $stopWords);
        });
        
        $wordFrequency = $words->groupBy(fn($w) => $w)
            ->map->count()
            ->sortDesc()
            ->take(50);
        
        $chartData = $wordFrequency->map(function($count, $word) {
            return [
                'word' => $word,
                'count' => $count,
                'size' => min(100, max(10, $count * 5)), // For word cloud sizing
            ];
        })->values();

        return [
            'chart_data' => $chartData,
            'total_answers' => $total,
            'response_samples' => $texts->take(5)->values(),
        ];
    }

    /**
     * Suggest appropriate chart type based on question type
     */
    protected function suggestChartType(string $questionType): string
    {
        return match($questionType) {
            'radio', 'select', 'yesno' => 'pie',
            'checkbox', 'multiselect' => 'bar',
            'rating', 'scale', 'slider_scale' => 'bar',
            'nps' => 'gauge',
            'text', 'textarea' => 'wordcloud',
            'matrix' => 'heatmap',
            default => 'bar',
        };
    }

    /**
     * Apply filters to query
     */
    protected function applyFilters($query, array $filters)
    {
        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to']);
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (!empty($filters['participant_id'])) {
            $query->where('participant_id', $filters['participant_id']);
        }
    }
}
