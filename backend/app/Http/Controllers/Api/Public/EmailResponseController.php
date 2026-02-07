<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Response;
use App\Models\Answer;
use App\Models\Participant;
use App\Services\EmailResponseTokenService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class EmailResponseController extends Controller
{
    private EmailResponseTokenService $tokenService;

    public function __construct(EmailResponseTokenService $tokenService)
    {
        $this->tokenService = $tokenService;
    }

    /**
     * Submit response via email link (GET request for email client compatibility)
     * 
     * URL: /api/public/email-response?token={signed_token}
     */
    public function submit(Request $request)
    {
        $token = $request->query('token');

        if (!$token) {
            return $this->redirectToError('Missing token');
        }

        // Verify and decode token
        $payload = $this->tokenService->verifyToken($token);

        if (!$payload) {
            return $this->redirectToError('Invalid or expired link');
        }

        // Extract data from token
        $activityId = $payload['activity_id'];
        $questionId = $payload['question_id'];
        $email = $payload['email'];
        $answer = $payload['answer'];

        try {
            // Load activity
            $activity = Activity::with('questionnaire.sections.questions')->findOrFail($activityId);

            // Check if activity accepts responses
            if (!$activity->canAcceptResponses()) {
                return $this->redirectToError('This survey is no longer accepting responses');
            }

            // Check if user already responded
            $existingResponse = Response::where('activity_id', $activityId)
                ->where('guest_identifier', $email)
                ->where('status', 'submitted')
                ->first();

            if ($existingResponse) {
                return $this->redirectToThankYou([
                    'already_submitted' => true,
                    'message' => 'You have already submitted your response for this survey.'
                ]);
            }

            // Create or update response
            DB::beginTransaction();
            try {
                // Find or create participant
                $participant = Participant::firstOrCreate(
                    ['email' => $email],
                    [
                        'id' => Str::uuid(),
                        'name' => 'Anonymous',
                        'is_guest' => true,
                        'status' => 'active',
                        'participant_type' => 'anonymous'
                    ]
                );

                // Create response
                $response = Response::create([
                    'id' => Str::uuid(),
                    'activity_id' => $activityId,
                    'participant_id' => $participant->id,
                    'guest_identifier' => $email,
                    'status' => 'submitted',
                    'total_questions' => 1, // Single question per email
                    'started_at' => Carbon::now(),
                    'submitted_at' => Carbon::now(),
                    'completion_percentage' => 100,
                    'is_preview' => false,
                ]);

                // Save answer
                Answer::create([
                    'id' => Str::uuid(),
                    'response_id' => $response->id,
                    'question_id' => $questionId,
                    'value' => $answer,
                    'value_array' => null,
                    'time_spent' => 0,
                ]);

                DB::commit();

                return $this->redirectToThankYou([
                    'success' => true,
                    'activity_name' => $activity->name,
                    'message' => 'Thank you for your response!'
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            \Log::error('Email response submission failed', [
                'error' => $e->getMessage(),
                'token_payload' => $payload ?? null
            ]);

            return $this->redirectToError('Failed to submit response. Please try again.');
        }
    }

    /**
     * Redirect to thank you page with success message
     */
    private function redirectToThankYou(array $data)
    {
        $queryString = http_build_query($data);
        return redirect()->to("/e/thank-you?{$queryString}");
    }

    /**
     * Redirect to error page
     */
    private function redirectToError(string $message)
    {
        return redirect()->to("/e/error?message=" . urlencode($message));
    }
}
