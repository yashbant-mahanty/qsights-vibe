<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use OpenAI;
use Carbon\Carbon;

class AIReportAgentController extends Controller
{
    protected $openAIClient;
    protected $model;
    protected $maxTokens;
    protected $temperature;

    public function __construct()
    {
        // Initialize OpenAI client
        $apiKey = env('OPENAI_API_KEY');
        if ($apiKey) {
            $this->openAIClient = OpenAI::client($apiKey);
        }
        
        $this->model = env('OPENAI_MODEL', 'gpt-4o-mini');
        $this->maxTokens = env('OPENAI_MAX_TOKENS', 2000);
        $this->temperature = env('OPENAI_TEMPERATURE', 0.7);
    }

    /**
     * Main endpoint: Ask AI Agent a question
     * POST /api/ai-agent/ask
     */
    public function ask(Request $request)
    {
        $startTime = microtime(true);
        
        $request->validate([
            'query' => 'required|string|max:1000',
            'activity_id' => 'required|uuid',
            'session_id' => 'nullable|string',
            'context' => 'nullable|array', // Previous conversation messages
        ]);

        try {
            $user = $request->user();
            $query = $request->input('query');
            $activityId = $request->input('activity_id');
            $sessionId = $request->input('session_id', Str::uuid());
            $context = $request->input('context', []);

            // Check if OpenAI is configured
            if (!$this->openAIClient) {
                return response()->json([
                    'success' => false,
                    'error' => 'AI service not configured. Please set OPENAI_API_KEY in environment.',
                ], 503);
            }

            // Verify user has access to this activity
            $activity = $this->verifyActivityAccess($user, $activityId);
            if (!$activity) {
                return response()->json([
                    'success' => false,
                    'error' => 'Activity not found or access denied',
                ], 403);
            }

            // Check cache first
            $queryHash = $this->generateQueryHash($query, $activityId);
            $cachedResult = $this->getCachedQuery($queryHash);
            
            if ($cachedResult) {
                // Log cache hit
                $this->logQuery($user->id, $activityId, $query, 'cached', 0, 0);
                
                return response()->json([
                    'success' => true,
                    'data' => $cachedResult['result_data'],
                    'chart_type' => $cachedResult['chart_type'],
                    'summary' => $cachedResult['summary'],
                    'sql_query' => $cachedResult['sql_query'] ?? null,
                    'cached' => true,
                ]);
            }

            // Extract intent from user query using AI
            $intent = $this->extractIntent($query, $activity, $context);

            // Generate and execute query based on intent
            $queryResult = $this->executeIntent($intent, $activity, $user);

            // Generate AI summary and insights
            $summary = $this->generateSummary($query, $queryResult, $intent);

            // Auto-select best chart type
            $chartType = $this->selectChartType($intent, $queryResult);

            // Cache the result
            $this->cacheQuery($queryHash, $activityId, $query, $intent, $queryResult, $chartType, $summary);

            // Save to conversation history
            $this->saveConversation($user->id, $sessionId, $activityId, $query, $summary, $intent, $queryResult, $chartType);

            // Calculate response time
            $responseTime = (microtime(true) - $startTime) * 1000;

            // Log the query
            $this->logQuery(
                $user->id,
                $activityId,
                $query,
                'success',
                $responseTime,
                $intent['tokens_used'] ?? 0
            );

            return response()->json([
                'success' => true,
                'data' => $queryResult['data'],
                'chart_type' => $chartType,
                'summary' => $summary,
                'sql_query' => $queryResult['sql'] ?? null,
                'intent' => $intent,
                'cached' => false,
                'response_time_ms' => round($responseTime),
            ]);

        } catch (\Exception $e) {
            $responseTime = (microtime(true) - $startTime) * 1000;
            
            // Log error
            if (isset($user, $activityId, $query)) {
                $this->logQuery(
                    $user->id,
                    $activityId ?? null,
                    $query ?? '',
                    'error',
                    $responseTime,
                    0,
                    $e->getMessage()
                );
            }

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get conversation history for a session
     * GET /api/ai-agent/history
     */
    public function getHistory(Request $request)
    {
        $request->validate([
            'session_id' => 'required|string',
            'limit' => 'nullable|integer|max:50',
        ]);

        $user = $request->user();
        $sessionId = $request->input('session_id');
        $limit = $request->input('limit', 20);

        $history = DB::table('ai_conversation_history')
            ->where('user_id', $user->id)
            ->where('session_id', $sessionId)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        return response()->json([
            'success' => true,
            'history' => $history->reverse()->values(),
        ]);
    }

    /**
     * Provide feedback on AI response
     * POST /api/ai-agent/feedback
     */
    public function feedback(Request $request)
    {
        $request->validate([
            'conversation_id' => 'required|uuid',
            'was_helpful' => 'required|boolean',
            'feedback' => 'nullable|string|max:500',
        ]);

        DB::table('ai_conversation_history')
            ->where('id', $request->input('conversation_id'))
            ->where('user_id', $request->user()->id)
            ->update([
                'was_helpful' => $request->input('was_helpful'),
                'user_feedback' => $request->input('feedback'),
                'updated_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Feedback recorded',
        ]);
    }

    /**
     * Get popular queries for an activity
     * GET /api/ai-agent/popular-queries
     */
    public function popularQueries(Request $request)
    {
        $request->validate([
            'activity_id' => 'required|uuid',
            'limit' => 'nullable|integer|max:10',
        ]);

        $activityId = $request->input('activity_id');
        $limit = $request->input('limit', 5);

        $queries = DB::table('ai_query_cache')
            ->where('activity_id', $activityId)
            ->orderBy('hit_count', 'desc')
            ->limit($limit)
            ->select('query_text', 'hit_count', 'last_accessed_at')
            ->get();

        return response()->json([
            'success' => true,
            'queries' => $queries,
        ]);
    }

    /**
     * Extract intent from user query using OpenAI
     */
    protected function extractIntent(string $query, $activity, array $context = []): array
    {
        // Get activity schema
        $schema = $this->getActivitySchema($activity);

        // Build prompt for intent extraction
        $systemPrompt = $this->buildIntentExtractionPrompt($schema);
        
        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
        ];

        // Add context from previous messages (ensure context is an array)
        if (is_array($context)) {
            foreach (array_slice($context, -3) as $msg) {
                if (is_array($msg)) {
                    $messages[] = ['role' => 'user', 'content' => $msg['user_message'] ?? ''];
                    $messages[] = ['role' => 'assistant', 'content' => $msg['ai_response'] ?? ''];
                }
            }
        }

        // Add current query
        $messages[] = ['role' => 'user', 'content' => $query];

        try {
            $response = $this->openAIClient->chat()->create([
                'model' => $this->model,
                'messages' => $messages,
                'max_tokens' => 500,
                'temperature' => 0.3, // Lower temperature for more consistent intent extraction
                'response_format' => ['type' => 'json_object'],
            ]);

            $content = $response->choices[0]->message->content;
            $intent = json_decode($content, true);

            $intent['tokens_used'] = $response->usage->totalTokens ?? 0;
            $intent['cost_usd'] = $this->calculateCost($intent['tokens_used']);

            return $intent;

        } catch (\Exception $e) {
            // Fallback to simple keyword-based intent extraction
            return $this->fallbackIntentExtraction($query);
        }
    }

    /**
     * Build system prompt for intent extraction
     */
    protected function buildIntentExtractionPrompt(array $schema): string
    {
        $demographicFields = is_array($schema['demographic_fields'] ?? []) ? $schema['demographic_fields'] : [];
        $questions = is_array($schema['questions'] ?? []) ? $schema['questions'] : [];
        
        $availableFields = implode(', ', $demographicFields);
        $questionFields = implode(', ', $questions);

        return <<<PROMPT
You are a data analyst assistant. Extract structured intent from user queries about survey/event data.

Available data:
- Demographic fields: {$availableFields}
- Questions: {$questionFields}
- Metadata: completion_rate, submission_time, country, etc.

Response must be JSON with these fields:
{
    "intent_type": "count|trend|comparison|distribution|filter|ranking|correlation",
    "metric": "what to measure (e.g., 'participants', 'completion_rate', 'average_score')",
    "filters": {
        "demographic": {"field": "value"},
        "date_range": {"from": "YYYY-MM-DD", "to": "YYYY-MM-DD"},
        "country": "string",
        "age_range": {"min": number, "max": number}
    },
    "group_by": "field to group by (e.g., 'country', 'age_group', 'profession')",
    "sort": {"field": "string", "order": "asc|desc"},
    "limit": number,
    "time_period": "daily|weekly|monthly",
    "comparison_groups": ["group1", "group2"],
    "confidence": 0.0-1.0
}

Examples:
- "How many cardiologists aged 30-45 participated?" → count with filters
- "Which country has highest completion rate?" → ranking by completion_rate, group by country
- "Show submission trends" → trend over time
- "Compare male vs female by region" → comparison grouped by region

Extract the intent from the user's query.
PROMPT;
    }

    /**
     * Get activity schema (demographics, questions, etc.)
     */
    protected function getActivitySchema($activity): array
    {
        // Get registration form fields
        $registrationFields = $activity->registration_form_fields ?? [];
        $demographicFields = [];
        
        // Ensure registrationFields is an array before iterating
        if (is_array($registrationFields)) {
            foreach ($registrationFields as $field) {
                if (isset($field['name'])) {
                    $demographicFields[] = $field['name'];
                }
            }
        }

        // Get questionnaire questions from sections
        $questions = [];
        if ($activity->questionnaire_id) {
            // Get sections and questions for this questionnaire
            $sections = DB::table('sections')
                ->where('questionnaire_id', $activity->questionnaire_id)
                ->whereNull('deleted_at')
                ->orderBy('order')
                ->get();
            
            foreach ($sections as $section) {
                // Get questions for this section
                $sectionQuestions = DB::table('questions')
                    ->where('section_id', $section->id)
                    ->whereNull('deleted_at')
                    ->orderBy('order')
                    ->get();
                
                foreach ($sectionQuestions as $question) {
                    if (!empty($question->question_text)) {
                        $questions[] = $question->question_text;
                    }
                }
            }
        }

        return [
            'demographic_fields' => array_merge(['email', 'phone', 'country'], $demographicFields),
            'questions' => $questions,
            'has_scoring' => !empty($activity->pass_percentage),
        ];
    }

    /**
     * Execute intent and fetch data
     */
    protected function executeIntent(array $intent, $activity, $user): array
    {
        $intentType = $intent['intent_type'] ?? 'count';
        
        switch ($intentType) {
            case 'count':
                return $this->executeCountQuery($intent, $activity, $user);
            
            case 'trend':
                return $this->executeTrendQuery($intent, $activity, $user);
            
            case 'comparison':
                return $this->executeComparisonQuery($intent, $activity, $user);
            
            case 'distribution':
                return $this->executeDistributionQuery($intent, $activity, $user);
            
            case 'ranking':
                return $this->executeRankingQuery($intent, $activity, $user);
            
            default:
                return $this->executeCountQuery($intent, $activity, $user);
        }
    }

    /**
     * Execute COUNT query
     */
    protected function executeCountQuery(array $intent, $activity, $user): array
    {
        $query = DB::table('responses')
            ->where('activity_id', $activity->id)
            ->where('status', 'submitted');

        // Apply filters
        $query = $this->applyFilters($query, $intent, $activity);

        $count = $query->count();
        
        $sql = $query->toSql();
        $bindings = $query->getBindings();

        return [
            'data' => [
                'count' => $count,
                'metric' => $intent['metric'] ?? 'participants',
            ],
            'sql' => $this->interpolateQuery($sql, $bindings),
        ];
    }

    /**
     * Execute TREND query (time-based)
     */
    protected function executeTrendQuery(array $intent, $activity, $user): array
    {
        $timePeriod = $intent['time_period'] ?? 'daily';
        $dateFormat = $this->getDateFormat($timePeriod);

        $query = DB::table('responses')
            ->where('activity_id', $activity->id)
            ->where('status', 'submitted')
            ->whereNotNull('submitted_at')
            ->select(
                DB::raw("DATE_FORMAT(submitted_at, '{$dateFormat}') as period"),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('period')
            ->orderBy('period');

        $query = $this->applyFilters($query, $intent, $activity);

        $results = $query->get();
        
        $sql = $query->toSql();

        return [
            'data' => [
                'trend' => $results->map(function ($row) {
                    return [
                        'period' => $row->period,
                        'count' => $row->count,
                    ];
                })->toArray(),
            ],
            'sql' => $this->interpolateQuery($sql, $query->getBindings()),
        ];
    }

    /**
     * Execute COMPARISON query
     */
    protected function executeComparisonQuery(array $intent, $activity, $user): array
    {
        $groupBy = $intent['group_by'] ?? 'country';
        
        // Check if groupBy field is in registration data or metadata
        $query = DB::table('responses as r')
            ->leftJoin('participants as p', 'r.participant_id', '=', 'p.id')
            ->where('r.activity_id', $activity->id)
            ->where('r.status', 'submitted');

        // Determine if groupBy is in participant data or registration data
        if (in_array($groupBy, ['email', 'phone', 'name'])) {
            $query->select(
                DB::raw("p.{$groupBy} as group_name"),
                DB::raw('COUNT(*) as count')
            );
        } else {
            // It's in registration data (JSON)
            $query->select(
                DB::raw("p.additional_data->>'{$groupBy}' as group_name"),
                DB::raw('COUNT(*) as count')
            );
        }

        $query->groupBy('group_name')
            ->orderBy('count', 'desc')
            ->limit($intent['limit'] ?? 10);

        $results = $query->get();
        
        $sql = $query->toSql();

        return [
            'data' => [
                'comparison' => $results->map(function ($row) {
                    return [
                        'group' => $row->group_name ?? 'Unknown',
                        'count' => $row->count,
                    ];
                })->toArray(),
            ],
            'sql' => $this->interpolateQuery($sql, $query->getBindings()),
        ];
    }

    /**
     * Execute DISTRIBUTION query
     */
    protected function executeDistributionQuery(array $intent, $activity, $user): array
    {
        // Similar to comparison but focused on percentages
        return $this->executeComparisonQuery($intent, $activity, $user);
    }

    /**
     * Execute RANKING query
     */
    protected function executeRankingQuery(array $intent, $activity, $user): array
    {
        $metric = $intent['metric'] ?? 'count';
        $groupBy = $intent['group_by'] ?? 'country';

        $query = DB::table('responses as r')
            ->leftJoin('participants as p', 'r.participant_id', '=', 'p.id')
            ->where('r.activity_id', $activity->id)
            ->where('r.status', 'submitted');

        if ($metric === 'completion_rate') {
            // Calculate completion rate by group
            $query->select(
                DB::raw("p.additional_data->>'{$groupBy}' as group_name"),
                DB::raw('AVG(r.completion_percentage) as avg_completion')
            )
            ->groupBy('group_name')
            ->orderBy('avg_completion', 'desc');
        } else {
            // Count by group
            $query->select(
                DB::raw("p.additional_data->>'{$groupBy}' as group_name"),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('group_name')
            ->orderBy('count', 'desc');
        }

        $query->limit($intent['limit'] ?? 10);

        $results = $query->get();
        $sql = $query->toSql();

        return [
            'data' => [
                'ranking' => $results->map(function ($row) use ($metric) {
                    return [
                        'group' => $row->group_name ?? 'Unknown',
                        'value' => $metric === 'completion_rate' 
                            ? round($row->avg_completion, 2) 
                            : $row->count,
                    ];
                })->toArray(),
            ],
            'sql' => $this->interpolateQuery($sql, $query->getBindings()),
        ];
    }

    /**
     * Apply filters to query based on intent
     */
    protected function applyFilters($query, array $intent, $activity)
    {
        $filters = $intent['filters'] ?? [];

        // Date range filter
        if (isset($filters['date_range'])) {
            if (isset($filters['date_range']['from'])) {
                $query->where('submitted_at', '>=', $filters['date_range']['from']);
            }
            if (isset($filters['date_range']['to'])) {
                $query->where('submitted_at', '<=', $filters['date_range']['to']);
            }
        }

        // Demographic filters - these require joining with participants
        if (isset($filters['demographic'])) {
            foreach ($filters['demographic'] as $field => $value) {
                if (!$query->getQuery()->joins) {
                    $query->leftJoin('participants as p', 'responses.participant_id', '=', 'p.id');
                }
                
                // Check if it's a direct field or in additional_data JSON
                if (in_array($field, ['email', 'phone', 'name'])) {
                    $query->where("p.{$field}", 'like', "%{$value}%");
                } else {
                    $query->whereRaw("p.additional_data->>? LIKE ?", [$field, "%{$value}%"]);
                }
            }
        }

        return $query;
    }

    /**
     * Generate AI summary of the results
     */
    protected function generateSummary(string $query, array $queryResult, array $intent): string
    {
        $data = $queryResult['data'];
        
        // Build context for summary generation
        $dataString = json_encode($data, JSON_PRETTY_PRINT);
        
        $prompt = <<<PROMPT
User asked: "{$query}"

Query results:
{$dataString}

Generate a concise, insightful summary (2-3 sentences) of these results. Include:
1. Direct answer to the question
2. Key insights or patterns
3. Any notable observations

Be conversational and helpful.
PROMPT;

        try {
            $response = $this->openAIClient->chat()->create([
                'model' => $this->model,
                'messages' => [
                    ['role' => 'system', 'content' => 'You are a data analyst providing clear, concise insights.'],
                    ['role' => 'user', 'content' => $prompt],
                ],
                'max_tokens' => 200,
                'temperature' => $this->temperature,
            ]);

            return $response->choices[0]->message->content;

        } catch (\Exception $e) {
            // Fallback to simple summary
            return $this->generateFallbackSummary($data, $intent);
        }
    }

    /**
     * Fallback summary generation without AI
     */
    protected function generateFallbackSummary(array $data, array $intent): string
    {
        $intentType = $intent['intent_type'] ?? 'count';
        
        switch ($intentType) {
            case 'count':
                $count = $data['count'] ?? 0;
                return "Found {$count} " . ($data['metric'] ?? 'participants') . " matching your criteria.";
            
            case 'trend':
                $trend = $data['trend'] ?? [];
                $total = array_sum(array_column($trend, 'count'));
                return "Total of {$total} responses across " . count($trend) . " periods.";
            
            case 'comparison':
            case 'ranking':
                $items = $data['comparison'] ?? $data['ranking'] ?? [];
                if (empty($items)) {
                    return "No data found matching your criteria.";
                }
                $top = $items[0];
                return "Leading group is '" . ($top['group'] ?? 'Unknown') . "' with " . ($top['count'] ?? $top['value'] ?? 0) . ".";
            
            default:
                return "Query executed successfully.";
        }
    }

    /**
     * Auto-select best chart type based on intent and data
     */
    protected function selectChartType(array $intent, array $queryResult): string
    {
        $intentType = $intent['intent_type'] ?? 'count';
        $data = $queryResult['data'];

        switch ($intentType) {
            case 'count':
                return 'card'; // Single number card
            
            case 'trend':
                return 'line'; // Line chart for trends
            
            case 'comparison':
            case 'ranking':
                $itemCount = count($data['comparison'] ?? $data['ranking'] ?? []);
                return $itemCount <= 5 ? 'pie' : 'bar';
            
            case 'distribution':
                return 'pie';
            
            default:
                return 'table';
        }
    }

    /**
     * Fallback intent extraction using keywords
     */
    protected function fallbackIntentExtraction(string $query): array
    {
        $query = strtolower($query);
        
        // Detect intent type
        if (preg_match('/how many|count|number of/', $query)) {
            $intentType = 'count';
        } elseif (preg_match('/trend|over time|daily|weekly|monthly/', $query)) {
            $intentType = 'trend';
        } elseif (preg_match('/compare|vs|versus/', $query)) {
            $intentType = 'comparison';
        } elseif (preg_match('/highest|lowest|top|bottom|ranking/', $query)) {
            $intentType = 'ranking';
        } else {
            $intentType = 'count';
        }

        return [
            'intent_type' => $intentType,
            'metric' => 'participants',
            'filters' => [],
            'confidence' => 0.5,
            'fallback' => true,
        ];
    }

    /**
     * Verify user has access to activity
     */
    protected function verifyActivityAccess($user, $activityId)
    {
        $query = DB::table('activities')->where('id', $activityId);

        // Apply role-based access control
        if ($user->role !== 'super-admin') {
            $query->where('program_id', $user->program_id);
        }

        return $query->first();
    }

    /**
     * Generate query hash for caching
     */
    protected function generateQueryHash(string $query, string $activityId): string
    {
        return hash('sha256', strtolower(trim($query)) . $activityId);
    }

    /**
     * Get cached query result
     */
    protected function getCachedQuery(string $queryHash)
    {
        $cached = DB::table('ai_query_cache')
            ->where('query_hash', $queryHash)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            })
            ->first();

        if ($cached) {
            // Update hit count and last accessed
            DB::table('ai_query_cache')
                ->where('id', $cached->id)
                ->update([
                    'hit_count' => $cached->hit_count + 1,
                    'last_accessed_at' => now(),
                ]);

            return [
                'result_data' => json_decode($cached->result_data, true),
                'chart_type' => $cached->chart_type,
                'summary' => $cached->summary,
                'sql_query' => null, // Don't show SQL for cached results
            ];
        }

        return null;
    }

    /**
     * Cache query result
     */
    protected function cacheQuery($queryHash, $activityId, $query, $intent, $queryResult, $chartType, $summary)
    {
        DB::table('ai_query_cache')->updateOrInsert(
            ['query_hash' => $queryHash],
            [
                'id' => Str::uuid(),
                'activity_id' => $activityId,
                'program_id' => DB::table('activities')->where('id', $activityId)->value('program_id'),
                'query_text' => $query,
                'query_hash' => $queryHash,
                'intent' => $intent['intent_type'] ?? null,
                'filters' => json_encode($intent['filters'] ?? []),
                'result_data' => json_encode($queryResult['data']),
                'chart_type' => $chartType,
                'summary' => $summary,
                'hit_count' => 1,
                'last_accessed_at' => now(),
                'expires_at' => now()->addHours(24), // Cache for 24 hours
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    /**
     * Save conversation to history
     */
    protected function saveConversation($userId, $sessionId, $activityId, $query, $aiResponse, $intent, $queryResult, $chartType)
    {
        DB::table('ai_conversation_history')->insert([
            'id' => Str::uuid(),
            'user_id' => $userId,
            'session_id' => $sessionId,
            'activity_id' => $activityId,
            'program_id' => DB::table('activities')->where('id', $activityId)->value('program_id'),
            'user_message' => $query,
            'ai_response' => $aiResponse,
            'extracted_intent' => json_encode($intent),
            'query_result' => json_encode($queryResult['data']),
            'chart_type' => $chartType,
            'metadata' => json_encode([
                'tokens_used' => $intent['tokens_used'] ?? 0,
                'cost_usd' => $intent['cost_usd'] ?? 0,
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Log query for analytics
     */
    protected function logQuery($userId, $activityId, $query, $status, $responseTime, $tokensUsed, $errorMessage = null)
    {
        DB::table('ai_query_logs')->insert([
            'id' => Str::uuid(),
            'user_id' => $userId,
            'activity_id' => $activityId,
            'program_id' => $activityId ? DB::table('activities')->where('id', $activityId)->value('program_id') : null,
            'query_text' => $query,
            'status' => $status,
            'response_time_ms' => round($responseTime, 3), // Round to 3 decimal places
            'tokens_used' => (int) $tokensUsed,
            'cost_usd' => $this->calculateCost($tokensUsed),
            'model_used' => $this->model,
            'error_message' => $errorMessage,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Calculate API cost based on tokens
     */
    protected function calculateCost(int $tokens): float
    {
        // Pricing (per 1M tokens) - adjust based on your model
        $pricing = [
            'gpt-4o' => ['input' => 2.50, 'output' => 10.00],
            'gpt-4o-mini' => ['input' => 0.150, 'output' => 0.600],
            'gpt-3.5-turbo' => ['input' => 0.50, 'output' => 1.50],
        ];

        $model = $this->model;
        $rates = $pricing[$model] ?? $pricing['gpt-4o-mini'];
        
        // Rough estimate: 70% input, 30% output
        $inputCost = ($tokens * 0.7 / 1000000) * $rates['input'];
        $outputCost = ($tokens * 0.3 / 1000000) * $rates['output'];
        
        return round($inputCost + $outputCost, 6);
    }

    /**
     * Get date format for SQL based on time period
     */
    protected function getDateFormat(string $period): string
    {
        switch ($period) {
            case 'daily':
                return '%Y-%m-%d';
            case 'weekly':
                return '%Y-%u';
            case 'monthly':
                return '%Y-%m';
            default:
                return '%Y-%m-%d';
        }
    }

    /**
     * Interpolate SQL query with bindings for display
     */
    protected function interpolateQuery(string $sql, array $bindings): string
    {
        foreach ($bindings as $binding) {
            $value = is_numeric($binding) ? $binding : "'{$binding}'";
            $sql = preg_replace('/\?/', $value, $sql, 1);
        }
        return $sql;
    }
}
