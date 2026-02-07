<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvaluationEvent;
use App\Models\EvaluationAssignment;
use App\Models\EvaluationResponse;
use App\Models\User;
use App\Models\Participant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class EvaluationReportController extends Controller
{
    /**
     * Get overall summary for an evaluation event
     * Admin/Creator can see full summary
     */
    public function getSummary(Request $request, string $id)
    {
        $event = EvaluationEvent::with(['questionnaire.sections.questions'])
            ->withCount(['assignments', 'responses'])
            ->findOrFail($id);

        // Get completion stats
        $assignments = EvaluationAssignment::where('evaluation_event_id', $id)->get();
        
        $stats = [
            'total_assignments' => $assignments->count(),
            'pending' => $assignments->where('status', 'pending')->count(),
            'in_progress' => $assignments->where('status', 'in_progress')->count(),
            'completed' => $assignments->where('status', 'completed')->count(),
            'completion_rate' => $assignments->count() > 0 
                ? round(($assignments->where('status', 'completed')->count() / $assignments->count()) * 100, 1)
                : 0,
        ];

        // Get question-wise average scores
        $questionStats = $this->getQuestionStats($id);

        return response()->json([
            'event' => [
                'id' => $event->id,
                'name' => $event->name,
                'status' => $event->status,
                'start_date' => $event->start_date,
                'end_date' => $event->end_date,
                'is_anonymous' => $event->is_anonymous,
            ],
            'completion_stats' => $stats,
            'question_stats' => $questionStats,
        ]);
    }

    /**
     * Get report by evaluatee
     * Shows individual evaluation results (respecting anonymity settings)
     */
    public function getByEvaluatee(Request $request, string $id)
    {
        $event = EvaluationEvent::findOrFail($id);
        $currentUser = Auth::user();

        // Get assignments grouped by evaluatee
        $query = EvaluationAssignment::with(['evaluateeUser', 'evaluateeParticipant', 'responses'])
            ->where('evaluation_event_id', $id)
            ->where('status', 'completed');

        // If not admin/creator, limit to user's hierarchy
        if ($currentUser->id !== $event->created_by && !in_array($currentUser->role, ['super-admin', 'admin'])) {
            $query->where('triggered_by', $currentUser->id);
        }

        $assignments = $query->get();

        $evaluateeReports = $assignments->groupBy(function ($assignment) {
            return $assignment->evaluatee_type . '_' . $assignment->evaluatee_id;
        })->map(function ($group) use ($event) {
            $first = $group->first();
            $evaluatee = $first->evaluatee_type === 'user' 
                ? $first->evaluateeUser 
                : $first->evaluateeParticipant;

            // Get all responses for this evaluatee
            $responses = EvaluationResponse::whereIn('evaluation_assignment_id', $group->pluck('id'))
                ->get();

            // Calculate average scores by question
            $questionScores = $responses->groupBy('question_id')->map(function ($questionResponses) {
                $scores = $questionResponses->whereNotNull('score')->pluck('score');
                return [
                    'average_score' => $scores->count() > 0 ? round($scores->avg(), 2) : null,
                    'response_count' => $questionResponses->count(),
                    'responses' => $questionResponses->pluck('answer'),
                ];
            });

            return [
                'evaluatee_id' => $first->evaluatee_id,
                'evaluatee_type' => $first->evaluatee_type,
                'evaluatee_name' => $evaluatee ? $evaluatee->name : 'Unknown',
                'evaluatee_email' => $evaluatee ? $evaluatee->email : null,
                'completed_evaluations' => $group->count(),
                'question_scores' => $questionScores,
                'overall_average' => $responses->whereNotNull('score')->avg('score'),
            ];
        })->values();

        return response()->json([
            'event' => [
                'id' => $event->id,
                'name' => $event->name,
                'is_anonymous' => $event->is_anonymous,
                'show_individual_responses' => $event->show_individual_responses,
            ],
            'evaluatee_reports' => $evaluateeReports,
        ]);
    }

    /**
     * Get completion status report
     */
    public function getCompletionStatus(Request $request, string $id)
    {
        $event = EvaluationEvent::findOrFail($id);
        $currentUser = Auth::user();

        $query = EvaluationAssignment::with(['evaluateeUser', 'evaluateeParticipant', 'triggeredBy'])
            ->where('evaluation_event_id', $id);

        // If not admin/creator, limit to user's triggered assignments
        if ($currentUser->id !== $event->created_by && !in_array($currentUser->role, ['super-admin', 'admin'])) {
            $query->where('triggered_by', $currentUser->id);
        }

        $assignments = $query->orderBy('status')->orderBy('sent_at', 'desc')->get();

        $data = $assignments->map(function ($assignment) use ($event) {
            $evaluatee = $assignment->evaluatee_type === 'user' 
                ? $assignment->evaluateeUser 
                : $assignment->evaluateeParticipant;

            return [
                'id' => $assignment->id,
                'evaluatee_name' => $evaluatee ? $evaluatee->name : 'Unknown',
                'evaluatee_email' => $evaluatee ? $evaluatee->email : null,
                'evaluatee_type' => $assignment->evaluatee_type,
                'triggered_by' => $assignment->triggeredBy ? $assignment->triggeredBy->name : null,
                'status' => $assignment->status,
                'sent_at' => $assignment->sent_at,
                'completed_at' => $assignment->completed_at,
                'reminder_count' => $assignment->reminder_count,
            ];
        });

        $stats = [
            'total' => $data->count(),
            'pending' => $data->where('status', 'pending')->count(),
            'in_progress' => $data->where('status', 'in_progress')->count(),
            'completed' => $data->where('status', 'completed')->count(),
        ];

        return response()->json([
            'event' => [
                'id' => $event->id,
                'name' => $event->name,
            ],
            'assignments' => $data,
            'stats' => $stats,
        ]);
    }

    /**
     * Get team report for a manager
     * Shows aggregated results for the manager's direct reports
     */
    public function getMyTeamReport(Request $request, string $id)
    {
        $event = EvaluationEvent::findOrFail($id);
        $currentUser = Auth::user();

        // Get assignments triggered by current user
        $assignments = EvaluationAssignment::with(['evaluateeUser', 'evaluateeParticipant', 'responses.question'])
            ->where('evaluation_event_id', $id)
            ->where('triggered_by', $currentUser->id)
            ->where('status', 'completed')
            ->get();

        if ($assignments->isEmpty()) {
            return response()->json([
                'message' => 'No completed evaluations found for your team',
                'data' => [],
            ]);
        }

        // Calculate team averages
        $allResponses = EvaluationResponse::whereIn('evaluation_assignment_id', $assignments->pluck('id'))
            ->with('question')
            ->get();

        $teamAverageByQuestion = $allResponses->groupBy('question_id')->map(function ($responses) {
            $question = $responses->first()->question;
            $scores = $responses->whereNotNull('score');
            
            return [
                'question_id' => $question->id,
                'question_title' => $question->title,
                'question_type' => $question->type,
                'average_score' => $scores->count() > 0 ? round($scores->avg('score'), 2) : null,
                'response_count' => $responses->count(),
                'score_distribution' => $scores->groupBy('score')->map->count(),
            ];
        })->values();

        // Individual team member scores
        $memberScores = $assignments->map(function ($assignment) use ($event) {
            $evaluatee = $assignment->evaluatee_type === 'user' 
                ? $assignment->evaluateeUser 
                : $assignment->evaluateeParticipant;

            $responses = $assignment->responses;
            $avgScore = $responses->whereNotNull('score')->avg('score');

            return [
                'evaluatee_id' => $assignment->evaluatee_id,
                'evaluatee_name' => $event->is_anonymous && !$event->show_individual_responses 
                    ? 'Anonymous' 
                    : ($evaluatee ? $evaluatee->name : 'Unknown'),
                'average_score' => $avgScore ? round($avgScore, 2) : null,
                'completed_at' => $assignment->completed_at,
            ];
        });

        $overallTeamAverage = $allResponses->whereNotNull('score')->avg('score');

        return response()->json([
            'event' => [
                'id' => $event->id,
                'name' => $event->name,
                'is_anonymous' => $event->is_anonymous,
            ],
            'team_summary' => [
                'total_evaluations' => $assignments->count(),
                'overall_average' => $overallTeamAverage ? round($overallTeamAverage, 2) : null,
            ],
            'question_averages' => $teamAverageByQuestion,
            'member_scores' => $memberScores,
        ]);
    }

    /**
     * Export evaluation report
     */
    public function exportReport(Request $request, string $id)
    {
        $event = EvaluationEvent::with(['questionnaire.sections.questions'])
            ->findOrFail($id);

        // TODO: Implement Excel/PDF export
        return response()->json([
            'message' => 'Export functionality coming soon',
        ]);
    }

    /**
     * Helper: Get question-wise statistics
     */
    private function getQuestionStats(string $eventId)
    {
        $responses = EvaluationResponse::where('evaluation_event_id', $eventId)
            ->with('question')
            ->get();

        return $responses->groupBy('question_id')->map(function ($questionResponses) {
            $question = $questionResponses->first()->question;
            $scores = $questionResponses->whereNotNull('score');

            return [
                'question_id' => $question ? $question->id : null,
                'question_title' => $question ? $question->title : 'Unknown',
                'question_type' => $question ? $question->type : null,
                'total_responses' => $questionResponses->count(),
                'average_score' => $scores->count() > 0 ? round($scores->avg('score'), 2) : null,
                'min_score' => $scores->count() > 0 ? $scores->min('score') : null,
                'max_score' => $scores->count() > 0 ? $scores->max('score') : null,
            ];
        })->values();
    }
}
