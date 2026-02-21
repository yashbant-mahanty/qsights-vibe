<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Questionnaire;
use App\Models\Section;
use App\Models\Question;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class QuestionnaireController extends Controller
{
    /**
     * Display a listing of questionnaires
     */
    public function index(Request $request)
    {
        // Auto-filter by program_id for program-scoped roles
        $user = $request->user();
        if ($user && in_array($user->role, ['program-admin', 'program-manager', 'program-moderator', 'evaluation-admin']) && $user->program_id) {
            // Force filter to user's program for these roles
            $request->merge(['program_id' => $user->program_id]);
        }
        
        $query = Questionnaire::with(['program', 'sections.questions'])->withCount([
            'responses' => function($query) {
                $query->whereHas('participant', function($q) {
                    $q->where('status', 'active')
                      ->whereNull('deleted_at');
                });
            },
            'responses as authenticated_responses_count' => function ($query) {
                $query->whereHas('participant', function($q) {
                    $q->where('is_guest', false)
                      ->where('status', 'active')
                      ->whereNull('deleted_at');
                });
            },
            'responses as guest_responses_count' => function ($query) {
                $query->whereHas('participant', function($q) {
                    $q->where('status', 'active')
                      ->whereNull('deleted_at')
                      ->where(function($guestQ) {
                          $guestQ->where('is_guest', true)
                                 ->orWhereRaw("additional_data IS NOT NULL AND additional_data->>'participant_type' = 'anonymous'");
                      });
                });
            },
        ]);
        
        // Only include non-deleted questionnaires by default
        if (!$request->boolean('with_trashed')) {
            $query->whereNull('deleted_at');
        }
        
        // Filter by program
        if ($request->has('program_id')) {
            $query->byProgram($request->program_id);
        }

        // Filter by status (active, draft, archived, etc.)
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        // Include trashed
        if ($request->boolean('with_trashed')) {
            $query->withTrashed();
        }

        // Sort by last modified (latest first)
        $query->orderBy('updated_at', 'desc')
              ->orderBy('created_at', 'desc');

        $questionnaires = $query->paginate($request->input('per_page', 15));

        return response()->json($questionnaires);
    }

    /**
     * Store a newly created questionnaire with sections and questions
     */
    public function store(Request $request)
    {
        \Log::info('Questionnaire store called', ['request' => $request->all()]);
        
        try {
        $validated = $request->validate([
            'program_id' => 'required|uuid|exists:programs,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'nullable|string|max:50',
            'is_multilingual' => 'nullable|boolean',
            'languages' => 'nullable|array',
                'languages.*' => 'string|max:10',
                'status' => 'nullable|in:draft,published,archived',
                'scheduled_start' => 'nullable|date',
                'scheduled_end' => 'nullable|date|after_or_equal:scheduled_start',
                'settings' => 'nullable|array',
                'sections' => 'nullable|array',
                'sections.*.title' => 'required|string|max:255',
                'sections.*.description' => 'nullable|string',
            'sections.*.order' => 'nullable|integer',
            'sections.*.conditional_logic' => 'nullable|array',
            'sections.*.translations' => 'nullable|array',
            'sections.*.questions' => 'nullable|array',
            'sections.*.questions.*.type' => 'required|in:text,textarea,number,email,phone,url,radio,checkbox,select,multiselect,rating,scale,date,time,datetime,file,yesno,matrix,information,slider_scale,dial_gauge,likert_visual,nps,star_rating,drag_and_drop,sct_likert,video,comment,percentage_allocation',
            'sections.*.questions.*.title' => 'required|string|max:255',
            'sections.*.questions.*.description' => 'nullable|string',
            'sections.*.questions.*.parent_question_id' => 'nullable|uuid',
            'sections.*.questions.*.parent_option_value' => 'nullable|string',
            'sections.*.questions.*.nesting_level' => 'nullable|integer|min:0|max:10',
            'sections.*.questions.*.is_rich_text' => 'nullable|boolean',
            'sections.*.questions.*.formatted_title' => 'nullable|string',
            'sections.*.questions.*.formatted_description' => 'nullable|string',
            'sections.*.questions.*.options' => 'nullable|array',
            'sections.*.questions.*.validations' => 'nullable|array',
            'sections.*.questions.*.conditional_logic' => 'nullable',
            'sections.*.questions.*.settings' => 'nullable|array',
            'sections.*.questions.*.translations' => 'nullable|array',
            'sections.*.questions.*.is_required' => 'nullable|boolean',
            'sections.*.questions.*.is_comment_enabled' => 'nullable|boolean',
            'sections.*.questions.*.min_selection' => 'nullable|integer|min:1',
            'sections.*.questions.*.max_selection' => 'nullable|integer|min:1',
            'sections.*.questions.*.order' => 'nullable|integer',
            // Reference validation rules
            'sections.*.questions.*.references' => 'nullable|array',
            'sections.*.questions.*.references.*.reference_type' => 'required|in:text,url',
            'sections.*.questions.*.references.*.title' => 'nullable|string|max:255',
            'sections.*.questions.*.references.*.content_text' => 'nullable|string',
            'sections.*.questions.*.references.*.content_url' => 'nullable|string|max:500',
            'sections.*.questions.*.references.*.display_position' => 'required|in:AFTER_QUESTION,AFTER_ANSWER',
            'sections.*.questions.*.references.*.order_index' => 'nullable|integer',
        ]);

        // Validate questionnaire dates are within program date boundaries
        if (isset($validated['scheduled_start']) || isset($validated['scheduled_end'])) {
            $program = \App\Models\Program::findOrFail($validated['program_id']);
            
            if (isset($validated['scheduled_start']) && $program->start_date && $validated['scheduled_start'] < $program->start_date) {
                return response()->json([
                    'message' => 'Questionnaire start date cannot be before program start date',
                    'errors' => [
                        'scheduled_start' => ['Questionnaire start date (' . date('Y-m-d', strtotime($validated['scheduled_start'])) . ') cannot be before program start date (' . date('Y-m-d', strtotime($program->start_date)) . ')']
                    ]
                ], 422);
            }
            
            if (isset($validated['scheduled_end']) && $program->end_date && $validated['scheduled_end'] > $program->end_date) {
                return response()->json([
                    'message' => 'Questionnaire end date cannot be after program end date',
                    'errors' => [
                        'scheduled_end' => ['Questionnaire end date (' . date('Y-m-d', strtotime($validated['scheduled_end'])) . ') cannot be after program end date (' . date('Y-m-d', strtotime($program->end_date)) . ')']
                    ]
                ], 422);
            }
        }

        DB::beginTransaction();
        try {
            // Create questionnaire
            $questionnaire = Questionnaire::create([
                'program_id' => $validated['program_id'],
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'type' => $validated['type'] ?? 'survey',
                'is_multilingual' => $validated['is_multilingual'] ?? false,
                'languages' => $validated['languages'] ?? null,
                'status' => $validated['status'] ?? 'draft',
                'scheduled_start' => $validated['scheduled_start'] ?? null,
                'scheduled_end' => $validated['scheduled_end'] ?? null,
                'settings' => $validated['settings'] ?? null,
            ]);

            // Create sections and questions if provided
            if (!empty($validated['sections'])) {
                foreach ($validated['sections'] as $sectionData) {
                    $section = $questionnaire->sections()->create([
                        'title' => $sectionData['title'],
                        'description' => $sectionData['description'] ?? null,
                        'order' => $sectionData['order'] ?? 0,
                        'conditional_logic' => $sectionData['conditional_logic'] ?? null,
                        'translations' => $sectionData['translations'] ?? null,
                    ]);

                    if (!empty($sectionData['questions'])) {
                        foreach ($sectionData['questions'] as $questionData) {
                            $question = $section->questions()->create([
                                'type' => $questionData['type'],
                                'title' => $questionData['title'],
                                'description' => $questionData['description'] ?? null,
                                'options' => $questionData['options'] ?? null,
                                'validations' => $questionData['validations'] ?? null,
                                'conditional_logic' => $questionData['conditional_logic'] ?? null,
                                'settings' => $questionData['settings'] ?? null,
                                'translations' => $questionData['translations'] ?? null,
                                'is_required' => $questionData['is_required'] ?? false,
                                'is_comment_enabled' => $questionData['is_comment_enabled'] ?? false,
                                'min_selection' => $questionData['min_selection'] ?? null,
                                'max_selection' => $questionData['max_selection'] ?? null,
                                'order' => $questionData['order'] ?? 0,
                            ]);

                            // Create references if provided
                            if (!empty($questionData['references'])) {
                                foreach ($questionData['references'] as $refIndex => $refData) {
                                    $question->references()->create([
                                        'reference_type' => $refData['reference_type'] ?? 'text',
                                        'title' => $refData['title'] ?? null,
                                        'content_text' => $refData['content_text'] ?? null,
                                        'content_url' => $refData['content_url'] ?? null,
                                        'display_position' => $refData['display_position'] ?? 'AFTER_QUESTION',
                                        'order_index' => $refData['order_index'] ?? $refIndex,
                                    ]);
                                }
                            }
                        }
                    }
                }
            }

            DB::commit();
            $questionnaire->load(['program', 'sections.questions.references']);

            return response()->json([
                'message' => 'Questionnaire created successfully',
                'data' => $questionnaire
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Questionnaire creation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            return response()->json([
                'message' => 'Failed to create questionnaire',
                'error' => $e->getMessage()
            ], 500);
        }
        } catch (\Illuminate\Validation\ValidationException $ve) {
            \Log::error('Questionnaire validation failed', ['errors' => $ve->errors()]);
            throw $ve;
        } catch (\Exception $e) {
            \Log::error('Questionnaire store error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'message' => 'Failed to create questionnaire',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified questionnaire
     */
    public function show(string $id)
    {
        $questionnaire = Questionnaire::with(['program', 'sections.questions.references'])
            ->findOrFail($id);

        return response()->json(['data' => $questionnaire]);
    }

    /**
     * Update the specified questionnaire
     */
    public function update(Request $request, string $id)
    {
        $questionnaire = Questionnaire::findOrFail($id);
        
        // Log incoming request for debugging
        \Log::info('Questionnaire update called', [
            'questionnaire_id' => $id,
            'request_keys' => array_keys($request->all()),
        ]);
        
        try {
        $validated = $request->validate([
            'program_id' => 'sometimes|required|uuid|exists:programs,id',
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'nullable|string|max:50',
            'is_multilingual' => 'nullable|boolean',
            'languages' => 'nullable|array',
            'languages.*' => 'string|max:10',
            'status' => 'sometimes|in:draft,published,archived',
            'scheduled_start' => 'nullable|date',
            'scheduled_end' => 'nullable|date|after_or_equal:scheduled_start',
            'settings' => 'nullable|array',
            'sections' => 'nullable|array',
            'sections.*.id' => 'nullable',
            'sections.*.title' => 'required|string|max:255',
            'sections.*.description' => 'nullable|string',
            'sections.*.order' => 'nullable|integer',
            'sections.*.conditional_logic' => 'nullable|array',
            'sections.*.translations' => 'nullable|array',
            'sections.*.questions' => 'nullable|array',
            'sections.*.questions.*.id' => 'nullable',
            'sections.*.questions.*.type' => 'required|in:text,textarea,number,email,phone,url,radio,checkbox,select,multiselect,rating,scale,date,time,datetime,file,yesno,matrix,information,slider_scale,dial_gauge,likert_visual,nps,star_rating,drag_and_drop,sct_likert,video,comment,percentage_allocation',
            'sections.*.questions.*.title' => 'required|string|max:255',
            'sections.*.questions.*.description' => 'nullable|string',
            'sections.*.questions.*.parent_question_id' => 'nullable|uuid',
            'sections.*.questions.*.parent_option_value' => 'nullable|string',
            'sections.*.questions.*.nesting_level' => 'nullable|integer|min:0|max:10',
            'sections.*.questions.*.is_rich_text' => 'nullable|boolean',
            'sections.*.questions.*.formatted_title' => 'nullable|string',
            'sections.*.questions.*.formatted_description' => 'nullable|string',
            'sections.*.questions.*.options' => 'nullable|array',
            'sections.*.questions.*.validations' => 'nullable|array',
            'sections.*.questions.*.conditional_logic' => 'nullable',
            'sections.*.questions.*.settings' => 'nullable|array',
            'sections.*.questions.*.translations' => 'nullable|array',
            'sections.*.questions.*.is_required' => 'nullable|boolean',
            'sections.*.questions.*.is_comment_enabled' => 'nullable|boolean',
            'sections.*.questions.*.min_selection' => 'nullable|integer|min:1',
            'sections.*.questions.*.max_selection' => 'nullable|integer|min:1',
            'sections.*.questions.*.order' => 'nullable|integer',
            // Reference validation rules
            'sections.*.questions.*.references' => 'nullable|array',
            'sections.*.questions.*.references.*.reference_type' => 'required|in:text,url',
            'sections.*.questions.*.references.*.title' => 'nullable|string|max:255',
            'sections.*.questions.*.references.*.content_text' => 'nullable|string',
            'sections.*.questions.*.references.*.content_url' => 'nullable|string|max:500',
            'sections.*.questions.*.references.*.display_position' => 'required|in:AFTER_QUESTION,AFTER_ANSWER',
            'sections.*.questions.*.references.*.order_index' => 'nullable|integer',
        ]);
        } catch (\Illuminate\Validation\ValidationException $ve) {
            \Log::error('Questionnaire update validation failed', [
                'questionnaire_id' => $id,
                'errors' => $ve->errors(),
                'request_sample' => array_slice($request->all(), 0, 5)
            ]);
            throw $ve;
        }

        // Validate questionnaire dates are within program date boundaries (if dates are being updated)
        if (isset($validated['program_id']) || isset($validated['scheduled_start']) || isset($validated['scheduled_end'])) {
            $programId = $validated['program_id'] ?? $questionnaire->program_id;
            $scheduledStart = $validated['scheduled_start'] ?? $questionnaire->scheduled_start;
            $scheduledEnd = $validated['scheduled_end'] ?? $questionnaire->scheduled_end;
            
            $program = \App\Models\Program::findOrFail($programId);
            
            if ($scheduledStart && $program->start_date && $scheduledStart < $program->start_date) {
                return response()->json([
                    'message' => 'Questionnaire start date cannot be before program start date',
                    'errors' => [
                        'scheduled_start' => ['Questionnaire start date (' . date('Y-m-d', strtotime($scheduledStart)) . ') cannot be before program start date (' . date('Y-m-d', strtotime($program->start_date)) . ')']
                    ]
                ], 422);
            }
            
            if ($scheduledEnd && $program->end_date && $scheduledEnd > $program->end_date) {
                return response()->json([
                    'message' => 'Questionnaire end date cannot be after program end date',
                    'errors' => [
                        'scheduled_end' => ['Questionnaire end date (' . date('Y-m-d', strtotime($scheduledEnd)) . ') cannot be after program end date (' . date('Y-m-d', strtotime($program->end_date)) . ')']
                    ]
                ], 422);
            }
        }

        DB::beginTransaction();
        try {
            // Update questionnaire basic info
            $updateData = array_filter($validated, function($key) {
                return $key !== 'sections';
            }, ARRAY_FILTER_USE_KEY);
            
            $questionnaire->update($updateData);

            // Handle sections if provided
            if (isset($validated['sections'])) {
                // Delete existing sections, questions, and their references
                $questionnaire->sections()->each(function ($section) {
                    $section->questions()->each(function ($question) {
                        $question->references()->delete();
                    });
                    $section->questions()->forceDelete();
                    $section->forceDelete();
                });

                // Create new sections and questions
                foreach ($validated['sections'] as $sectionData) {
                    $section = $questionnaire->sections()->create([
                        'title' => $sectionData['title'],
                        'description' => $sectionData['description'] ?? null,
                        'order' => $sectionData['order'] ?? 0,
                        'conditional_logic' => $sectionData['conditional_logic'] ?? null,
                        'translations' => $sectionData['translations'] ?? null,
                    ]);

                    if (isset($sectionData['questions'])) {
                        foreach ($sectionData['questions'] as $questionData) {
                            $question = $section->questions()->create([
                                'type' => $questionData['type'],
                                'title' => $questionData['title'],
                                'description' => $questionData['description'] ?? null,
                                'options' => $questionData['options'] ?? null,
                                'validations' => $questionData['validations'] ?? null,
                                'conditional_logic' => $questionData['conditional_logic'] ?? null,
                                'settings' => $questionData['settings'] ?? null,
                                'translations' => $questionData['translations'] ?? null,
                                'is_required' => $questionData['is_required'] ?? false,
                                'is_comment_enabled' => $questionData['is_comment_enabled'] ?? false,
                                'min_selection' => $questionData['min_selection'] ?? null,
                                'max_selection' => $questionData['max_selection'] ?? null,
                                'order' => $questionData['order'] ?? 0,
                            ]);

                            // Create references if provided
                            if (!empty($questionData['references'])) {
                                foreach ($questionData['references'] as $refIndex => $refData) {
                                    $question->references()->create([
                                        'reference_type' => $refData['reference_type'] ?? 'text',
                                        'title' => $refData['title'] ?? null,
                                        'content_text' => $refData['content_text'] ?? null,
                                        'content_url' => $refData['content_url'] ?? null,
                                        'display_position' => $refData['display_position'] ?? 'AFTER_QUESTION',
                                        'order_index' => $refData['order_index'] ?? $refIndex,
                                    ]);
                                }
                            }
                        }
                    }
                }
            }

            DB::commit();
            $questionnaire->load(['program', 'sections.questions.references']);
            
            return response()->json([
                'message' => 'Questionnaire updated successfully',
                'data' => $questionnaire
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update questionnaire',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    /**
     * Soft delete the specified questionnaire
     */
    public function destroy(string $id)
    {
        $questionnaire = Questionnaire::findOrFail($id);
        $questionnaire->delete();

        return response()->json([
            'message' => 'Questionnaire deleted successfully'
        ]);
    }

    /**
     * Publish questionnaire
     */
    public function publish(string $id)
    {
        $questionnaire = Questionnaire::findOrFail($id);
        $questionnaire->update(['status' => 'published']);

        return response()->json([
            'message' => 'Questionnaire published successfully',
            'data' => $questionnaire
        ]);
    }

    /**
     * Archive questionnaire
     */
    public function archive(string $id)
    {
        $questionnaire = Questionnaire::findOrFail($id);
        $questionnaire->update(['status' => 'archived']);

        return response()->json([
            'message' => 'Questionnaire archived successfully',
            'data' => $questionnaire
        ]);
    }

    /**
     * Restore soft deleted questionnaire
     */
    public function restore(string $id)
    {
        $questionnaire = Questionnaire::withTrashed()->findOrFail($id);
        $questionnaire->restore();
        $questionnaire->load(['program', 'sections.questions']);

        return response()->json([
            'message' => 'Questionnaire restored successfully',
            'data' => $questionnaire
        ]);
    }

    /**
     * Permanently delete questionnaire
     */
    public function forceDestroy(string $id)
    {
        $questionnaire = Questionnaire::withTrashed()->findOrFail($id);
        $questionnaire->forceDelete();

        return response()->json([
            'message' => 'Questionnaire permanently deleted'
        ]);
    }

    /**
     * Duplicate questionnaire
     */
    public function duplicate(string $id)
    {
        $original = Questionnaire::with(['sections.questions'])->findOrFail($id);

        DB::beginTransaction();
        try {
            $questionnaire = $original->replicate();
            $questionnaire->title = $original->title . ' (Copy)';
            $questionnaire->status = 'draft';
            $questionnaire->save();

            foreach ($original->sections as $originalSection) {
                $section = $originalSection->replicate();
                $section->questionnaire_id = $questionnaire->id;
                $section->save();

                foreach ($originalSection->questions as $originalQuestion) {
                    $question = $originalQuestion->replicate();
                    $question->section_id = $section->id;
                    $question->save();
                }
            }

            DB::commit();
            $questionnaire->load(['program', 'sections.questions']);

            return response()->json([
                'message' => 'Questionnaire duplicated successfully',
                'data' => $questionnaire
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to duplicate questionnaire',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add section to questionnaire
     */
    public function addSection(Request $request, string $id)
    {
        $questionnaire = Questionnaire::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'nullable|integer',
            'conditional_logic' => 'nullable',
            'translations' => 'nullable|array',
        ]);

        $section = $questionnaire->sections()->create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'order' => $validated['order'] ?? 0,
            'conditional_logic' => $validated['conditional_logic'] ?? null,
            'translations' => $validated['translations'] ?? null,
        ]);

        return response()->json([
            'message' => 'Section added successfully',
            'data' => $section
        ], 201);
    }

    /**
     * Update section
     */
    public function updateSection(Request $request, string $questionnaireId, string $sectionId)
    {
        $section = Section::where('questionnaire_id', $questionnaireId)
            ->findOrFail($sectionId);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'nullable|integer',
            'conditional_logic' => 'nullable',
            'translations' => 'nullable|array',
        ]);

        $section->update($validated);

        return response()->json([
            'message' => 'Section updated successfully',
            'data' => $section
        ]);
    }

    /**
     * Delete section
     */
    public function deleteSection(string $questionnaireId, string $sectionId)
    {
        $section = Section::where('questionnaire_id', $questionnaireId)
            ->findOrFail($sectionId);
        $section->delete();

        return response()->json([
            'message' => 'Section deleted successfully'
        ]);
    }

    /**
     * Add question to section
     */
    public function addQuestion(Request $request, string $questionnaireId, string $sectionId)
    {
        $section = Section::where('questionnaire_id', $questionnaireId)
            ->findOrFail($sectionId);

        $validated = $request->validate([
            'type' => 'required|in:text,textarea,number,email,phone,url,radio,checkbox,select,multiselect,rating,scale,date,time,datetime,file,yesno,matrix,information,slider_scale,dial_gauge,likert_visual,nps,star_rating,drag_and_drop,sct_likert,video',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'options' => 'nullable|array',
            'validations' => 'nullable|array',
            'conditional_logic' => 'nullable',
            'settings' => 'nullable|array',
            'translations' => 'nullable|array',
            'is_required' => 'nullable|boolean',
            'is_comment_enabled' => 'nullable|boolean',
            'min_selection' => 'nullable|integer|min:1',
            'max_selection' => 'nullable|integer|min:1',
            'order' => 'nullable|integer',
        ]);

        $question = $section->questions()->create([
            'type' => $validated['type'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'options' => $validated['options'] ?? null,
            'validations' => $validated['validations'] ?? null,
            'conditional_logic' => $validated['conditional_logic'] ?? null,
            'settings' => $validated['settings'] ?? null,
            'translations' => $validated['translations'] ?? null,
            'is_required' => $validated['is_required'] ?? false,
            'is_comment_enabled' => $validated['is_comment_enabled'] ?? false,
            'min_selection' => $validated['min_selection'] ?? null,
            'max_selection' => $validated['max_selection'] ?? null,
            'order' => $validated['order'] ?? 0,
        ]);

        return response()->json([
            'message' => 'Question added successfully',
            'data' => $question
        ], 201);
    }

    /**
     * Update question
     */
    public function updateQuestion(Request $request, string $questionnaireId, string $sectionId, string $questionId)
    {
        $question = Question::whereHas('section', function($q) use ($questionnaireId, $sectionId) {
            $q->where('questionnaire_id', $questionnaireId)
              ->where('id', $sectionId);
        })->findOrFail($questionId);

        $validated = $request->validate([
            'type' => 'sometimes|required|in:text,textarea,number,email,phone,url,radio,checkbox,select,multiselect,rating,scale,date,time,datetime,file,yesno,matrix,information,slider_scale,dial_gauge,likert_visual,nps,star_rating,drag_and_drop,sct_likert,video',
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'options' => 'nullable|array',
            'validations' => 'nullable|array',
            'conditional_logic' => 'nullable',
            'settings' => 'nullable|array',
            'translations' => 'nullable|array',
            'is_required' => 'nullable|boolean',
            'is_comment_enabled' => 'nullable|boolean',
            'min_selection' => 'nullable|integer|min:1',
            'max_selection' => 'nullable|integer|min:1',
            'order' => 'nullable|integer',
        ]);

        $question->update($validated);

        return response()->json([
            'message' => 'Question updated successfully',
            'data' => $question
        ]);
    }

    /**
     * Delete question
     */
    public function deleteQuestion(string $questionnaireId, string $sectionId, string $questionId)
    {
        $question = Question::whereHas('section', function($q) use ($questionnaireId, $sectionId) {
            $q->where('questionnaire_id', $questionnaireId)
              ->where('id', $sectionId);
        })->findOrFail($questionId);
        
        $question->delete();

        return response()->json([
            'message' => 'Question deleted successfully'
        ]);
    }
}
