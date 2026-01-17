<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Response;
use App\Models\Program;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;

class ExportService
{
    /**
     * Export activity responses to CSV
     */
    public function exportToCSV(string $activityId)
    {
        $activity = Activity::with(['questionnaire.sections.questions'])->findOrFail($activityId);
        $responses = Response::with(['participant', 'answers.question'])
            ->where('activity_id', $activityId)
            ->get();

        $filename = 'activity_' . $activityId . '_responses_' . now()->format('Y-m-d_His') . '.csv';
        $filepath = storage_path('app/exports/' . $filename);

        // Ensure directory exists
        if (!file_exists(storage_path('app/exports'))) {
            mkdir(storage_path('app/exports'), 0755, true);
        }

        $file = fopen($filepath, 'w');

        // Collect all questions
        $questions = $activity->questionnaire->sections
            ->flatMap(fn($section) => $section->questions)
            ->sortBy('order');

        // Build header
        $header = [
            'Response ID',
            'Participant Email',
            'Participant Name',
            'Status',
            'Completion %',
            'Submitted At',
            'Created At',
        ];

        foreach ($questions as $question) {
            $header[] = $question->title;
        }

        fputcsv($file, $header);

        // Build rows
        foreach ($responses as $response) {
            $row = [
                $response->id,
                $response->participant->email ?? 'Guest',
                $response->participant->name ?? 'Guest',
                $response->status,
                $response->completion_percentage,
                $response->submitted_at,
                $response->created_at,
            ];

            // Map answers to questions
            $answerMap = $response->answers->keyBy('question_id');

            foreach ($questions as $question) {
                $answer = $answerMap->get($question->id);
                if ($answer) {
                    if ($answer->value_array) {
                        $row[] = implode(', ', json_decode($answer->value_array, true));
                    } elseif ($answer->value_text) {
                        $row[] = $answer->value_text;
                    } else {
                        $row[] = $answer->value;
                    }
                } else {
                    $row[] = '';
                }
            }

            fputcsv($file, $row);
        }

        fclose($file);

        return $filepath;
    }

    /**
     * Export activity responses to Excel
     */
    public function exportToExcel(string $activityId)
    {
        $activity = Activity::with(['questionnaire.sections.questions'])->findOrFail($activityId);
        $responses = Response::with(['participant', 'answers.question'])
            ->where('activity_id', $activityId)
            ->get();

        $filename = 'activity_' . $activityId . '_responses_' . now()->format('Y-m-d_His') . '.xlsx';

        // Collect all questions
        $questions = $activity->questionnaire->sections
            ->flatMap(fn($section) => $section->questions)
            ->sortBy('order');

        // Build data array
        $data = [];

        // Header row
        $header = [
            'Response ID',
            'Participant Email',
            'Participant Name',
            'Status',
            'Completion %',
            'Submitted At',
            'Created At',
        ];

        foreach ($questions as $question) {
            $header[] = $question->title;
        }

        $data[] = $header;

        // Data rows
        foreach ($responses as $response) {
            $row = [
                $response->id,
                $response->participant->email ?? 'Guest',
                $response->participant->name ?? 'Guest',
                $response->status,
                $response->completion_percentage,
                $response->submitted_at,
                $response->created_at,
            ];

            // Map answers to questions
            $answerMap = $response->answers->keyBy('question_id');

            foreach ($questions as $question) {
                $answer = $answerMap->get($question->id);
                if ($answer) {
                    if ($answer->value_array) {
                        $row[] = implode(', ', json_decode($answer->value_array, true));
                    } elseif ($answer->value_text) {
                        $row[] = $answer->value_text;
                    } else {
                        $row[] = $answer->value;
                    }
                } else {
                    $row[] = '';
                }
            }

            $data[] = $row;
        }

        // Create Excel using simple array export
        return Excel::store(new \App\Exports\ArrayExport($data), 'exports/' . $filename, 'local')
            ? storage_path('app/exports/' . $filename)
            : null;
    }

