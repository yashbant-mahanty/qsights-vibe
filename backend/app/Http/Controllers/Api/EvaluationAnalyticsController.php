<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class EvaluationAnalyticsController extends Controller
{
    /**
     * Get comprehensive analytics summary for date range
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function summary(Request $request)
    {
        try {
            $user = $request->user();
            
            // Validate request
            $validated = $request->validate([
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
                'program_id' => 'nullable|uuid',
                'department_id' => 'nullable|string',
                'evaluator_id' => 'nullable|uuid',
                'template_id' => 'nullable|string'
            ]);
            
            $dateFrom = $validated['date_from'];
            $dateTo = $validated['date_to'] . ' 23:59:59';
            $programId = $validated['program_id'] ?? $user->program_id;
            
            // Build base query
            $query = DB::table('evaluation_triggered as et')
                ->join('programs as p', 'et.program_id', '=', 'p.id')
                ->leftJoin('evaluation_staff as es', 'et.evaluator_id', '=', 'es.id')
                ->leftJoin('evaluation_roles as er', 'es.role_id', '=', 'er.id')
                ->whereNull('et.deleted_at')
                ->whereNull('p.deleted_at')
                ->whereBetween('et.triggered_at', [$dateFrom, $dateTo]);
            
            // Apply program filter
            if ($programId && !in_array($user->role, ['super-admin', 'admin'])) {
                $query->where('et.program_id', $programId);
            } elseif ($programId) {
                $query->where('et.program_id', $programId);
            }
            
            // Apply additional filters
            if (!empty($validated['department_id'])) {
                $query->where('er.category', $validated['department_id']);
            }
            
            if (!empty($validated['evaluator_id'])) {
                $query->where('et.evaluator_id', $validated['evaluator_id']);
            }
            
            if (!empty($validated['template_id'])) {
                $query->where('et.template_id', $validated['template_id']);
            }
            
            $evaluations = $query->select(
                'et.*',
                'er.category as department',
                'er.name as evaluator_role'
            )->get();
            
            // Calculate metrics
            $totalTriggered = $evaluations->count();
            $completed = $evaluations->where('status', 'completed')->count();
            $pending = $evaluations->where('status', 'pending')->count();
            $inProgress = $evaluations->where('status', 'in_progress')->count();
            
            $completionRate = $totalTriggered > 0 ? round(($completed / $totalTriggered) * 100, 1) : 0;
            
            // Calculate subordinates evaluated and unique evaluators
            $uniqueEvaluators = collect();
            $subordinatesEvaluated = collect();
            $totalResponseTime = 0;
            $responseTimeCount = 0;
            
            foreach ($evaluations->where('status', 'completed') as $eval) {
                $uniqueEvaluators->push($eval->evaluator_id);
                
                $subordinates = json_decode($eval->subordinates, true) ?? [];
                foreach ($subordinates as $sub) {
                    $subordinatesEvaluated->push($sub['id']);
                }
                
                // Calculate response time
                if ($eval->completed_at && $eval->triggered_at) {
                    $responseTime = Carbon::parse($eval->triggered_at)->diffInDays(Carbon::parse($eval->completed_at));
                    $totalResponseTime += $responseTime;
                    $responseTimeCount++;
                }
            }
            
            $averageResponseTime = $responseTimeCount > 0 ? round($totalResponseTime / $responseTimeCount, 1) : 0;
            
            // Rating distribution
            $ratingDistribution = [];
            $totalRatings = 0;
            $sumRatings = 0;
            
            foreach ($evaluations->where('status', 'completed') as $eval) {
                $responses = json_decode($eval->responses, true) ?? [];
                
                foreach ($responses as $subResponses) {
                    if (isset($subResponses['responses']) && is_array($subResponses['responses'])) {
                        foreach ($subResponses['responses'] as $response) {
                            if (is_numeric($response) && $response >= 1 && $response <= 5) {
                                $rating = (int)$response;
                                if (!isset($ratingDistribution[$rating])) {
                                    $ratingDistribution[$rating] = 0;
                                }
                                $ratingDistribution[$rating]++;
                                $sumRatings += $rating;
                                $totalRatings++;
                            }
                        }
                    }
                }
            }
            
            $overallAverageRating = $totalRatings > 0 ? round($sumRatings / $totalRatings, 2) : 0;
            
            // Template breakdown
            $templateBreakdown = [];
            foreach ($evaluations->where('status', 'completed') as $eval) {
                $templateKey = $eval->template_id;
                if (!isset($templateBreakdown[$templateKey])) {
                    $templateBreakdown[$templateKey] = [
                        'template_id' => $eval->template_id,
                        'template_name' => $eval->template_name,
                        'count' => 0
                    ];
                }
                $templateBreakdown[$templateKey]['count']++;
            }
            
            // Department breakdown
            $departmentBreakdown = [];
            foreach ($evaluations->where('status', 'completed') as $eval) {
                $dept = $eval->department ?? 'Unassigned';
                if (!isset($departmentBreakdown[$dept])) {
                    $departmentBreakdown[$dept] = [
                        'department' => $dept,
                        'count' => 0
                    ];
                }
                $departmentBreakdown[$dept]['count']++;
            }
            
            return response()->json([
                'success' => true,
                'summary' => [
                    'date_range' => [
                        'from' => $dateFrom,
                        'to' => substr($dateTo, 0, 10)
                    ],
                    'total_metrics' => [
                        'evaluations_triggered' => $totalTriggered,
                        'evaluations_completed' => $completed,
                        'evaluations_pending' => $pending,
                        'evaluations_in_progress' => $inProgress,
                        'completion_rate' => $completionRate,
                        'total_subordinates_evaluated' => $subordinatesEvaluated->unique()->count(),
                        'unique_evaluators' => $uniqueEvaluators->unique()->count(),
                        'average_response_time_days' => $averageResponseTime
                    ],
                    'performance_metrics' => [
                        'overall_average_rating' => $overallAverageRating,
                        'rating_distribution' => array_map(function($score) use ($ratingDistribution) {
                            return [
                                'score' => $score,
                                'count' => $ratingDistribution[$score] ?? 0
                            ];
                        }, range(1, 5)),
                        'total_ratings' => $totalRatings
                    ],
                    'breakdown' => [
                        'templates' => array_values($templateBreakdown),
                        'departments' => array_values($departmentBreakdown)
                    ]
                ]
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to fetch analytics summary: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch analytics: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get evaluator performance metrics
     */
    public function evaluatorPerformance(Request $request)
    {
        try {
            $user = $request->user();
            
            $validated = $request->validate([
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
                'program_id' => 'nullable|uuid',
                'department_id' => 'nullable|string',
                'evaluator_id' => 'nullable|uuid'
            ]);
            
            $dateFrom = $validated['date_from'];
            $dateTo = $validated['date_to'] . ' 23:59:59';
            $programId = $validated['program_id'] ?? $user->program_id;
            
            // Get all evaluations in date range
            $query = DB::table('evaluation_triggered as et')
                ->join('programs as p', 'et.program_id', '=', 'p.id')
                ->leftJoin('evaluation_staff as es', 'et.evaluator_id', '=', 'es.id')
                ->leftJoin('evaluation_roles as er', 'es.role_id', '=', 'er.id')
                ->whereNull('et.deleted_at')
                ->whereNull('p.deleted_at')
                ->whereBetween('et.triggered_at', [$dateFrom, $dateTo]);
            
            if ($programId && !in_array($user->role, ['super-admin', 'admin'])) {
                $query->where('et.program_id', $programId);
            } elseif ($programId) {
                $query->where('et.program_id', $programId);
            }
            
            if (!empty($validated['department_id'])) {
                $query->where('er.category', $validated['department_id']);
            }
            
            if (!empty($validated['evaluator_id'])) {
                $query->where('et.evaluator_id', $validated['evaluator_id']);
            }
            
            $evaluations = $query->select(
                'et.*',
                'er.category as department',
                'er.name as evaluator_role'
            )->get();
            
            // Group by evaluator
            $evaluatorMetrics = [];
            
            foreach ($evaluations as $eval) {
                $evaluatorId = $eval->evaluator_id;
                
                if (!isset($evaluatorMetrics[$evaluatorId])) {
                    $evaluatorMetrics[$evaluatorId] = [
                        'evaluator_id' => $evaluatorId,
                        'evaluator_name' => $eval->evaluator_name,
                        'evaluator_email' => $eval->evaluator_email,
                        'department' => $eval->department ?? 'Unassigned',
                        'role' => $eval->evaluator_role ?? 'Unknown',
                        'total_triggered' => 0,
                        'total_completed' => 0,
                        'total_pending' => 0,
                        'subordinates_evaluated' => collect(),
                        'templates_used' => collect(),
                        'total_ratings' => 0,
                        'sum_ratings' => 0,
                        'response_times' => []
                    ];
                }
                
                $evaluatorMetrics[$evaluatorId]['total_triggered']++;
                
                if ($eval->status === 'completed') {
                    $evaluatorMetrics[$evaluatorId]['total_completed']++;
                    
                    // Track subordinates
                    $subordinates = json_decode($eval->subordinates, true) ?? [];
                    foreach ($subordinates as $sub) {
                        $evaluatorMetrics[$evaluatorId]['subordinates_evaluated']->push($sub['id']);
                    }
                    
                    // Track templates
                    $evaluatorMetrics[$evaluatorId]['templates_used']->push($eval->template_id);
                    
                    // Calculate ratings
                    $responses = json_decode($eval->responses, true) ?? [];
                    foreach ($responses as $subResponses) {
                        if (isset($subResponses['responses']) && is_array($subResponses['responses'])) {
                            foreach ($subResponses['responses'] as $response) {
                                if (is_numeric($response)) {
                                    $evaluatorMetrics[$evaluatorId]['total_ratings']++;
                                    $evaluatorMetrics[$evaluatorId]['sum_ratings'] += $response;
                                }
                            }
                        }
                    }
                    
                    // Calculate response time
                    if ($eval->completed_at && $eval->triggered_at) {
                        $responseTime = Carbon::parse($eval->triggered_at)->diffInDays(Carbon::parse($eval->completed_at));
                        $evaluatorMetrics[$evaluatorId]['response_times'][] = $responseTime;
                    }
                    
                } elseif ($eval->status === 'pending') {
                    $evaluatorMetrics[$evaluatorId]['total_pending']++;
                }
            }
            
            // Calculate final metrics
            $evaluatorReports = [];
            foreach ($evaluatorMetrics as $evaluatorId => $metrics) {
                $completionRate = $metrics['total_triggered'] > 0 
                    ? round(($metrics['total_completed'] / $metrics['total_triggered']) * 100, 1) 
                    : 0;
                
                $averageRating = $metrics['total_ratings'] > 0 
                    ? round($metrics['sum_ratings'] / $metrics['total_ratings'], 2) 
                    : 0;
                
                $averageResponseTime = count($metrics['response_times']) > 0 
                    ? round(array_sum($metrics['response_times']) / count($metrics['response_times']), 1) 
                    : 0;
                
                $evaluatorReports[] = [
                    'evaluator_id' => $metrics['evaluator_id'],
                    'evaluator_name' => $metrics['evaluator_name'],
                    'evaluator_email' => $metrics['evaluator_email'],
                    'department' => $metrics['department'],
                    'role' => $metrics['role'],
                    'total_triggered' => $metrics['total_triggered'],
                    'total_completed' => $metrics['total_completed'],
                    'total_pending' => $metrics['total_pending'],
                    'completion_rate' => $completionRate,
                    'subordinates_evaluated' => $metrics['subordinates_evaluated']->unique()->count(),
                    'templates_used' => $metrics['templates_used']->unique()->count(),
                    'average_rating_given' => $averageRating,
                    'average_response_time_days' => $averageResponseTime
                ];
            }
            
            // Sort by completion rate descending
            usort($evaluatorReports, function($a, $b) {
                return $b['completion_rate'] <=> $a['completion_rate'];
            });
            
            return response()->json([
                'success' => true,
                'evaluator_performance' => $evaluatorReports
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to fetch evaluator performance: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch evaluator performance: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get subordinate performance analysis
     */
    public function subordinatePerformance(Request $request)
    {
        try {
            $user = $request->user();
            
            $validated = $request->validate([
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
                'program_id' => 'nullable|uuid',
                'department_id' => 'nullable|string',
                'staff_id' => 'nullable|uuid'
            ]);
            
            $dateFrom = $validated['date_from'];
            $dateTo = $validated['date_to'] . ' 23:59:59';
            $programId = $validated['program_id'] ?? $user->program_id;
            
            $query = DB::table('evaluation_triggered as et')
                ->join('programs as p', 'et.program_id', '=', 'p.id')
                ->whereNull('et.deleted_at')
                ->whereNull('p.deleted_at')
                ->where('et.status', 'completed')
                ->whereBetween('et.completed_at', [$dateFrom, $dateTo]);
            
            if ($programId && !in_array($user->role, ['super-admin', 'admin'])) {
                $query->where('et.program_id', $programId);
            } elseif ($programId) {
                $query->where('et.program_id', $programId);
            }
            
            $evaluations = $query->get();
            
            // Process subordinates
            $subordinateMetrics = [];
            
            foreach ($evaluations as $eval) {
                $subordinates = json_decode($eval->subordinates, true) ?? [];
                $responses = json_decode($eval->responses, true) ?? [];
                $templateQuestions = json_decode($eval->template_questions, true) ?? [];
                
                foreach ($subordinates as $sub) {
                    $subId = $sub['id'];
                    
                    // Check if staff exists
                    $staffExists = DB::table('evaluation_staff')
                        ->where('id', $subId)
                        ->whereNull('deleted_at')
                        ->first();
                    
                    if (!$staffExists) {
                        continue;
                    }
                    
                    // Apply staff filter
                    if (!empty($validated['staff_id']) && $subId !== $validated['staff_id']) {
                        continue;
                    }
                    
                    if (!isset($subordinateMetrics[$subId])) {
                        $subordinateMetrics[$subId] = [
                            'staff_id' => $subId,
                            'staff_name' => $sub['name'] ?? $staffExists->name,
                            'staff_email' => $sub['email'] ?? $staffExists->email,
                            'employee_id' => $sub['employee_id'] ?? $staffExists->employee_id,
                            'department' => $staffExists->department ?? 'Unknown',
                            'total_evaluations' => 0,
                            'evaluators' => collect(),
                            'all_ratings' => [],
                            'competency_scores' => [],
                            'latest_evaluation_date' => null,
                            'earliest_evaluation_date' => null
                        ];
                    }
                    
                    $subordinateMetrics[$subId]['total_evaluations']++;
                    $subordinateMetrics[$subId]['evaluators']->push($eval->evaluator_id);
                    
                    // Track dates
                    $evalDate = Carbon::parse($eval->completed_at);
                    if (!$subordinateMetrics[$subId]['latest_evaluation_date'] || 
                        $evalDate->gt(Carbon::parse($subordinateMetrics[$subId]['latest_evaluation_date']))) {
                        $subordinateMetrics[$subId]['latest_evaluation_date'] = $eval->completed_at;
                    }
                    if (!$subordinateMetrics[$subId]['earliest_evaluation_date'] || 
                        $evalDate->lt(Carbon::parse($subordinateMetrics[$subId]['earliest_evaluation_date']))) {
                        $subordinateMetrics[$subId]['earliest_evaluation_date'] = $eval->completed_at;
                    }
                    
                    // Process ratings
                    $subResponses = $responses[$subId] ?? null;
                    if ($subResponses && isset($subResponses['responses'])) {
                        foreach ($subResponses['responses'] as $index => $response) {
                            if (is_numeric($response)) {
                                $subordinateMetrics[$subId]['all_ratings'][] = (float)$response;
                                
                                // Map to competency if question exists
                                if (isset($templateQuestions[$index])) {
                                    $questionText = $templateQuestions[$index]['question'] ?? 
                                                  $templateQuestions[$index]['title'] ?? 
                                                  "Question " . ($index + 1);
                                    
                                    if (!isset($subordinateMetrics[$subId]['competency_scores'][$questionText])) {
                                        $subordinateMetrics[$subId]['competency_scores'][$questionText] = [];
                                    }
                                    $subordinateMetrics[$subId]['competency_scores'][$questionText][] = (float)$response;
                                }
                            }
                        }
                    }
                }
            }
            
            // Calculate final metrics
            $subordinateReports = [];
            foreach ($subordinateMetrics as $subId => $metrics) {
                $allRatings = $metrics['all_ratings'];
                $overallAverage = count($allRatings) > 0 
                    ? round(array_sum($allRatings) / count($allRatings), 2) 
                    : 0;
                
                // Calculate competency averages
                $competencies = [];
                $highestCompetency = ['name' => 'N/A', 'score' => 0];
                $lowestCompetency = ['name' => 'N/A', 'score' => 5];
                
                foreach ($metrics['competency_scores'] as $competencyName => $scores) {
                    $avgScore = round(array_sum($scores) / count($scores), 2);
                    $competencies[] = [
                        'competency' => $competencyName,
                        'average_score' => $avgScore,
                        'evaluation_count' => count($scores)
                    ];
                    
                    if ($avgScore > $highestCompetency['score']) {
                        $highestCompetency = ['name' => $competencyName, 'score' => $avgScore];
                    }
                    if ($avgScore < $lowestCompetency['score']) {
                        $lowestCompetency = ['name' => $competencyName, 'score' => $avgScore];
                    }
                }
                
                // Sort competencies by score descending
                usort($competencies, function($a, $b) {
                    return $b['average_score'] <=> $a['average_score'];
                });
                
                // Get latest rating (from latest evaluation)
                $latestRating = 0;
                if ($metrics['latest_evaluation_date']) {
                    $latestEval = $evaluations->first(function($e) use ($subId, $metrics) {
                        return $e->completed_at === $metrics['latest_evaluation_date'] &&
                               str_contains($e->subordinates, $subId);
                    });
                    
                    if ($latestEval) {
                        $latestResponses = json_decode($latestEval->responses, true)[$subId]['responses'] ?? [];
                        $numericLatest = array_filter($latestResponses, 'is_numeric');
                        $latestRating = count($numericLatest) > 0 
                            ? round(array_sum($numericLatest) / count($numericLatest), 2) 
                            : 0;
                    }
                }
                
                $subordinateReports[] = [
                    'staff_id' => $metrics['staff_id'],
                    'staff_name' => $metrics['staff_name'],
                    'staff_email' => $metrics['staff_email'],
                    'employee_id' => $metrics['employee_id'],
                    'department' => $metrics['department'],
                    'total_evaluations' => $metrics['total_evaluations'],
                    'evaluators_count' => $metrics['evaluators']->unique()->count(),
                    'overall_average_rating' => $overallAverage,
                    'latest_rating' => $latestRating,
                    'latest_evaluation_date' => $metrics['latest_evaluation_date'] 
                        ? Carbon::parse($metrics['latest_evaluation_date'])->format('Y-m-d') 
                        : null,
                    'earliest_evaluation_date' => $metrics['earliest_evaluation_date']
                        ? Carbon::parse($metrics['earliest_evaluation_date'])->format('Y-m-d')
                        : null,
                    'highest_competency' => $highestCompetency,
                    'development_area' => $lowestCompetency,
                    'competencies' => $competencies
                ];
            }
            
            // Sort by overall average descending
            usort($subordinateReports, function($a, $b) {
                return $b['overall_average_rating'] <=> $a['overall_average_rating'];
            });
            
            return response()->json([
                'success' => true,
                'subordinate_performance' => $subordinateReports
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to fetch subordinate performance: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch subordinate performance: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get competency/parameter analysis
     */
    public function competencyAnalysis(Request $request)
    {
        try {
            $user = $request->user();
            
            $validated = $request->validate([
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
                'program_id' => 'nullable|uuid',
                'department_id' => 'nullable|string'
            ]);
            
            $dateFrom = $validated['date_from'];
            $dateTo = $validated['date_to'] . ' 23:59:59';
            $programId = $validated['program_id'] ?? $user->program_id;
            
            $query = DB::table('evaluation_triggered as et')
                ->join('programs as p', 'et.program_id', '=', 'p.id')
                ->leftJoin('evaluation_staff as es', 'et.evaluator_id', '=', 'es.id')
                ->leftJoin('evaluation_roles as er', 'es.role_id', '=', 'er.id')
                ->whereNull('et.deleted_at')
                ->whereNull('p.deleted_at')
                ->where('et.status', 'completed')
                ->whereBetween('et.completed_at', [$dateFrom, $dateTo]);
            
            if ($programId && !in_array($user->role, ['super-admin', 'admin'])) {
                $query->where('et.program_id', $programId);
            } elseif ($programId) {
                $query->where('et.program_id', $programId);
            }
            
            if (!empty($validated['department_id'])) {
                $query->where('er.category', $validated['department_id']);
            }
            
            $evaluations = $query->select(
                'et.*',
                'er.category as department'
            )->get();
            
            // Process competencies
            $competencyData = [];
            
            foreach ($evaluations as $eval) {
                $templateQuestions = json_decode($eval->template_questions, true) ?? [];
                $responses = json_decode($eval->responses, true) ?? [];
                $department = $eval->department ?? 'Unassigned';
                
                foreach ($responses as $subId => $subResponses) {
                    if (!isset($subResponses['responses']) || !is_array($subResponses['responses'])) {
                        continue;
                    }
                    
                    foreach ($subResponses['responses'] as $index => $response) {
                        if (!is_numeric($response)) {
                            continue;
                        }
                        
                        $questionText = $templateQuestions[$index]['question'] ?? 
                                      $templateQuestions[$index]['title'] ?? 
                                      "Question " . ($index + 1);
                        
                        if (!isset($competencyData[$questionText])) {
                            $competencyData[$questionText] = [
                                'competency' => $questionText,
                                'all_scores' => [],
                                'department_scores' => []
                            ];
                        }
                        
                        $score = (float)$response;
                        $competencyData[$questionText]['all_scores'][] = $score;
                        
                        if (!isset($competencyData[$questionText]['department_scores'][$department])) {
                            $competencyData[$questionText]['department_scores'][$department] = [];
                        }
                        $competencyData[$questionText]['department_scores'][$department][] = $score;
                    }
                }
            }
            
            // Calculate final metrics
            $competencyReports = [];
            foreach ($competencyData as $competency => $data) {
                $allScores = $data['all_scores'];
                $averageScore = round(array_sum($allScores) / count($allScores), 2);
                $highestScore = round(max($allScores), 2);
                $lowestScore = round(min($allScores), 2);
                
                // Calculate score distribution
                $distribution = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
                foreach ($allScores as $score) {
                    $roundedScore = (int)round($score);
                    if ($roundedScore >= 1 && $roundedScore <= 5) {
                        $distribution[$roundedScore]++;
                    }
                }
                
                // Department breakdown
                $departmentBreakdown = [];
                foreach ($data['department_scores'] as $dept => $scores) {
                    $departmentBreakdown[] = [
                        'department' => $dept,
                        'average_score' => round(array_sum($scores) / count($scores), 2),
                        'evaluation_count' => count($scores)
                    ];
                }
                
                // Sort departments by score descending
                usort($departmentBreakdown, function($a, $b) {
                    return $b['average_score'] <=> $a['average_score'];
                });
                
                $competencyReports[] = [
                    'competency' => $competency,
                    'average_score' => $averageScore,
                    'highest_score' => $highestScore,
                    'lowest_score' => $lowestScore,
                    'total_evaluations' => count($allScores),
                    'score_distribution' => array_map(function($score) use ($distribution) {
                        return [
                            'score' => $score,
                            'count' => $distribution[$score]
                        ];
                    }, range(1, 5)),
                    'department_breakdown' => $departmentBreakdown
                ];
            }
            
            // Sort by average score descending
            usort($competencyReports, function($a, $b) {
                return $b['average_score'] <=> $a['average_score'];
            });
            
            return response()->json([
                'success' => true,
                'competency_analysis' => $competencyReports
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to fetch competency analysis: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch competency analysis: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get department comparison
     */
    public function departmentComparison(Request $request)
    {
        try {
            $user = $request->user();
            
            $validated = $request->validate([
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
                'program_id' => 'nullable|uuid'
            ]);
            
            $dateFrom = $validated['date_from'];
            $dateTo = $validated['date_to'] . ' 23:59:59';
            $programId = $validated['program_id'] ?? $user->program_id;
            
            $query = DB::table('evaluation_triggered as et')
                ->join('programs as p', 'et.program_id', '=', 'p.id')
                ->leftJoin('evaluation_staff as es', 'et.evaluator_id', '=', 'es.id')
                ->leftJoin('evaluation_roles as er', 'es.role_id', '=', 'er.id')
                ->whereNull('et.deleted_at')
                ->whereNull('p.deleted_at')
                ->whereBetween('et.triggered_at', [$dateFrom, $dateTo]);
            
            if ($programId && !in_array($user->role, ['super-admin', 'admin'])) {
                $query->where('et.program_id', $programId);
            } elseif ($programId) {
                $query->where('et.program_id', $programId);
            }
            
            $evaluations = $query->select(
                'et.*',
                'er.category as department'
            )->get();
            
            // Process by department
            $departmentMetrics = [];
            
            foreach ($evaluations as $eval) {
                $dept = $eval->department ?? 'Unassigned';
                
                if (!isset($departmentMetrics[$dept])) {
                    $departmentMetrics[$dept] = [
                        'department' => $dept,
                        'total_triggered' => 0,
                        'total_completed' => 0,
                        'total_pending' => 0,
                        'all_ratings' => [],
                        'evaluators' => collect(),
                        'subordinates' => collect(),
                        'response_times' => []
                    ];
                }
                
                $departmentMetrics[$dept]['total_triggered']++;
                $departmentMetrics[$dept]['evaluators']->push($eval->evaluator_id);
                
                // Track subordinates
                $subordinates = json_decode($eval->subordinates, true) ?? [];
                foreach ($subordinates as $sub) {
                    $departmentMetrics[$dept]['subordinates']->push($sub['id']);
                }
                
                if ($eval->status === 'completed') {
                    $departmentMetrics[$dept]['total_completed']++;
                    
                    // Process ratings
                    $responses = json_decode($eval->responses, true) ?? [];
                    foreach ($responses as $subResponses) {
                        if (isset($subResponses['responses']) && is_array($subResponses['responses'])) {
                            foreach ($subResponses['responses'] as $response) {
                                if (is_numeric($response)) {
                                    $departmentMetrics[$dept]['all_ratings'][] = (float)$response;
                                }
                            }
                        }
                    }
                    
                    // Calculate response time
                    if ($eval->completed_at && $eval->triggered_at) {
                        $responseTime = Carbon::parse($eval->triggered_at)->diffInDays(Carbon::parse($eval->completed_at));
                        $departmentMetrics[$dept]['response_times'][] = $responseTime;
                    }
                    
                } elseif ($eval->status === 'pending') {
                    $departmentMetrics[$dept]['total_pending']++;
                }
            }
            
            // Calculate final metrics
            $departmentReports = [];
            foreach ($departmentMetrics as $dept => $metrics) {
                $completionRate = $metrics['total_triggered'] > 0 
                    ? round(($metrics['total_completed'] / $metrics['total_triggered']) * 100, 1) 
                    : 0;
                
                $averageRating = count($metrics['all_ratings']) > 0 
                    ? round(array_sum($metrics['all_ratings']) / count($metrics['all_ratings']), 2) 
                    : 0;
                
                $averageResponseTime = count($metrics['response_times']) > 0 
                    ? round(array_sum($metrics['response_times']) / count($metrics['response_times']), 1) 
                    : 0;
                
                $departmentReports[] = [
                    'department' => $dept,
                    'total_triggered' => $metrics['total_triggered'],
                    'total_completed' => $metrics['total_completed'],
                    'total_pending' => $metrics['total_pending'],
                    'completion_rate' => $completionRate,
                    'average_rating' => $averageRating,
                    'unique_evaluators' => $metrics['evaluators']->unique()->count(),
                    'total_subordinates_evaluated' => $metrics['subordinates']->unique()->count(),
                    'average_response_time_days' => $averageResponseTime
                ];
            }
            
            // Sort by average rating descending
            usort($departmentReports, function($a, $b) {
                return $b['average_rating'] <=> $a['average_rating'];
            });
            
            return response()->json([
                'success' => true,
                'department_comparison' => $departmentReports
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to fetch department comparison: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch department comparison: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get trend data for charts
     */
    public function trends(Request $request)
    {
        try {
            $user = $request->user();
            
            $validated = $request->validate([
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
                'program_id' => 'nullable|uuid',
                'period' => 'nullable|string|in:day,week,month'
            ]);
            
            $dateFrom = $validated['date_from'];
            $dateTo = $validated['date_to'] . ' 23:59:59';
            $programId = $validated['program_id'] ?? $user->program_id;
            $period = $validated['period'] ?? 'week';
            
            $query = DB::table('evaluation_triggered as et')
                ->join('programs as p', 'et.program_id', '=', 'p.id')
                ->whereNull('et.deleted_at')
                ->whereNull('p.deleted_at')
                ->whereBetween('et.completed_at', [$dateFrom, $dateTo])
                ->where('et.status', 'completed');
            
            if ($programId && !in_array($user->role, ['super-admin', 'admin'])) {
                $query->where('et.program_id', $programId);
            } elseif ($programId) {
                $query->where('et.program_id', $programId);
            }
            
            $evaluations = $query->get();
            
            // Group by period
            $trendData = [];
            
            foreach ($evaluations as $eval) {
                $completedAt = Carbon::parse($eval->completed_at);
                
                $periodKey = match($period) {
                    'day' => $completedAt->format('Y-m-d'),
                    'week' => $completedAt->startOfWeek()->format('Y-m-d'),
                    'month' => $completedAt->format('Y-m'),
                    default => $completedAt->format('Y-m-d')
                };
                
                if (!isset($trendData[$periodKey])) {
                    $trendData[$periodKey] = [
                        'period' => $periodKey,
                        'completions' => 0,
                        'all_ratings' => []
                    ];
                }
                
                $trendData[$periodKey]['completions']++;
                
                // Process ratings
                $responses = json_decode($eval->responses, true) ?? [];
                foreach ($responses as $subResponses) {
                    if (isset($subResponses['responses']) && is_array($subResponses['responses'])) {
                        foreach ($subResponses['responses'] as $response) {
                            if (is_numeric($response)) {
                                $trendData[$periodKey]['all_ratings'][] = (float)$response;
                            }
                        }
                    }
                }
            }
            
            // Calculate averages
            $trends = [];
            foreach ($trendData as $periodKey => $data) {
                $averageRating = count($data['all_ratings']) > 0 
                    ? round(array_sum($data['all_ratings']) / count($data['all_ratings']), 2) 
                    : 0;
                
                $trends[] = [
                    'period' => $data['period'],
                    'completions' => $data['completions'],
                    'average_rating' => $averageRating
                ];
            }
            
            // Sort by period
            usort($trends, function($a, $b) {
                return strcmp($a['period'], $b['period']);
            });
            
            return response()->json([
                'success' => true,
                'trends' => $trends,
                'period_type' => $period
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to fetch trends: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch trends: ' . $e->getMessage()
            ], 500);
        }
    }
}
