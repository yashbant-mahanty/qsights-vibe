"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Loader2,
  CheckCircle,
  Circle,
  Square,
  Edit3,
  Star,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Clock,
} from "lucide-react";
import { activitiesApi, questionnairesApi, type Activity, type Questionnaire } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { filterQuestionsByLogic } from "@/utils/conditionalLogicEvaluator";

export default function ActivityPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});

  useEffect(() => {
    loadData();
  }, [activityId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const activityData = await activitiesApi.getById(activityId);
      setActivity(activityData);

      // Load questionnaire if assigned
      if (activityData.questionnaire_id) {
        const questionnaireData = await questionnairesApi.getById(activityData.questionnaire_id);
        setQuestionnaire(questionnaireData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
      console.error("Error loading activity:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleMultipleChoiceToggle = (questionId: string, optionValue: string) => {
    const currentValues = responses[questionId] || [];
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter((v: string) => v !== optionValue)
      : [...currentValues, optionValue];
    handleResponseChange(questionId, newValues);
  };

  const renderQuestion = (question: any) => {
    const questionId = question.id;

    switch (question.type) {
      case "text":
      case "short_answer":
        return (
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Enter your answer..."
              value={responses[questionId] || ""}
              onChange={(e) => handleResponseChange(questionId, e.target.value)}
              className="w-full"
            />
          </div>
        );

      case "textarea":
      case "long_answer":
      case "paragraph":
        return (
          <div className="space-y-2">
            <textarea
              rows={4}
              placeholder="Enter your detailed answer..."
              value={responses[questionId] || ""}
              onChange={(e) => handleResponseChange(questionId, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
            />
          </div>
        );

      case "single_choice":
      case "radio":
      case "multiple_choice_single":
        return (
          <div className="space-y-3">
            {question.options?.map((option: any, index: number) => (
              <div
                key={index}
                onClick={() => handleResponseChange(questionId, option.value || option.text)}
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  responses[questionId] === (option.value || option.text)
                    ? "border-qsights-blue bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Circle
                  className={`w-5 h-5 flex-shrink-0 ${
                    responses[questionId] === (option.value || option.text)
                      ? "text-qsights-blue fill-qsights-blue"
                      : "text-gray-400"
                  }`}
                />
                <span className="text-base font-medium text-gray-900">{option.text || option.label || option.value || `Option ${index + 1}`}</span>
              </div>
            ))}
          </div>
        );

      case "multiple_choice":
      case "checkbox":
      case "multiple_choice_multiple":
        return (
          <div className="space-y-3">
            {question.options?.map((option: any, index: number) => {
              const optionValue = option.value || option.text;
              const isSelected = (responses[questionId] || []).includes(optionValue);
              return (
                <div
                  key={index}
                  onClick={() => handleMultipleChoiceToggle(questionId, optionValue)}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isSelected ? "border-qsights-blue bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Square
                    className={`w-5 h-5 flex-shrink-0 ${isSelected ? "text-qsights-blue fill-qsights-blue" : "text-gray-400"}`}
                  />
                  <span className="text-base font-medium text-gray-900">{option.text || option.label || option.value || `Option ${index + 1}`}</span>
                </div>
              );
            })}
          </div>
        );

      case "rating":
      case "scale":
        const maxRating = question.max_value || 5;
        return (
          <div className="flex items-center gap-2">
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
              <button
                key={rating}
                onClick={() => handleResponseChange(questionId, rating)}
                className={`w-12 h-12 rounded-lg border-2 font-semibold transition-all ${
                  responses[questionId] === rating
                    ? "border-qsights-blue bg-qsights-blue text-white"
                    : "border-gray-300 text-gray-600 hover:border-qsights-blue"
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        );

      case "star_rating":
        const maxStars = question.max_value || 5;
        return (
          <div className="flex items-center gap-1">
            {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
              <button
                key={star}
                onClick={() => handleResponseChange(questionId, star)}
                className="p-1 hover:scale-110 transition-transform"
              >
                <Star
                  className={`w-8 h-8 ${
                    responses[questionId] >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
        );

      case "date":
        return (
          <div className="space-y-2">
            <Input
              type="date"
              value={responses[questionId] || ""}
              onChange={(e) => handleResponseChange(questionId, e.target.value)}
              className="w-full"
            />
          </div>
        );

      case "dropdown":
      case "select":
        return (
          <div className="space-y-2">
            <select
              value={responses[questionId] || ""}
              onChange={(e) => handleResponseChange(questionId, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
            >
              <option value="">Select an option...</option>
              {question.options?.map((option: any, index: number) => (
                <option key={index} value={option.value || option.text}>
                  {option.text || option.label}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        return (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Question type: {question.type}</p>
            <Input
              type="text"
              placeholder="Enter your answer..."
              value={responses[questionId] || ""}
              onChange={(e) => handleResponseChange(questionId, e.target.value)}
              className="w-full mt-2"
            />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-qsights-blue mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Loading activity preview...</p>
        </div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">{error || "Activity not found"}</p>
          <button
            onClick={() => router.push("/activities")}
            className="mt-4 px-4 py-2 bg-qsights-blue text-white rounded-lg"
          >
            Back to Activities
          </button>
        </div>
      </div>
    );
  }

  const currentSection = questionnaire?.sections?.[currentSectionIndex];
  const totalSections = questionnaire?.sections?.length || 0;

  // Apply conditional logic filtering to all sections
  const allFilteredSections = useMemo(() => {
    if (!questionnaire?.sections) return [];
    return questionnaire.sections.map((section: any) => {
      const sectionWithQuestionnaire = {
        ...section,
        questions: section.questions || [],
        questionnaire: questionnaire
      };
      const filteredQuestions = filterQuestionsByLogic(
        section.questions || [],
        responses,
        sectionWithQuestionnaire
      );
      return { ...section, questions: filteredQuestions };
    });
  }, [questionnaire, responses]);

  // Get filtered questions for current section
  const currentSectionFiltered = useMemo(() => {
    if (!allFilteredSections.length || currentSectionIndex >= allFilteredSections.length) {
      return [];
    }
    return allFilteredSections[currentSectionIndex]?.questions || [];
  }, [allFilteredSections, currentSectionIndex]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/activities")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Activity Preview</h1>
              <p className="text-sm text-gray-500 mt-1">Review activity details</p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/activities/${activityId}/edit`)}
            className="px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors"
          >
            Edit Activity
          </button>
        </div>

        {/* Activity Header - Enhanced */}
        <Card className="overflow-hidden border-2 border-gray-200 hover:border-blue-300 transition-all shadow-md hover:shadow-xl">
          <CardHeader className="border-b-0 bg-gradient-to-r from-qsights-blue via-blue-600 to-indigo-600 text-white p-6">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold">{activity.name}</CardTitle>
              {activity.description && <p className="text-sm text-white/90">{activity.description}</p>}
            </div>
          </CardHeader>
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 relative overflow-hidden">
            {/* Decorative Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-16 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-12 blur-2xl"></div>
            </div>
            
            <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Activity Type */}
              <div className="group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg group-hover:bg-white/30 transition-all">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Event Type</p>
                </div>
                <p className="text-xl font-bold text-white capitalize pl-11">{activity.type}</p>
              </div>

              {/* Status */}
              <div className="group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg group-hover:bg-white/30 transition-all">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        activity.status === "live"
                          ? "bg-green-400"
                          : activity.status === "draft"
                          ? "bg-gray-300"
                          : (activity.status as string) === "paused"
                          ? "bg-yellow-400"
                          : "bg-red-400"
                      }`}
                    />
                  </div>
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Status</p>
                </div>
                <div className="pl-11">
                  <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold ${
                    activity.status === 'live' ? 'bg-green-500 text-white' :
                    activity.status === 'upcoming' ? 'bg-yellow-500 text-white' :
                    activity.status === 'closed' ? 'bg-blue-500 text-white' :
                    activity.status === 'expired' ? 'bg-red-500 text-white' :
                    'bg-gray-500 text-white'
                  } shadow-lg capitalize`}>
                    {activity.status}
                  </span>
                </div>
              </div>

              {/* Start Date */}
              {activity.start_date && (
                <div className="group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg group-hover:bg-white/30 transition-all">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Start Date</p>
                  </div>
                  <p className="text-lg font-bold text-white pl-11">
                    {new Date(activity.start_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              )}

              {/* End Date */}
              {activity.end_date && (
                <div className="group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg group-hover:bg-white/30 transition-all">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">End Date</p>
                  </div>
                  <p className="text-lg font-bold text-white pl-11">
                    {new Date(activity.end_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Preview Note */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> This is a preview of the activity. Use the Edit button above to make changes, or
            return to the activities list.
          </p>
        </div>

        {/* Questionnaire Content */}
        {questionnaire && questionnaire.sections && questionnaire.sections.length > 0 ? (
          <>
            {/* Section Progress */}
            {totalSections > 1 && (
              <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Section {currentSectionIndex + 1} of {totalSections}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{currentSection?.title || "Untitled Section"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {questionnaire.sections.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 rounded-full transition-all ${
                          index === currentSectionIndex ? "w-8 bg-qsights-blue" : "w-2 bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Current Section */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold">{currentSection?.title || "Questionnaire"}</CardTitle>
                {currentSection?.description && (
                  <p className="text-sm text-gray-600 mt-2">{currentSection.description}</p>
                )}
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {currentSectionFiltered && currentSectionFiltered.length > 0 ? (
                  currentSectionFiltered.map((question: any, index: number) => (
                    <div key={question.id || index} className="space-y-3 pb-6 border-b border-gray-200 last:border-0">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-qsights-blue text-white rounded-full text-sm font-semibold">
                          {index + 1}
                        </span>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-base font-semibold text-gray-900 leading-relaxed">
                                {question.text || question.question || "Untitled Question"}
                                {question.required && <span className="text-red-500 ml-1">*</span>}
                              </p>
                              {question.description && (
                                <p className="text-sm text-gray-600 mt-2">{question.description}</p>
                              )}
                            </div>
                            <span className="flex-shrink-0 px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                              {question.type}
                            </span>
                          </div>
                          <div className="mt-4">{renderQuestion(question)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No questions in this section</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1))}
                disabled={currentSectionIndex === 0}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              {currentSectionIndex < totalSections - 1 ? (
                <button
                  onClick={() => setCurrentSectionIndex(currentSectionIndex + 1)}
                  className="px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                  onClick={() => toast({ title: "Info", description: "This is a preview. Responses are not saved.", variant: "default" })}
                >
                  <CheckCircle className="w-4 h-4" />
                  Submit (Preview)
                </button>
              )}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questionnaire Assigned</h3>
              <p className="text-sm text-gray-600 mb-6">
                This activity doesn't have a questionnaire assigned yet.
              </p>
              <button
                onClick={() => router.push(`/activities/${activityId}/edit`)}
                className="px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors"
              >
                Assign Questionnaire
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
