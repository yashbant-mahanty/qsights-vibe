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
     * Get all custom questionnaires for the user's organization or program.
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Filter by program_id for evaluation-admin, by organization for others
            $query = EvaluationCustomQuestionnaire::where('is_active', true);
            
            if ($user->role === 'evaluation-admin') {
                // Evaluation admin only sees questionnaires for their program
                if ($user->program_id) {
                    $query->where('program_id', $user->program_id);
                } else {
                    // If no program_id, return empty
                    return response()->json([
                        'success' => true,
                        'data' => []
                    ]);
                }
            } elseif ($user->role !== 'super-admin' && $user->organization_id) {
                // Other roles see their organization's questionnaires
                $query->where('organization_id', $user->organization_id);
            }
            
            $customQuestionnaires = $query->orderBy('created_at', 'desc')->get();

            // Fetch full questionnaire data for each
            $result = [];
            foreach ($customQuestionnaires as $cq) {
                // Load questionnaire with sections and questions using Eloquent relationships
                $questionnaire = Questionnaire::with(['sections.questions'])->find($cq->questionnaire_id);
                if ($questionnaire) {
                    // Extract questions from sections
                    $questions = [];
                    $sectionsData = [];
                    
                    // Convert sections to array with questions
                    foreach ($questionnaire->sections as $section) {
                        $sectionQuestions = [];
                        foreach ($section->questions as $question) {
                            $questionData = [
                                'id' => $question->id,
                                'type' => $question->type,
                                'title' => $question->title,
                                'description' => $question->description,
                                'is_required' => $question->is_required,
                                'options' => $question->options,
                                'validation_rules' => $question->validation_rules,
                                'conditional_logic' => $question->conditional_logic,
                                'order' => $question->order,
                            ];
                            $sectionQuestions[] = $questionData;
                            $questions[] = $questionData;
                        }
                        
                        $sectionsData[] = [
                            'id' => $section->id,
                            'questionnaire_id' => $section->questionnaire_id,
                            'title' => $section->title,
                            'description' => $section->description,
                            'order' => $section->order,
                            'created_at' => $section->created_at,
                            'updated_at' => $section->updated_at,
                            'deleted_at' => $section->deleted_at,
                            'conditional_logic' => $section->conditional_logic,
                            'translations' => $section->translations,
                            'questions' => $sectionQuestions,
                        ];
                    }

                    $result[] = [
                        'id' => $cq->questionnaire_id,
                        'name' => $cq->questionnaire_name,
                        'status' => $questionnaire->status,
                        'data' => [
                            'questions' => $questions,
                            'sections' => $sectionsData,
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
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $request->validate([
                'questionnaire_id' => 'required|integer',
                'questionnaire_name' => 'required|string|max:255',
                'organization_id' => 'nullable|integer',
                'program_id' => 'nullable|uuid',
            ]);

            // Determine organization_id and program_id based on user role
            $organizationId = null;
            $programId = null;
            
            if ($user->role === 'evaluation-admin') {
                // Evaluation admin: use their program_id
                $programId = $user->program_id;
                $organizationId = $user->organization_id; // Still track org if available
            } elseif ($user->role === 'super-admin') {
                // Super admin can specify both
                $organizationId = $request->organization_id;
                $programId = $request->program_id;
            } else {
                // Other roles: use their organization
                $organizationId = $user->organization_id;
                $programId = $request->program_id; // Allow specifying program
            }

            // Check if questionnaire exists
            $questionnaire = Questionnaire::find($request->questionnaire_id);
            if (!$questionnaire) {
                return response()->json([
                    'success' => false,
                    'message' => 'Questionnaire not found'
                ], 404);
            }

            // Check if already added (check both org and program if applicable)
            $existingQuery = EvaluationCustomQuestionnaire::where('questionnaire_id', $request->questionnaire_id)
                ->where('is_active', true);
            
            if ($programId) {
                $existingQuery->where('program_id', $programId);
            } else {
                $existingQuery->where('organization_id', $organizationId);
            }
            
            $existing = $existingQuery->first();

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
                'organization_id' => $organizationId,
                'program_id' => $programId,
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
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Super-admin can specify organization_id in query params, others use their own
            $organizationId = $user->role === 'super-admin' && $request->has('organization_id') 
                ? $request->query('organization_id') 
                : $user->organization_id;
            
            if (!$organizationId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Organization ID is required'
                ], 400);
            }

            $customQuestionnaire = EvaluationCustomQuestionnaire::where('organization_id', $organizationId)
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