    /**
     * Export activity analytics to PDF
     */
    public function exportToPDF(string $activityId)
    {
        $activity = Activity::with('program')->findOrFail($activityId);

        // Gather analytics data
        $totalResponses = Response::where('activity_id', $activityId)->count();
        $submittedResponses = Response::where('activity_id', $activityId)->submitted()->count();
        $inProgressResponses = Response::where('activity_id', $activityId)->inProgress()->count();

        $totalParticipants = $activity->program->participants()->where('status', 'active')->count();
        $participationRate = $totalParticipants > 0 
            ? round(($totalResponses / $totalParticipants) * 100, 2) 
            : 0;
        
        $completionRate = $totalResponses > 0 
            ? round(($submittedResponses / $totalResponses) * 100, 2) 
            : 0;

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
            ->mapWithKeys(fn($item) => [$item->range => $item->count])
            ->toArray();

        // Question-level completion
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
                DB::raw('COUNT(DISTINCT answers.id) as answer_count')
            )
            ->groupBy('questions.id', 'questions.title', 'questions.type')
            ->get()
            ->map(function($q) use ($totalResponses) {
                return [
                    'title' => $q->title,
                    'type' => $q->type,
                    'answer_count' => $q->answer_count,
                    'completion_rate' => $totalResponses > 0 ? round(($q->answer_count / $totalResponses) * 100, 2) : 0,
                ];
            });

        $data = [
            'activity' => $activity,
            'totalResponses' => $totalResponses,
            'submittedResponses' => $submittedResponses,
            'inProgressResponses' => $inProgressResponses,
            'totalParticipants' => $totalParticipants,
            'participationRate' => $participationRate,
            'completionRate' => $completionRate,
            'completionDistribution' => $completionDistribution,
            'questionCompletion' => $questionCompletion,
            'generatedAt' => now()->format('Y-m-d H:i:s'),
        ];

        $pdf = Pdf::loadView('reports.activity-analytics', $data);
        
        $filename = 'activity_' . $activityId . '_analytics_' . now()->format('Y-m-d_His') . '.pdf';
        $filepath = storage_path('app/exports/' . $filename);

        // Ensure directory exists
        if (!file_exists(storage_path('app/exports'))) {
            mkdir(storage_path('app/exports'), 0755, true);
        }

        $pdf->save($filepath);

        return $filepath;
    }

    /**
     * Export program overview to PDF
     */
    public function exportProgramOverviewPDF(string $programId)
    {
        $program = Program::with('activities')->findOrFail($programId);
        
        $totalActivities = $program->activities()->count();
        $liveActivities = $program->activities()->where('status', 'live')->count();
        $totalParticipants = $program->participants()->where('status', 'active')->count();
        
        $activityStats = $program->activities()
            ->get()
            ->map(function($activity) {
                $responseCount = Response::where('activity_id', $activity->id)->count();
                $submittedCount = Response::where('activity_id', $activity->id)->submitted()->count();
                
                return [
                    'activity_name' => $activity->name,
                    'status' => $activity->status,
                    'start_date' => $activity->start_date,
                    'response_count' => $responseCount,
                    'submitted_count' => $submittedCount,
                    'completion_rate' => $responseCount > 0 ? round(($submittedCount / $responseCount) * 100, 2) : 0,
                ];
            });

        $data = [
            'program' => $program,
            'totalActivities' => $totalActivities,
            'liveActivities' => $liveActivities,
            'totalParticipants' => $totalParticipants,
            'activityStats' => $activityStats,
            'generatedAt' => now()->format('Y-m-d H:i:s'),
        ];

        $pdf = Pdf::loadView('reports.program-overview', $data);
        
        $filename = 'program_' . $programId . '_overview_' . now()->format('Y-m-d_His') . '.pdf';
        $filepath = storage_path('app/exports/' . $filename);

        // Ensure directory exists
        if (!file_exists(storage_path('app/exports'))) {
            mkdir(storage_path('app/exports'), 0755, true);
        }

        $pdf->save($filepath);

        return $filepath;
    }
}
