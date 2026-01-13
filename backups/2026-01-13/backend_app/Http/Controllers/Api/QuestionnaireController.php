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
        $query = Questionnaire::with(['program', 'sections.questions'])->withCount([
            'responses' => function($query) {
                $query->whereHas('participant', function($q) {
                    $q->where('status', 'active')
                      ->whereNull('deleted_at');
                });
            }
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
            'sections.*.questions.*.type' => 'required|in:text,textarea,number,email,phone,url,radio,checkbox,select,multiselect,rating,scale,date,time,datetime,file,yesno,matrix,information',
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
            'sections.*.questions.*.order' => 'nullable|integer',
        ]);

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
                            $section->questions()->create([
                                'type' => $questionData['type'],
                                'title' => $questionData['title'],
                                'description' => $questionData['description'] ?? null,
                                'options' => $questionData['options'] ?? null,
                                'validations' => $questionData['validations'] ?? null,
                                'conditional_logic' => $questionData['conditional_logic'] ?? null,
                                'settings' => $questionData['settings'] ?? null,
                                'translations' => $questionData['translations'] ?? null,
                                'is_required' => $questionData['is_required'] ?? false,
                                'order' => $questionData['order'] ?? 0,
                            ]);
                        }
                    }
                }
            }

            DB::commit();
            $questionnaire->load(['program', 'sections.questions']);

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
        $questionnaire = Questionnaire::with(['program', 'sections.questions'])
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
            'sections.*.questions.*.type' => 'required|in:text,textarea,number,email,phone,url,radio,checkbox,select,multiselect,rating,scale,date,time,datetime,file,yesno,matrix,information',
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
            'sections.*.questions.*.order' => 'nullable|integer',
        ]);
        } catch (\Illuminate\Validation\ValidationException $ve) {
            \Log::error('Questionnaire update validation failed', [
                'questionnaire_id' => $id,
                'errors' => $ve->errors(),
                'request_sample' => array_slice($request->all(), 0, 5)
            ]);
            throw $ve;
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
                // Delete existing sections and questions
                $questionnaire->sections()->each(function ($section) {
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
                            $section->questions()->create([
                                'type' => $questionData['type'],
                                'title' => $questionData['title'],
                                'description' => $questionData['description'] ?? null,
                                'options' => $questionData['options'] ?? null,
                                'validations' => $questionData['validations'] ?? null,
                                'conditional_logic' => $questionData['conditional_logic'] ?? null,
                                'settings' => $questionData['settings'] ?? null,
                                'translations' => $questionData['translations'] ?? null,
                                'is_required' => $questionData['is_required'] ?? false,
                                'order' => $questionData['order'] ?? 0,
                            ]);
                        }
                    }
                }
            }

            DB::commit();
            $questionnaire->load(['program', 'sections.questions']);
            
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
            'type' => 'required|in:text,textarea,number,email,phone,url,radio,checkbox,select,multiselect,rating,scale,date,time,datetime,file,yesno,matrix',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'options' => 'nullable|array',
            'validations' => 'nullable|array',
            'conditional_logic' => 'nullable',
            'settings' => 'nullable|array',
            'translations' => 'nullable|array',
            'is_required' => 'nullable|boolean',
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
            'type' => 'sometimes|required|in:text,textarea,number,email,phone,url,radio,checkbox,select,multiselect,rating,scale,date,time,datetime,file,yesno,matrix',
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'options' => 'nullable|array',
            'validations' => 'nullable|array',
            'conditional_logic' => 'nullable',
            'settings' => 'nullable|array',
            'translations' => 'nullable|array',
            'is_required' => 'nullable|boolean',
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
