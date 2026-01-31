<?php

namespace App\Http\Controllers;

use App\Models\EvaluationCustomQuestionnaire;
use App\Models\Questionnaire;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class EvaluationCustomQuestionnaireController extends Controller
{
    /**
     * Get all custom questionnaires for the user's organization.
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated or organization not found'
                ], 401);
            }

            $customQuestionnaires = EvaluationCustomQuestionnaire::where('organization_id', $user->organization_id)
                ->where('is_active', true)
                ->orderBy('created_at', 'desc')
                ->get();

            // Fetch full questionnaire data for each
            $result = [];
            foreach ($customQuestionnaires as $cq) {
                $questionnaire = Questionnaire::find($cq->questionnaire_id);
                if ($questionnaire) {
                    // Extract questions from sections
                    $questions = [];
                    $sections = is_string($questionnaire->sections) 
                        ? json_decode($questionnaire->sections, true) 
                        : ($questionnaire->sections ?? []);
                    
                    if (is_array($sections)) {
                        foreach ($sections as $section) {
                            if (isset($section['questions']) && is_array($section['questions'])) {
                                foreach ($section['questions'] as $q) {
                                    $questions[] = $q;
                                }
                            }
                        }
                    }

                    $result[] = [
                        'id' => $cq->questionnaire_id,
                        'name' => $cq->questionnaire_name,
                        'status' => $questionnaire->status,
                        'data' => [
                            'questions' => $questions,
                            'sections' => $sections,
                        ],
                        'added_at' => $cq->created_at,
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'data' => $result
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching custom evaluation questionnaires: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch custom questionnaires',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add a questionnaire to the evaluation custom list.
     */
    public function store(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated or organization not found'
                ], 401);
            }

            $request->validate([
                'questionnaire_id' => 'required|uuid',
                'questionnaire_name' => 'required|string|max:255',
            ]);

            // Check if questionnaire exists
            $questionnaire = Questionnaire::find($request->questionnaire_id);
            if (!$questionnaire) {
                return response()->json([
                    'success' => false,
                    'message' => 'Questionnaire not found'
                ], 404);
            }

            // Check if already added
            $existing = EvaluationCustomQuestionnaire::where('organization_id', $user->organization_id)
                ->where('questionnaire_id', $request->questionnaire_id)
                ->where('is_active', true)
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => true,
                    'message' => 'Questionnaire already added',
                    'data' => [
                        'id' => $questionnaire->id,
                        'name' => $existing->questionnaire_name,
                        'status' => $questionnaire->status,
                    ]
                ]);
            }

            // Create new entry
            $customQuestionnaire = EvaluationCustomQuestionnaire::create([
                'organization_id' => $user->organization_id,
                'questionnaire_id' => $request->questionnaire_id,
                'questionnaire_name' => $request->questionnaire_name,
                'added_by' => $user->id,
                'is_active' => true,
            ]);

            // Extract questions from sections
            $questions = [];
            $sections = is_string($questionnaire->sections) 
                ? json_decode($questionnaire->sections, true) 
                : ($questionnaire->sections ?? []);
            
            if (is_array($sections)) {
                foreach ($sections as $section) {
                    if (isset($section['questions']) && is_array($section['questions'])) {
                        foreach ($section['questions'] as $q) {
                            $questions[] = $q;
                        }
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Questionnaire added successfully',
                'data' => [
                    'id' => $questionnaire->id,
                    'name' => $customQuestionnaire->questionnaire_name,
                    'status' => $questionnaire->status,
                    'data' => [
                        'questions' => $questions,
                        'sections' => $sections,
                    ],
                ]
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error adding custom evaluation questionnaire: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to add questionnaire',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove a questionnaire from the evaluation custom list.
     */
    public function destroy(Request $request, $questionnaireId)
    {
        try {
            $user = Auth::user();
            
            if (!$user || !$user->organization_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated or organization not found'
                ], 401);
            }

            $customQuestionnaire = EvaluationCustomQuestionnaire::where('organization_id', $user->organization_id)
                ->where('questionnaire_id', $questionnaireId)
                ->where('is_active', true)
                ->first();

            if (!$customQuestionnaire) {
                return response()->json([
                    'success' => false,
                    'message' => 'Custom questionnaire not found'
                ], 404);
            }

            // Soft delete by setting is_active to false
            $customQuestionnaire->update(['is_active' => false]);

            return response()->json([
                'success' => true,
                'message' => 'Questionnaire removed successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Error removing custom evaluation questionnaire: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove questionnaire',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
