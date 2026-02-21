"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, Edit, Info, RotateCcw, CheckCircle, Circle } from "lucide-react";
import { questionnairesApi, type Questionnaire } from "@/lib/api";
import { filterQuestionsByLogic } from "@/utils/conditionalLogicEvaluator";
import { QuestionWithLogic } from "@/types/conditionalLogic";

// Import question rendering components
import LikertVisual from "@/components/questions/LikertVisual";
import NPSScale from "@/components/questions/NPSScale";
import StarRating from "@/components/questions/StarRating";
import SliderScale from "@/components/questions/SliderScale";
import DialGauge from "@/components/questions/DialGauge";
import { Input } from "@/components/ui/input";

// Constant for "Other" option value - must match backend
const OTHER_OPTION_VALUE = '__other__';

export default function PreviewQuestionnairePage() {
  const router = useRouter();
  const params = useParams();
  const questionnaireId = params.id as string;
  
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Preview mode state for interactive testing
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [interactiveMode, setInteractiveMode] = useState(true);
  const originalResponsesRef = React.useRef<Record<string,any>>({});

  useEffect(() => {
    loadQuestionnaire();
  }, [questionnaireId]);

  async function loadQuestionnaire() {
    try {
      setLoading(true);
      setError(null);
      const data = await questionnairesApi.getById(questionnaireId);
      setQuestionnaire(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questionnaire');
      console.error('Error loading questionnaire:', err);
    } finally {
      setLoading(false);
    }
  }
  
  // Get all sections with visible questions based on conditional logic
  const sectionsWithVisibleQuestions = useMemo(() => {
    if (!questionnaire?.sections) return [];
    
    const allQuestions = questionnaire.sections.flatMap((s: any) => s.questions || []);
    
    return questionnaire.sections.map((section: any) => {
      const filteredQuestions = filterQuestionsByLogic(
        section.questions || [],
        responses,
        allQuestions as QuestionWithLogic[]
      );
      
      return {
        ...section,
        questions: filteredQuestions,
        originalCount: section.questions?.length || 0,
        visibleCount: filteredQuestions.length
      };
    });
  }, [questionnaire, responses]);
  
  // Count total questions (original vs visible)
  const questionCounts = useMemo(() => {
    const original = questionnaire?.sections?.reduce((sum: number, s: any) => sum + (s.questions?.length || 0), 0) || 0;
    const visible = sectionsWithVisibleQuestions.reduce((sum, s) => sum + s.visibleCount, 0);
    return { original, visible };
  }, [questionnaire, sectionsWithVisibleQuestions]);
  
  // Handle response change
  const handleResponseChange = (questionId: string | number, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };
  
  // Handle multiple choice toggle
  const handleMultipleChoiceToggle = (questionId: string | number, optionValue: string) => {
    const currentValues = responses[questionId] || [];
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter((v: string) => v !== optionValue)
      : [...currentValues, optionValue];
    handleResponseChange(questionId, newValues);
  };
  
  // Reset responses
  const handleResetResponses = () => {
    setResponses({});
  };

  // Render individual question
  const renderQuestion = (question: any) => {
    const questionId = question.id;
    const response = responses[questionId];
    
    switch (question.type) {
      case "mcq":
      case "radio":
        return (
          <div className="space-y-3">
            {(question.options || []).map((option: any, idx: number) => {
              const optionValue = typeof option === 'string' ? option : (option.value || option.text || option.label);
              const optionLabel = typeof option === 'string' ? option : (option.text || option.label || option.value);
              const isSelected = String(response) === String(optionValue);
              
              return (
                <label
                  key={idx}
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? "border-qsights-cyan bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected ? "border-qsights-cyan bg-qsights-cyan" : "border-gray-300"
                  }`}>
                    {isSelected && <Circle className="w-3 h-3 fill-white text-white" />}
                  </div>
                  <input
                    type="radio"
                    name={`question-${questionId}`}
                    value={optionValue}
                    checked={isSelected}
                    onChange={() => handleResponseChange(questionId, optionValue)}
                    className="hidden"
                  />
                  <span className="text-sm text-gray-700 flex-1">{optionLabel}</span>
                </label>
              );
            })}
            
            {/* Other (Please Specify) option */}
            {question.settings?.allow_other && (
              <>
                <label
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    String(response) === OTHER_OPTION_VALUE
                      ? "border-qsights-cyan bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    String(response) === OTHER_OPTION_VALUE ? "border-qsights-cyan bg-qsights-cyan" : "border-gray-300"
                  }`}>
                    {String(response) === OTHER_OPTION_VALUE && <Circle className="w-3 h-3 fill-white text-white" />}
                  </div>
                  <input
                    type="radio"
                    name={`question-${questionId}`}
                    value={OTHER_OPTION_VALUE}
                    checked={String(response) === OTHER_OPTION_VALUE}
                    onChange={() => handleResponseChange(questionId, OTHER_OPTION_VALUE)}
                    className="hidden"
                  />
                  <span className="text-sm text-gray-700 flex-1">Other (Please Specify)</span>
                </label>
                {String(response) === OTHER_OPTION_VALUE && (
                  <div className="ml-8 mt-2">
                    <Input
                      type="text"
                      placeholder="Please specify..."
                      value={otherTexts[questionId] || ""}
                      onChange={(e) => setOtherTexts(prev => ({ ...prev, [questionId]: e.target.value }))}
                      className="w-full"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        );
      
      case "multi":
      case "multiselect":
      case "checkbox":
        const selectedValues = response || [];
        return (
          <div className="space-y-3">
            {(question.options || []).map((option: any, idx: number) => {
              const optionValue = typeof option === 'string' ? option : (option.value || option.text || option.label);
              const optionLabel = typeof option === 'string' ? option : (option.text || option.label || option.value);
              const isChecked = selectedValues.includes(optionValue);
              
              return (
                <label
                  key={idx}
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isChecked
                      ? "border-qsights-cyan bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isChecked ? "border-qsights-cyan bg-qsights-cyan" : "border-gray-300"
                  }`}>
                    {isChecked && <CheckCircle className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleMultipleChoiceToggle(questionId, optionValue)}
                    className="hidden"
                  />
                  <span className="text-sm text-gray-700 flex-1">{optionLabel}</span>
                </label>
              );
            })}
            
            {/* Other (Please Specify) option for multiselect */}
            {question.settings?.allow_other && (
              <>
                {(() => {
                  const isOtherChecked = selectedValues.includes(OTHER_OPTION_VALUE);
                  return (
                    <>
                      <label
                        className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isOtherChecked
                            ? "border-qsights-cyan bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isOtherChecked ? "border-qsights-cyan bg-qsights-cyan" : "border-gray-300"
                        }`}>
                          {isOtherChecked && <CheckCircle className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                        <input
                          type="checkbox"
                          checked={isOtherChecked}
                          onChange={() => handleMultipleChoiceToggle(questionId, OTHER_OPTION_VALUE)}
                          className="hidden"
                        />
                        <span className="text-sm text-gray-700 flex-1">Other (Please Specify)</span>
                      </label>
                      {isOtherChecked && (
                        <div className="ml-8 mt-2">
                          <Input
                            type="text"
                            placeholder="Please specify..."
                            value={otherTexts[questionId] || ""}
                            onChange={(e) => setOtherTexts(prev => ({ ...prev, [questionId]: e.target.value }))}
                            className="w-full"
                          />
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
        );
      
      case "text":
      case "textarea":
        return (
          <textarea
            value={response || ""}
            onChange={(e) => handleResponseChange(questionId, e.target.value)}
            placeholder="Type your answer here..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-cyan focus:border-transparent resize-none"
            rows={4}
          />
        );
      
      case "rating":
        const maxRating = question.settings?.scale || question.scale || 5;
        return (
          <div className="flex gap-2">
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((value) => (
              <button
                key={value}
                onClick={() => handleResponseChange(questionId, value)}
                className={`w-12 h-12 rounded-lg border-2 font-semibold text-lg transition-all ${
                  response === value
                    ? "border-qsights-cyan bg-qsights-cyan text-white"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        );
      
      case "slider":
      case "scale":
        const min = question.settings?.min || question.min || 0;
        const max = question.settings?.max || question.max || 100;
        const sliderValue = response || min;
        return (
          <div className="space-y-3">
            <input
              type="range"
              min={min}
              max={max}
              value={sliderValue}
              onChange={(e) => handleResponseChange(questionId, parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-qsights-cyan"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>{min}</span>
              <span className="font-semibold text-qsights-cyan">{sliderValue}</span>
              <span>{max}</span>
            </div>
          </div>
        );
      
      case "dropdown":
      case "select":
        return (
          <select
            value={response || ""}
            onChange={(e) => handleResponseChange(questionId, e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-cyan focus:border-transparent"
          >
            <option value="">Select an option...</option>
            {(question.options || []).map((option: any, idx: number) => {
              const optionValue = typeof option === 'string' ? option : (option.value || option.text || option.label);
              const optionLabel = typeof option === 'string' ? option : (option.text || option.label || option.value);
              return (
                <option key={idx} value={optionValue}>
                  {optionLabel}
                </option>
              );
            })}
          </select>
        );
      
      case "matrix":
        const matrixRows = question.settings?.rows || question.rows || [];
        const matrixColumns = question.settings?.columns || question.columns || [];
        const matrixResponses = response || {};
        
        if (matrixRows.length === 0 || matrixColumns.length === 0) {
          return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">Matrix not configured (missing rows or columns)</p>
            </div>
          );
        }
        
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 bg-gray-50 p-3 text-left text-sm font-medium text-gray-700"></th>
                  {matrixColumns.map((col: any, idx: number) => (
                    <th key={idx} className="border border-gray-300 bg-gray-50 p-3 text-center text-sm font-medium text-gray-700">
                      {typeof col === 'string' ? col : (col.text || col.label || col.value)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row: any, rowIdx: number) => {
                  const rowValue = typeof row === 'string' ? row : (row.text || row.label || row.value);
                  return (
                    <tr key={rowIdx}>
                      <td className="border border-gray-300 bg-gray-50 p-3 text-sm font-medium text-gray-700">
                        {rowValue}
                      </td>
                      {matrixColumns.map((col: any, colIdx: number) => {
                        const colValue = typeof col === 'string' ? col : (col.text || col.label || col.value);
                        const isSelected = matrixResponses[rowValue] === colValue;
                        return (
                          <td key={colIdx} className="border border-gray-300 p-3 text-center">
                            <input
                              type="radio"
                              name={`matrix-${questionId}-${rowIdx}`}
                              checked={isSelected}
                              onChange={() => {
                                handleResponseChange(questionId, {
                                  ...matrixResponses,
                                  [rowValue]: colValue
                                });
                              }}
                              className="w-4 h-4 text-qsights-cyan cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      
      case "likert_visual":
        return (
          <LikertVisual
            value={response}
            onChange={(value) => handleResponseChange(questionId, value)}
            settings={question.settings}
          />
        );
      
      case "nps":
        return (
          <NPSScale
            value={response}
            onChange={(value) => handleResponseChange(questionId, value)}
            settings={question.settings}
          />
        );
      
      case "star_rating":
        return (
          <StarRating
            value={response}
            onChange={(value) => handleResponseChange(questionId, value)}
            settings={question.settings}
          />
        );
      
      case "slider_scale":
        return (
          <SliderScale
            value={response}
            onChange={(value) => handleResponseChange(questionId, value)}
            settings={question.settings}
          />
        );
      
      case "dial_gauge":
        return (
          <DialGauge
            value={response}
            onChange={(value) => handleResponseChange(questionId, value)}
            settings={question.settings}
          />
        );
      
      case "information":
        // Information blocks don't have responses
        return (
          <div
            className="prose prose-sm max-w-none p-4 bg-blue-50 border-l-4 border-blue-400 rounded"
            dangerouslySetInnerHTML={{ __html: question.question || question.text || "" }}
          />
        );
      
      default:
        return (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">
              Question type "{question.type}" preview not yet implemented
            </p>
          </div>
        );
    }
  };
  
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading questionnaire...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !questionnaire) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 font-semibold">{error || 'Questionnaire not found'}</p>
            <button
              onClick={() => router.push('/questionnaires')}
              className="mt-4 px-4 py-2 bg-qsights-cyan text-white rounded-lg hover:bg-blue-700"
            >
              Back to Questionnaires
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-700';
      case 'archived':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/questionnaires')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Interactive Preview</h1>
              <p className="text-sm text-gray-500 mt-1">
                Test conditional logic by answering questions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetResponses}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={() => router.push(`/questionnaires/${questionnaireId}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>

        {/* Questionnaire Header Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{questionnaire.title}</CardTitle>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(questionnaire.status)}`}>
                {questionnaire.status.charAt(0).toUpperCase() + questionnaire.status.slice(1)}
              </span>
            </div>
          </CardHeader>
          {questionnaire.description && (
            <CardContent>
              <p className="text-sm text-gray-600">{questionnaire.description}</p>
            </CardContent>
          )}
        </Card>

        {/* Preview Info Banner */}
        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Interactive Preview Mode</p>
                <p className="text-xs text-blue-700 mt-1">
                  Answer questions to see how conditional logic shows/hides child questions.
                  Questions with conditional logic will appear dynamically based on your responses.
                </p>
                {questionCounts.original !== questionCounts.visible && (
                  <div className="mt-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-800">
                      Showing {questionCounts.visible} of {questionCounts.original} questions
                      {questionCounts.original > questionCounts.visible && ` (${questionCounts.original - questionCounts.visible} hidden by logic)`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sections and Questions */}
        <div className="space-y-8">
          {sectionsWithVisibleQuestions.map((section: any, sectionIdx: number) => (
            <Card key={section.id || sectionIdx}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Section {sectionIdx + 1}: {section.title || "Untitled Section"}
                    </CardTitle>
                    {section.description && (
                      <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {section.visibleCount} {section.visibleCount === 1 ? 'question' : 'questions'}
                    {section.originalCount !== section.visibleCount && ` (${section.originalCount} total)`}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {section.questions && section.questions.length > 0 ? (
                  <div className="space-y-6">
                    {section.questions.map((question: any, qIdx: number) => {
                      const hasLogic = !!(question.conditionalLogic?.enabled || question.settings?.conditionalLogic?.enabled);
                      
                      return (
                        <div
                          key={question.id || qIdx}
                          className={`pb-6 border-b border-gray-200 last:border-b-0 ${
                            question.type === 'information' ? 'border-b-0 pb-0' : ''
                          }`}
                        >
                          {question.type === 'information' ? (
                            // Information blocks render full width without numbering
                            renderQuestion(question)
                          ) : (
                            <div className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-qsights-dark text-white rounded-full text-sm font-semibold">
                                {qIdx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1">
                                    <div 
                                      className="inline text-base font-medium text-gray-900 prose prose-sm max-w-none"
                                      dangerouslySetInnerHTML={{ __html: question.question || question.text || "" }}
                                    />
                                    {question.is_required && <span className="text-red-500 text-sm font-medium ml-1">*</span>}
                                    {hasLogic && (
                                      <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                        Conditional
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {question.description && (
                                  <p className="text-sm text-gray-500 mb-3">{question.description}</p>
                                )}
                                <div className="mt-3">{renderQuestion(question)}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">
                      {section.originalCount > 0
                        ? "All questions in this section are hidden by conditional logic"
                        : "No questions in this section"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Questions Message */}
        {(!questionnaire.sections || questionnaire.sections.length === 0) && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">This questionnaire has no sections or questions yet.</p>
              <button
                onClick={() => router.push(`/questionnaires/${questionnaireId}/edit`)}
                className="mt-4 px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors"
              >
                Add Questions
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

