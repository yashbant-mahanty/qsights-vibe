<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response as HttpResponse;
use Carbon\Carbon;

class ExportController extends Controller
{
    /**
     * Export activity results to CSV
     */
    public function exportActivityResults(Request $request, $activityId)
    {
        $activity = Activity::with(['questionnaire.sections.questions'])->findOrFail($activityId);
        
        $responses = Response::with(['participant', 'answers'])
            ->where('activity_id', $activityId)
            ->whereHas('participant', function($q) {
                $q->where('status', 'active')->whereNull('deleted_at');
            })
            ->get();
        
        $exportType = $request->query('type', 'overview'); // overview, detailed, notifications
        
        switch ($exportType) {
            case 'detailed':
                return $this->exportDetailedAnalysis($activity, $responses);
            case 'notifications':
                return $this->exportNotificationReport($activity);
            default:
                return $this->exportOverview($activity, $responses);
        }
    }
    
    /**
     * Export overview statistics
     */
    private function exportOverview($activity, $responses)
    {
        $filename = "activity-overview-{$activity->id}-" . now()->format('Y-m-d-His') . ".csv";
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];
        
        $callback = function() use ($activity, $responses) {
            $file = fopen('php://output', 'w');
            
            // Add BOM for UTF-8
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            
            // Header row
            fputcsv($file, [
                'Sl.No.',
                'Participant ID',
                'Participant Name',
                'Email',
                'Phone',
                'Type',
                'Status',
                'Completion %',
                'Started At',
                'Submitted At',
                'Time Taken (minutes)'
            ]);
            
            // Data rows
            foreach ($responses as $index => $response) {
                $participant = $response->participant;
                $timeTaken = '';
                
                if ($response->started_at && $response->submitted_at) {
                    $start = Carbon::parse($response->started_at);
                    $end = Carbon::parse($response->submitted_at);
                    $timeTaken = $start->diffInMinutes($end);
                }
                
                fputcsv($file, [
                    $index + 1,
                    $participant->participant_id ?? '',
                    $participant->name ?? 'Guest Anonymous',
                    $participant->email ?? '',
                    $participant->phone_number ?? '',
                    $participant->is_guest ? 'Guest' : 'Registered',
                    ucfirst($response->status),
                    $response->completion_percentage ?? 0,
                    $response->started_at ? Carbon::parse($response->started_at)->format('Y-m-d H:i:s') : '',
                    $response->submitted_at ? Carbon::parse($response->submitted_at)->format('Y-m-d H:i:s') : '',
                    $timeTaken
                ]);
            }
            
            fclose($file);
        };
        
