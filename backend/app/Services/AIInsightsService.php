<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Response;
use App\Models\Question;
use App\Models\AIInsightCache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class AIInsightsService
{
    /**
     * Generate AI insights for an activity
     */
    public function generateInsightsForActivity(string $activityId, bool $useCache = true): array
    {
        if ($useCache) {
            $cachedInsights = AIInsightCache::where('activity_id', $activityId)
                ->valid()
                ->get();
            
            if ($cachedInsights->isNotEmpty()) {
                return $this->formatInsights($cachedInsights);
            }
        }

        $insights = [];
        
        // Generate different types of insights
        $insights = array_merge($insights, $this->generateTrendInsights($activityId));
        $insights = array_merge($insights, $this->generateSentimentInsights($activityId));
        $insights = array_merge($insights, $this->generateAnomalyInsights($activityId));
        $insights = array_merge($insights, $this->generateCompletionPatternInsights($activityId));
        $insights = array_merge($insights, $this->generateSummaryInsights($activityId));
        
        // Cache the insights
        foreach ($insights as $insight) {
            $this->cacheInsight($activityId, $insight);
        }
        
        return $insights;
    }

    /**
     * Generate trend insights
     */
    protected function generateTrendInsights(string $activityId): array
    {
        $insights = [];
        
        // Participation trend analysis
        $last7Days = Response::where('activity_id', $activityId)
            ->where('created_at', '>=', now()->subDays(7))
            ->count();
        
        $previous7Days = Response::where('activity_id', $activityId)
            ->whereBetween('created_at', [now()->subDays(14), now()->subDays(7)])
            ->count();
        
        if ($previous7Days > 0) {
            $change = (($last7Days - $previous7Days) / $previous7Days) * 100;
            
            if (abs($change) > 20) {
                $insights[] = [
                    'insight_type' => 'trend',
                    'priority' => abs($change) > 50 ? 'high' : 'medium',
                    'confidence_score' => 85.0,
                    'title' => $change > 0 ? 'Response Rate Increasing' : 'Response Rate Declining',
                    'description' => sprintf(
                        'Response rate has %s by %.1f%% in the last 7 days compared to the previous week.',
                        $change > 0 ? 'increased' : 'decreased',
                        abs($change)
                    ),
                    'data' => [
                        'last_7_days' => $last7Days,
                        'previous_7_days' => $previous7Days,
                        'change_percentage' => round($change, 2),
                    ],
                ];
            }
        }
        
        return $insights;
    }

    /**
     * Generate sentiment insights from text responses
     */
    protected function generateSentimentInsights(string $activityId): array
    {
        $insights = [];
        
        // Get all text-based questions
        $activity = Activity::with('questionnaire.sections.questions')->findOrFail($activityId);
        $textQuestions = $activity->questionnaire->sections
            ->flatMap(fn($s) => $s->questions)
            ->whereIn('type', ['text', 'textarea']);
        
        foreach ($textQuestions as $question) {
            $answers = DB::table('answers')
                ->join('responses', 'answers.response_id', '=', 'responses.id')
                ->where('responses.activity_id', $activityId)
                ->where('answers.question_id', $question->id)
                ->whereNotNull('answers.answer_value')
                ->pluck('answers.answer_value');
            
            if ($answers->count() > 5) {
                $sentiment = $this->analyzeSentiment($answers);
                
                $insights[] = [
                    'insight_type' => 'sentiment',
                    'priority' => $sentiment['negative_percentage'] > 40 ? 'high' : 'medium',
                    'confidence_score' => $sentiment['confidence'],
                    'title' => "Sentiment Analysis: {$question->title}",
                    'description' => sprintf(
                        'Overall sentiment is %s with %.1f%% positive, %.1f%% neutral, and %.1f%% negative responses.',
                        $sentiment['overall'],
                        $sentiment['positive_percentage'],
                        $sentiment['neutral_percentage'],
                        $sentiment['negative_percentage']
                    ),
                    'data' => $sentiment,
                    'question_id' => $question->id,
                ];
            }
        }
        
        return $insights;
    }

    /**
     * Generate anomaly detection insights
     */
    protected function generateAnomalyInsights(string $activityId): array
    {
        $insights = [];
        
        // Detect unusual completion time patterns
        $responses = Response::where('activity_id', $activityId)
            ->whereNotNull('started_at')
            ->whereNotNull('submitted_at')
            ->get();
        
        if ($responses->count() > 10) {
            $durations = $responses->map(function($r) {
                return $r->started_at->diffInMinutes($r->submitted_at);
            });
            
            $mean = $durations->avg();
            $stdDev = $this->calculateStdDev($durations, $mean);
            
            // Find outliers (> 2 standard deviations)
            $outliers = $responses->filter(function($r) use ($mean, $stdDev) {
                $duration = $r->started_at->diffInMinutes($r->submitted_at);
                return abs($duration - $mean) > (2 * $stdDev);
            });
            
            if ($outliers->count() > $responses->count() * 0.1) {
                $insights[] = [
                    'insight_type' => 'anomaly',
                    'priority' => 'medium',
                    'confidence_score' => 70.0,
                    'title' => 'Unusual Completion Times Detected',
                    'description' => sprintf(
                        '%d responses (%.1f%%) show unusually fast or slow completion times.',
                        $outliers->count(),
                        ($outliers->count() / $responses->count()) * 100
                    ),
                    'data' => [
                        'average_duration' => round($mean, 2),
                        'outlier_count' => $outliers->count(),
                        'total_responses' => $responses->count(),
                    ],
                ];
            }
        }
        
        return $insights;
    }

    /**
     * Generate completion pattern insights
     */
    protected function generateCompletionPatternInsights(string $activityId): array
    {
        $insights = [];
        
        // Identify drop-off points
        $activity = Activity::with('questionnaire.sections.questions')->findOrFail($activityId);
        $questions = $activity->questionnaire->sections->flatMap(fn($s) => $s->questions);
        
        $totalResponses = Response::where('activity_id', $activityId)->count();
        
        if ($totalResponses < 5) {
            return $insights;
        }
        
        $questionStats = [];
        foreach ($questions as $index => $question) {
            $answerCount = DB::table('answers')
                ->join('responses', 'answers.response_id', '=', 'responses.id')
                ->where('responses.activity_id', $activityId)
                ->where('answers.question_id', $question->id)
                ->count();
            
            $responseRate = ($answerCount / $totalResponses) * 100;
            
            $questionStats[] = [
                'question_id' => $question->id,
                'question_title' => $question->title,
                'position' => $index + 1,
                'response_rate' => $responseRate,
            ];
        }
        
        // Find significant drop-offs (>20% decrease between consecutive questions)
        for ($i = 1; $i < count($questionStats); $i++) {
            $drop = $questionStats[$i - 1]['response_rate'] - $questionStats[$i]['response_rate'];
            
            if ($drop > 20) {
                $insights[] = [
                    'insight_type' => 'completion_pattern',
                    'priority' => $drop > 40 ? 'high' : 'medium',
                    'confidence_score' => 80.0,
                    'title' => 'Significant Drop-off Detected',
                    'description' => sprintf(
                        'Response rate dropped by %.1f%% at question %d ("%s"). Consider simplifying or repositioning this question.',
                        $drop,
                        $questionStats[$i]['position'],
                        substr($questionStats[$i]['question_title'], 0, 50)
                    ),
                    'data' => [
                        'question_id' => $questionStats[$i]['question_id'],
                        'drop_percentage' => round($drop, 2),
                        'before_rate' => round($questionStats[$i - 1]['response_rate'], 2),
                        'after_rate' => round($questionStats[$i]['response_rate'], 2),
                    ],
                ];
                break; // Only report the first major drop-off
            }
        }
        
        return $insights;
    }

    /**
     * Generate summary insights
     */
    protected function generateSummaryInsights(string $activityId): array
    {
        $insights = [];
        
        $totalResponses = Response::where('activity_id', $activityId)->count();
        $submittedResponses = Response::where('activity_id', $activityId)->where('status', 'submitted')->count();
        $avgCompletion = Response::where('activity_id', $activityId)->avg('completion_percentage') ?? 0;
        
        if ($totalResponses > 0) {
            $completionRate = ($submittedResponses / $totalResponses) * 100;
            
            $status = $completionRate >= 80 ? 'excellent' : 
                     ($completionRate >= 60 ? 'good' : 
                     ($completionRate >= 40 ? 'fair' : 'needs improvement'));
            
            $insights[] = [
                'insight_type' => 'summary',
                'priority' => 'high',
                'confidence_score' => 95.0,
                'title' => 'Activity Performance Summary',
                'description' => sprintf(
                    'Activity has %s performance with %.1f%% completion rate across %d responses. Average completion: %.1f%%.',
                    $status,
                    $completionRate,
                    $totalResponses,
                    $avgCompletion
                ),
                'data' => [
                    'total_responses' => $totalResponses,
                    'submitted_responses' => $submittedResponses,
                    'completion_rate' => round($completionRate, 2),
                    'average_completion_percentage' => round($avgCompletion, 2),
                    'status' => $status,
                ],
            ];
        }
        
        return $insights;
    }

    /**
     * Analyze sentiment of text collection (simple rule-based)
     */
    protected function analyzeSentiment(Collection $texts): array
    {
        $positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'best', 'happy', 'satisfied', 'pleased'];
        $negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'worst', 'poor', 'unhappy', 'disappointed', 'frustrated'];
        
        $sentiments = $texts->map(function($text) use ($positiveWords, $negativeWords) {
            $text = strtolower($text);
            $positiveCount = 0;
            $negativeCount = 0;
            
            foreach ($positiveWords as $word) {
                $positiveCount += substr_count($text, $word);
            }
            
            foreach ($negativeWords as $word) {
                $negativeCount += substr_count($text, $word);
            }
            
            if ($positiveCount > $negativeCount) {
                return 'positive';
            } elseif ($negativeCount > $positiveCount) {
                return 'negative';
            } else {
                return 'neutral';
            }
        });
        
        $total = $sentiments->count();
        $positive = $sentiments->filter(fn($s) => $s === 'positive')->count();
        $negative = $sentiments->filter(fn($s) => $s === 'negative')->count();
        $neutral = $total - $positive - $negative;
        
        $overall = $positive > $negative ? 'positive' : ($negative > $positive ? 'negative' : 'neutral');
        
        return [
            'overall' => $overall,
            'positive_count' => $positive,
            'negative_count' => $negative,
            'neutral_count' => $neutral,
            'positive_percentage' => $total > 0 ? round(($positive / $total) * 100, 2) : 0,
            'negative_percentage' => $total > 0 ? round(($negative / $total) * 100, 2) : 0,
            'neutral_percentage' => $total > 0 ? round(($neutral / $total) * 100, 2) : 0,
            'confidence' => 70.0, // Simple rule-based has lower confidence
        ];
    }

    /**
     * Calculate standard deviation
     */
    protected function calculateStdDev(Collection $values, float $mean): float
    {
        $variance = $values->map(fn($v) => pow($v - $mean, 2))->avg();
        return sqrt($variance);
    }

    /**
     * Cache an insight
     */
    protected function cacheInsight(string $activityId, array $insight): void
    {
        $responseCount = Response::where('activity_id', $activityId)->count();
        
        AIInsightCache::create([
            'activity_id' => $activityId,
            'question_id' => $insight['question_id'] ?? null,
            'insight_type' => $insight['insight_type'],
            'title' => $insight['title'],
            'description' => $insight['description'],
            'data' => $insight['data'] ?? null,
            'priority' => $insight['priority'],
            'confidence_score' => $insight['confidence_score'],
            'computed_at' => now(),
            'expires_at' => now()->addHours(24), // Cache for 24 hours
            'response_count_at_computation' => $responseCount,
        ]);
    }

    /**
     * Format cached insights for response
     */
    protected function formatInsights(Collection $cachedInsights): array
    {
        return $cachedInsights->map(function($insight) {
            return [
                'id' => $insight->id,
                'insight_type' => $insight->insight_type,
                'priority' => $insight->priority,
                'confidence_score' => $insight->confidence_score,
                'title' => $insight->title,
                'description' => $insight->description,
                'data' => $insight->data,
                'question_id' => $insight->question_id,
                'computed_at' => $insight->computed_at,
            ];
        })->toArray();
    }

    /**
     * Clear expired insights
     */
    public function clearExpiredInsights(): int
    {
        return AIInsightCache::where('expires_at', '<', now())->delete();
    }
}
