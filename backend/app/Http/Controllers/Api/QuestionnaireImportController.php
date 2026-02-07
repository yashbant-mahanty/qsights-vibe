<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Questionnaire;
use App\Models\Section;
use App\Models\Question;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class QuestionnaireImportController extends Controller
{
    /**
     * Required columns for import
     */
    private $requiredColumns = [
        'section_name',
        'question_type',
        'question_title',
        'is_required',
    ];

    /**
     * All supported columns
     */
    private $allColumns = [
        'section_name',
        'question_type',
        'question_title',
        'is_required',
        'option_text',
        'option_value',
        'correct_answer',
        'min_value',
        'max_value',
        'rating_scale',
        'language',
    ];

    /**
     * Valid question types mapping
     */
    private $questionTypeMap = [
        'mcq' => 'radio',
        'multiple choice' => 'radio',
        'multi-select' => 'checkbox',
        'multiselect' => 'checkbox',
        'checkbox' => 'checkbox',
        'text' => 'text',
        'text input' => 'text',
        'textarea' => 'textarea',
        'rating' => 'rating',
        'slider' => 'scale',
        'scale' => 'scale',
        'matrix' => 'matrix',
        'information' => 'information',
        'info' => 'information',
        'information block' => 'information',
    ];

    /**
     * Download sample import template
     */
    public function downloadTemplate()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Questions Template');

        // Set headers
        $headers = [
            'A1' => 'Section Name',
            'B1' => 'Question Type',
            'C1' => 'Question Title',
            'D1' => 'Is Required',
            'E1' => 'Option Text',
            'F1' => 'Option Value',
            'G1' => 'Correct Answer',
            'H1' => 'Min Value',
            'I1' => 'Max Value',
            'J1' => 'Rating Scale',
            'K1' => 'Language',
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
            $sheet->getStyle($cell)->getFont()->setBold(true);
            $sheet->getStyle($cell)->getFill()
                ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                ->getStartColor()->setARGB('FFE0E0E0');
        }

        // Add sample data
        $sampleData = [
            // MCQ with options
            ['General Information', 'MCQ', 'What is your gender?', 'Yes', 'Male', 'male', '', '', '', '', 'EN'],
            ['General Information', 'MCQ', 'What is your gender?', 'Yes', 'Female', 'female', '', '', '', '', 'EN'],
            ['General Information', 'MCQ', 'What is your gender?', 'Yes', 'Other', 'other', '', '', '', '', 'EN'],
            // Multi-select
            ['Preferences', 'Multi-Select', 'Select your interests', 'No', 'Sports', 'sports', '', '', '', '', 'EN'],
            ['Preferences', 'Multi-Select', 'Select your interests', 'No', 'Music', 'music', '', '', '', '', 'EN'],
            ['Preferences', 'Multi-Select', 'Select your interests', 'No', 'Reading', 'reading', '', '', '', '', 'EN'],
            // Text input
            ['Feedback', 'Text', 'Any additional comments?', 'No', '', '', '', '', '', '', 'EN'],
            // Rating
            ['Feedback', 'Rating', 'How would you rate our service?', 'Yes', '', '', '', '', '', '5', 'EN'],
            // Slider
            ['Feedback', 'Slider', 'On a scale of 0-100, how satisfied are you?', 'Yes', '', '', '', '0', '100', '', 'EN'],
            // Information block
            ['Introduction', 'Information', 'Welcome to our survey! Please answer all questions honestly.', 'No', '', '', '', '', '', '', 'EN'],
        ];

        $row = 2;
        foreach ($sampleData as $data) {
            $col = 'A';
            foreach ($data as $value) {
                $sheet->setCellValue($col . $row, $value);
                $col++;
            }
            $row++;
        }

        // Auto-size columns
        foreach (range('A', 'K') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Add instructions sheet
        $instructionSheet = $spreadsheet->createSheet();
        $instructionSheet->setTitle('Instructions');
        
        $instructions = [
            ['QUESTIONNAIRE IMPORT INSTRUCTIONS'],
            [''],
            ['REQUIRED COLUMNS:'],
            ['- Section Name: Name of the section (questions with same section name will be grouped)'],
            ['- Question Type: MCQ, Multi-Select, Text, Rating, Slider, Matrix, Information'],
            ['- Question Title: The question text'],
            ['- Is Required: Yes or No'],
            [''],
            ['OPTIONAL COLUMNS:'],
            ['- Option Text: Display text for options (for MCQ/Multi-Select)'],
            ['- Option Value: Value stored when option is selected (optional, defaults to option text)'],
            ['- Correct Answer: Yes for correct option in assessments'],
            ['- Min Value: Minimum value for Slider type'],
            ['- Max Value: Maximum value for Slider type'],
            ['- Rating Scale: Number of stars for Rating type (default: 5)'],
            ['- Language: Language code (default: EN)'],
            [''],
            ['NOTES:'],
            ['- For MCQ/Multi-Select: Add one row per option with same Section Name + Question Title'],
            ['- Information blocks do not require options'],
            ['- Matrix questions: Options are column headers, add rows in settings manually'],
            [''],
            ['QUESTION TYPES:'],
            ['- MCQ / Multiple Choice: Single selection radio buttons'],
            ['- Multi-Select / Checkbox: Multiple selection checkboxes'],
            ['- Text / Text Input: Free text input field'],
            ['- Textarea: Multi-line text input'],
            ['- Rating: Star rating scale'],
            ['- Slider / Scale: Numeric slider with min/max'],
            ['- Matrix: Grid of radio/checkbox options'],
            ['- Information / Info: Display-only text block'],
        ];

        $row = 1;
        foreach ($instructions as $line) {
            $instructionSheet->setCellValue('A' . $row, $line[0] ?? '');
            if ($row === 1) {
                $instructionSheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
            }
            $row++;
        }
        $instructionSheet->getColumnDimension('A')->setWidth(80);

        // Set first sheet as active
        $spreadsheet->setActiveSheetIndex(0);

        // Create temp file and return
        $fileName = 'questionnaire_import_template.xlsx';
        $tempPath = storage_path('app/temp/' . $fileName);
        
        if (!is_dir(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $writer = new Xlsx($spreadsheet);
        $writer->save($tempPath);

        return response()->download($tempPath, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Parse and validate import file
     */
    public function parseFile(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240', // 10MB max
        ]);

        try {
            $file = $request->file('file');
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray(null, true, true, true);

            if (count($rows) < 2) {
                return response()->json([
                    'success' => false,
                    'error' => 'File is empty or has no data rows',
                ], 422);
            }

            // Get headers from first row
            $headerRow = array_shift($rows);
            $headers = $this->normalizeHeaders($headerRow);

            // Validate required columns
            $missingColumns = [];
            foreach ($this->requiredColumns as $required) {
                if (!in_array($required, $headers)) {
                    $missingColumns[] = $required;
                }
            }

            if (!empty($missingColumns)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Missing required columns: ' . implode(', ', $missingColumns),
                    'found_columns' => $headers,
                ], 422);
            }

            // Parse rows
            $parsedData = $this->parseRows($rows, $headers);

            return response()->json([
                'success' => true,
                'data' => $parsedData['sections'],
                'summary' => [
                    'total_sections' => count($parsedData['sections']),
                    'total_questions' => $parsedData['question_count'],
                    'total_options' => $parsedData['option_count'],
                ],
                'errors' => $parsedData['errors'],
                'warnings' => $parsedData['warnings'],
            ]);

        } catch (\Exception $e) {
            Log::error('Questionnaire import parse error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Failed to parse file: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Import questions into a questionnaire
     */
    public function import(Request $request)
    {
        $request->validate([
            'questionnaire_id' => 'required|exists:questionnaires,id',
            'sections' => 'required|array',
            'sections.*.title' => 'required|string',
            'sections.*.questions' => 'required|array',
        ]);

        DB::beginTransaction();
        try {
            $questionnaire = Questionnaire::findOrFail($request->questionnaire_id);
            
            // Get existing section count for ordering
            $existingSectionCount = $questionnaire->sections()->count();
            $sectionOrder = $existingSectionCount;

            $importedSections = 0;
            $importedQuestions = 0;

            foreach ($request->sections as $sectionData) {
                // Check if section already exists
                $section = $questionnaire->sections()
                    ->where('title', $sectionData['title'])
                    ->first();

                if (!$section) {
                    $section = $questionnaire->sections()->create([
                        'title' => $sectionData['title'],
                        'description' => $sectionData['description'] ?? null,
                        'order' => $sectionOrder++,
                    ]);
                    $importedSections++;
                }

                // Get existing question count for ordering
                $questionOrder = $section->questions()->count();

                foreach ($sectionData['questions'] as $questionData) {
                    $section->questions()->create([
                        'type' => $questionData['type'],
                        'title' => $questionData['title'],
                        'description' => $questionData['description'] ?? null,
                        'is_required' => $questionData['is_required'] ?? false,
                        'options' => $questionData['options'] ?? null,
                        'settings' => $questionData['settings'] ?? null,
                        'order' => $questionOrder++,
                    ]);
                    $importedQuestions++;
                }
            }

            DB::commit();

            // Reload questionnaire with all relations
            $questionnaire->load('sections.questions');

            return response()->json([
                'success' => true,
                'message' => "Successfully imported {$importedQuestions} questions in {$importedSections} new sections",
                'questionnaire' => $questionnaire,
                'imported' => [
                    'sections' => $importedSections,
                    'questions' => $importedQuestions,
                ],
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Questionnaire import error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Import failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Normalize header names
     */
    private function normalizeHeaders(array $headerRow): array
    {
        $normalized = [];
        foreach ($headerRow as $header) {
            if (empty($header)) continue;
            $clean = strtolower(trim($header));
            $clean = str_replace([' ', '-'], '_', $clean);
            $normalized[] = $clean;
        }
        return $normalized;
    }

    /**
     * Parse rows and group into sections/questions
     */
    private function parseRows(array $rows, array $headers): array
    {
        $sections = [];
        $errors = [];
        $warnings = [];
        $questionCount = 0;
        $optionCount = 0;

        $rowNumber = 2; // Start from 2 (after header)
        foreach ($rows as $row) {
            $rowData = $this->mapRowToData($row, $headers);
            
            // Skip empty rows
            if (empty($rowData['section_name']) && empty($rowData['question_title'])) {
                $rowNumber++;
                continue;
            }

            // Validate required fields
            if (empty($rowData['question_title'])) {
                $errors[] = [
                    'row' => $rowNumber,
                    'error' => 'Missing question title',
                ];
                $rowNumber++;
                continue;
            }

            if (empty($rowData['section_name'])) {
                $rowData['section_name'] = 'Default Section';
                $warnings[] = [
                    'row' => $rowNumber,
                    'warning' => 'No section name provided, using "Default Section"',
                ];
            }

            // Validate and map question type
            $questionType = $this->mapQuestionType($rowData['question_type'] ?? 'text');
            if ($questionType === null) {
                $errors[] = [
                    'row' => $rowNumber,
                    'error' => 'Invalid question type: ' . ($rowData['question_type'] ?? 'empty'),
                ];
                $rowNumber++;
                continue;
            }

            $sectionName = trim($rowData['section_name']);
            $questionTitle = trim($rowData['question_title']);

            // Find or create section
            if (!isset($sections[$sectionName])) {
                $sections[$sectionName] = [
                    'title' => $sectionName,
                    'questions' => [],
                ];
            }

            // Find or create question within section
            $questionKey = md5($questionTitle);
            if (!isset($sections[$sectionName]['questions'][$questionKey])) {
                $isRequired = $this->parseBoolean($rowData['is_required'] ?? 'no');
                
                $questionData = [
                    'type' => $questionType,
                    'title' => $questionTitle,
                    'is_required' => $isRequired,
                    'options' => [],
                    'settings' => [],
                ];

                // Add type-specific settings
                if ($questionType === 'scale') {
                    $questionData['settings']['min'] = (int) ($rowData['min_value'] ?? 0);
                    $questionData['settings']['max'] = (int) ($rowData['max_value'] ?? 100);
                }

                if ($questionType === 'rating') {
                    $questionData['settings']['scale'] = (int) ($rowData['rating_scale'] ?? 5);
                }

                $sections[$sectionName]['questions'][$questionKey] = $questionData;
                $questionCount++;
            }

            // Add option if present
            if (!empty($rowData['option_text']) && in_array($questionType, ['radio', 'checkbox', 'select', 'multiselect'])) {
                $optionValue = !empty($rowData['option_value']) 
                    ? $rowData['option_value'] 
                    : strtolower(str_replace(' ', '_', $rowData['option_text']));

                $option = [
                    'text' => $rowData['option_text'],
                    'value' => $optionValue,
                ];

                // Add correct answer flag for assessments
                if ($this->parseBoolean($rowData['correct_answer'] ?? 'no')) {
                    $option['is_correct'] = true;
                }

                $sections[$sectionName]['questions'][$questionKey]['options'][] = $option;
                $optionCount++;
            }

            $rowNumber++;
        }

        // Validate MCQ/Multi-select have options
        foreach ($sections as $sectionName => &$section) {
            foreach ($section['questions'] as $key => &$question) {
                if (in_array($question['type'], ['radio', 'checkbox']) && empty($question['options'])) {
                    $warnings[] = [
                        'section' => $sectionName,
                        'question' => $question['title'],
                        'warning' => 'MCQ/Multi-Select question has no options',
                    ];
                }
            }
            // Convert questions from associative to indexed array
            $section['questions'] = array_values($section['questions']);
        }

        // Convert sections from associative to indexed array
        $sections = array_values($sections);

        return [
            'sections' => $sections,
            'question_count' => $questionCount,
            'option_count' => $optionCount,
            'errors' => $errors,
            'warnings' => $warnings,
        ];
    }

    /**
     * Map row array to named data
     */
    private function mapRowToData(array $row, array $headers): array
    {
        $data = [];
        $values = array_values($row);
        
        foreach ($headers as $index => $header) {
            $data[$header] = $values[$index] ?? null;
        }
        
        return $data;
    }

    /**
     * Map question type string to internal type
     */
    private function mapQuestionType(?string $type): ?string
    {
        if (empty($type)) return 'text';
        
        $normalized = strtolower(trim($type));
        
        return $this->questionTypeMap[$normalized] ?? null;
    }

    /**
     * Parse boolean from various formats
     */
    private function parseBoolean($value): bool
    {
        if (is_bool($value)) return $value;
        if (is_numeric($value)) return (bool) $value;
        
        $value = strtolower(trim($value));
        return in_array($value, ['yes', 'y', 'true', '1', 'on']);
    }
}