        return HttpResponse::stream($callback, 200, $headers);
    }
    
    /**
     * Export detailed question-wise analysis
     */
    private function exportDetailedAnalysis($activity, $responses)
    {
        $filename = "activity-detailed-{$activity->id}-" . now()->format('Y-m-d-His') . ".csv";
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];
        
        $callback = function() use ($activity, $responses) {
            $file = fopen('php://output', 'w');
            
            // Add BOM for UTF-8
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            
            $questionnaire = $activity->questionnaire;
            
            if (!$questionnaire || !$questionnaire->sections) {
                fputcsv($file, ['No questionnaire data available']);
                fclose($file);
                return;
            }
            
            // Build header dynamically based on questions
            $headerRow = ['Sl.No.', 'Participant ID', 'Participant Name', 'Email', 'Status', 'Submitted At'];
            $questions = [];
            
            foreach ($questionnaire->sections as $section) {
                foreach ($section->questions as $question) {
                    $questions[] = $question;
                    $headerRow[] = "Q{$question->order}: {$question->text}";
                }
            }
            
            fputcsv($file, $headerRow);
            
            // Data rows
            foreach ($responses as $index => $response) {
                $participant = $response->participant;
                $row = [
                    $index + 1,
                    $participant->participant_id ?? '',
                    $participant->name ?? 'Guest Anonymous',
                    $participant->email ?? '',
                    ucfirst($response->status),
                    $response->submitted_at ? Carbon::parse($response->submitted_at)->format('Y-m-d H:i:s') : ''
                ];
                
                // Add answers for each question
                foreach ($questions as $question) {
                    $answer = $response->answers->firstWhere('question_id', $question->id);
                    
                    if ($answer && $answer->answer) {
                        if (is_array($answer->answer)) {
                            $row[] = implode(', ', $answer->answer);
                        } else {
                            $row[] = $answer->answer;
                        }
                    } else {
                        $row[] = '';
                    }
                }
                
                fputcsv($file, $row);
            }
            
            fclose($file);
        };
        
        return HttpResponse::stream($callback, 200, $headers);
    }
    
    /**
     * Export notification report
     */
    private function exportNotificationReport($activity)
    {
        $filename = "notification-report-{$activity->id}-" . now()->format('Y-m-d-His') . ".csv";
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];
        
        $callback = function() use ($activity) {
            $file = fopen('php://output', 'w');
            
            // Add BOM for UTF-8
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            
            // Header row
            fputcsv($file, [
                'Sl.No.',
                'Participant ID',
                'Name',
                'Email',
                'Phone',
                'Email Sent',
                'Email Delivered',
                'Email Opened',
                'Email Clicked',
                'Email Bounced',
                'SMS Sent',
                'SMS Delivered',
                'SMS Failed',
                'Last Notification Sent'
            ]);
            
            // Get participants with notifications
            $participants = $activity->participants()
                ->where('status', 'active')
                ->whereNull('deleted_at')
                ->with(['notifications' => function($query) {
                    $query->whereNull('deleted_at')->orderBy('sent_at', 'desc');
                }])
                ->get();
            
            // Data rows
            foreach ($participants as $index => $participant) {
                $emailSent = false;
                $emailDelivered = false;
                $emailOpened = false;
                $emailClicked = false;
                $emailBounced = false;
                $smsSent = false;
                $smsDelivered = false;
                $smsFailed = false;
                $lastNotification = '';
                
                foreach ($participant->notifications as $notification) {
                    if ($notification->type === 'email') {
                        $emailSent = true;
                        
                        $metadata = $notification->metadata ?? [];
                        if (isset($metadata['sendgrid_events'])) {
                            foreach ($metadata['sendgrid_events'] as $event) {
                                if ($event === 'delivered') $emailDelivered = true;
                                if ($event === 'open') $emailOpened = true;
                                if ($event === 'click') $emailClicked = true;
                                if ($event === 'bounce') $emailBounced = true;
                            }
                        } else if ($notification->status === 'sent') {
                            $emailDelivered = true;
                        }
                    } else if ($notification->type === 'sms') {
                        $smsSent = true;
                        if ($notification->status === 'sent') $smsDelivered = true;
                        if ($notification->status === 'failed') $smsFailed = true;
                    }
                    
                    if (empty($lastNotification) && $notification->sent_at) {
                        $lastNotification = Carbon::parse($notification->sent_at)->format('Y-m-d H:i:s');
                    }
                }
                
                fputcsv($file, [
                    $index + 1,
                    $participant->participant_id,
                    $participant->name,
                    $participant->email,
                    $participant->phone_number ?? '',
                    $emailSent ? 'Yes' : 'No',
                    $emailDelivered ? 'Yes' : 'No',
                    $emailOpened ? 'Yes' : 'No',
                    $emailClicked ? 'Yes' : 'No',
                    $emailBounced ? 'Yes' : 'No',
                    $smsSent ? 'Yes' : 'No',
                    $smsDelivered ? 'Yes' : 'No',
                    $smsFailed ? 'Yes' : 'No',
                    $lastNotification
                ]);
            }
            
            fclose($file);
        };
        
        return HttpResponse::stream($callback, 200, $headers);
    }
}
