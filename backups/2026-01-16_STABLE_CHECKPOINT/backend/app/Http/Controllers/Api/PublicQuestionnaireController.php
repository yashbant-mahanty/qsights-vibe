<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Questionnaire;

class PublicQuestionnaireController extends Controller
{
    /**
     * Get a specific questionnaire (public access)
     */
    public function show(string $id)
    {
        $questionnaire = Questionnaire::with(['sections.questions'])->find($id);

        if (!$questionnaire) {
            return response()->json([
                'message' => 'Questionnaire not found'
            ], 404);
        }

        return response()->json([
            'message' => 'Questionnaire fetched successfully',
            'data' => $questionnaire
        ]);
    }
}
