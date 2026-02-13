<?php

namespace App\Http\Controllers;

use App\Models\VideoUpload;
use App\Models\VideoWatchTracking;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Storage;
use DB;

class VideoUploadController extends Controller
{
    public function trackVideoQuestionProgress(Request $request)
    {
        try {
            $questionId = $request->input('question_id');
            $participantId = $request->input('participant_id');
            $activityId = $request->input('activity_id');
            $watchTimeSeconds = $request->input('watch_time_seconds', 0);
            $completedWatch = $request->input('completed_watch', false);
            $totalPlays = $request->input('total_plays', 1);
            $totalPauses = $request->input('total_pauses', 0);
            $totalSeeks = $request->input('total_seeks', 0);

            if (!$questionId || !$activityId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Question ID and activity ID are required'
                ], 400);
            }

            // Find or create a response for this participant and activity
            $responseId = null;
            if ($participantId) {
                $response = DB::table('responses')
                    ->where('participant_id', $participantId)
                    ->where('activity_id', $activityId)
                    ->first();

                if ($response) {
                    $responseId = $response->id;
                } else {
                    // Create a new response for video tracking
                    $questionnaire = DB::table('questionnaires')
                        ->join('activities', 'questionnaires.id', '=', 'activities.questionnaire_id')
                        ->where('activities.id', $activityId)
                        ->first();

                    if ($questionnaire) {
                        $responseId = DB::table('responses')->insertGetId([
                            'activity_id' => $activityId,
                            'participant_id' => $participantId,
                            'questionnaire_id' => $questionnaire->questionnaire_id,
                            'status' => 'in_progress',
                            'started_at' => now(),
                            'answers' => '[]',
                            'is_preview' => false,
                            'attempt_number' => 1,
                            'total_questions' => 0,
                            'answered_questions' => 0,
                            'completion_percentage' => 0,
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);
                    }
                }
            }

            // If we still don't have a response_id, create a minimal tracking entry
            if (!$responseId) {
                $responseId = DB::table('responses')->insertGetId([
                    'activity_id' => $activityId,
                    'questionnaire_id' => null,
                    'status' => 'in_progress',
                    'started_at' => now(),
                    'answers' => '[]',
                    'is_preview' => false,
                    'attempt_number' => 1,
                    'total_questions' => 0,
                    'answered_questions' => 0,
                    'completion_percentage' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                    'guest_identifier' => 'video_tracker_' . Str::random(10)
                ]);
            }

            // Get existing tracking to preserve max_watch_position
            $existingTracking = VideoWatchTracking::where([
                'response_id' => $responseId,
                'activity_id' => $activityId,
                'question_id' => $questionId
            ])->first();

            $maxWatchPosition = $watchTimeSeconds;
            if ($existingTracking && $existingTracking->max_watch_position > $watchTimeSeconds) {
                $maxWatchPosition = $existingTracking->max_watch_position;
            }

            // Now create or update the video watch tracking with the response_id
            $tracking = VideoWatchTracking::updateOrCreate(
                [
                    'response_id' => $responseId,
                    'activity_id' => $activityId,
                    'question_id' => $questionId
                ],
                [
                    'participant_id' => $participantId,
                    'watch_time_seconds' => $watchTimeSeconds,
                    'max_watch_position' => $maxWatchPosition,
                    'completed' => $completedWatch,
                    'play_count' => $totalPlays,
                    'pause_count' => $totalPauses,
                    'seek_count' => $totalSeeks,
                    'updated_at' => now()
                ]
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Video watch progress tracked successfully',
                'data' => [
                    'tracking_id' => $tracking->id,
                    'response_id' => $responseId,
                    'watch_time_seconds' => $tracking->watch_time_seconds,
                    'max_watch_position' => $tracking->max_watch_position,
                    'completed' => $tracking->completed,
                    'play_count' => $tracking->play_count,
                    'pause_count' => $tracking->pause_count,
                    'seek_count' => $tracking->seek_count
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to track watch progress: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getVideoQuestionProgress(Request $request)
    {
        try {
            $questionId = $request->input('question_id');
            $participantId = $request->input('participant_id');
            $activityId = $request->input('activity_id');

            if (!$questionId || !$activityId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Question ID and activity ID are required'
                ], 400);
            }

            $tracking = VideoWatchTracking::where('question_id', $questionId)
                ->where('activity_id', $activityId);

            if ($participantId) {
                $tracking = $tracking->where('participant_id', $participantId);
            }

            $tracking = $tracking->first();

            if (!$tracking) {
                return response()->json([
                    'status' => 'success',
                    'data' => [
                        'watch_time_seconds' => 0,
                        'max_watch_position' => 0,
                        'completed' => false,
                        'play_count' => 0,
                        'pause_count' => 0,
                        'seek_count' => 0
                    ]
                ]);
            }

            return response()->json([
                'status' => 'success',
                'data' => [
                    'watch_time_seconds' => $tracking->watch_time_seconds,
                    'max_watch_position' => $tracking->max_watch_position,
                    'completed' => $tracking->completed,
                    'play_count' => $tracking->play_count,
                    'pause_count' => $tracking->pause_count,
                    'seek_count' => $tracking->seek_count,
                    'last_updated' => $tracking->updated_at
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to get watch progress: ' . $e->getMessage()
            ], 500);
        }
    }
}