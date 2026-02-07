"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { toast } from "@/components/ui/toast";

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
  required: boolean;
  section?: string;
}

interface EvaluationData {
  assignment: {
    id: string;
    evaluation_event_id: string;
    evaluator_id: string;
    evaluatee_id: string;
    evaluator_type: string;
    status: string;
    evaluation_title: string;
    evaluatee_name: string;
    evaluatee_email: string;
    questionnaire_id: string;
  };
  questionnaire: {
    id: string;
    title: string;
    description: string;
    questions: Question[];
  };
  existing_responses?: Record<string, any>;
}

export default function TakeEvaluationPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState<'all' | 'single'>('all');

  useEffect(() => {
    loadEvaluationData();
  }, [assignmentId]);

  async function loadEvaluationData() {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/evaluation/assignments/${assignmentId}/take`);
      if (response.success) {
        setEvaluationData(response.data);
        // Load existing responses if any
        if (response.data.existing_responses) {
          setAnswers(response.data.existing_responses);
        }
      } else {
        toast({ title: "Error", description: response.message || "Failed to load evaluation", variant: "error" });
        router.push('/evaluation/my-evaluations');
      }
    } catch (err) {
      console.error('Error loading evaluation:', err);
      toast({ title: "Error", description: "Failed to load evaluation", variant: "error" });
      router.push('/evaluation/my-evaluations');
    } finally {
      setLoading(false);
    }
  }

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSaveProgress = async () => {
    try {
      setSaving(true);
      const response = await fetchWithAuth(`/evaluation/assignments/${assignmentId}/save-progress`, {
        method: 'POST',
        body: JSON.stringify({ answers })
      });
      if (response.success) {
        toast({ title: "Saved", description: "Your progress has been saved", variant: "success" });
      } else {
        toast({ title: "Error", description: response.message || "Failed to save progress", variant: "error" });
      }
    } catch (err) {
      console.error('Error saving progress:', err);
      toast({ title: "Error", description: "Failed to save progress", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Validate required questions
    const questions = evaluationData?.questionnaire.questions || [];
    const unanswered = questions.filter(q => q.required && !answers[q.id]);
    
    if (unanswered.length > 0) {
      toast({ 
        title: "Incomplete", 
        description: `Please answer all required questions (${unanswered.length} remaining)`, 
        variant: "error" 
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetchWithAuth(`/evaluation/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers })
      });
      if (response.success) {
        toast({ title: "Submitted!", description: "Your evaluation has been submitted successfully", variant: "success" });
        router.push('/evaluation/my-evaluations');
      } else {
        toast({ title: "Error", description: response.message || "Failed to submit evaluation", variant: "error" });
      }
    } catch (err) {
      console.error('Error submitting evaluation:', err);
      toast({ title: "Error", description: "Failed to submit evaluation", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: Question, index: number) => {
    const answer = answers[question.id];

    return (
      <div key={question.id} className="p-4 bg-white border rounded-lg mb-4">
        <div className="flex items-start gap-3 mb-3">
          <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {index + 1}
          </span>
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              {question.text}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </p>
            {question.section && (
              <p className="text-xs text-gray-500 mt-1">Section: {question.section}</p>
            )}
          </div>
        </div>

        <div className="ml-11">
          {question.type === 'rating' && (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleAnswerChange(question.id, rating)}
                  className={`w-12 h-12 rounded-lg border-2 font-semibold transition-all ${
                    answer === rating
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
          )}

          {question.type === 'scale' && (
            <div className="space-y-2">
              <input
                type="range"
                min="1"
                max="10"
                value={answer || 5}
                onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1 - Strongly Disagree</span>
                <span className="font-medium text-blue-600">{answer || 5}</span>
                <span>10 - Strongly Agree</span>
              </div>
            </div>
          )}

          {question.type === 'text' && (
            <textarea
              value={answer || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Enter your response..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          )}

          {question.type === 'multiple_choice' && question.options && (
            <div className="space-y-2">
              {question.options.map((option, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={question.id}
                    checked={answer === option}
                    onChange={() => handleAnswerChange(question.id, option)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          )}

          {question.type === 'checkbox' && question.options && (
            <div className="space-y-2">
              {question.options.map((option, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(answer || []).includes(option)}
                    onChange={(e) => {
                      const currentAnswers = answer || [];
                      if (e.target.checked) {
                        handleAnswerChange(question.id, [...currentAnswers, option]);
                      } else {
                        handleAnswerChange(question.id, currentAnswers.filter((a: string) => a !== option));
                      }
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading evaluation...</p>
        </div>
      </div>
    );
  }

  if (!evaluationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Evaluation not found</p>
          <button
            onClick={() => router.push('/evaluation/my-evaluations')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to My Evaluations
          </button>
        </div>
      </div>
    );
  }

  const questions = evaluationData.questionnaire.questions || [];
  const answeredCount = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '').length;
  const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/evaluation/my-evaluations')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {evaluationData.assignment.evaluation_title}
                </h1>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Evaluating: <strong>{evaluationData.assignment.evaluatee_name}</strong></span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveProgress}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Progress'}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>{answeredCount} of {questions.length} questions answered</span>
              <span>{progress}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Questionnaire Info */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="font-semibold text-gray-900 mb-2">{evaluationData.questionnaire.title}</h2>
            {evaluationData.questionnaire.description && (
              <p className="text-sm text-gray-600">{evaluationData.questionnaire.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((question, index) => renderQuestion(question, index))}
        </div>

        {/* Submit Section */}
        <div className="mt-8 p-6 bg-white border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Ready to submit?</p>
              <p className="text-sm text-gray-600">
                {progress === 100 
                  ? 'All questions answered. You can submit your evaluation.'
                  : `${questions.length - answeredCount} questions remaining`}
              </p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              {submitting ? 'Submitting...' : 'Submit Evaluation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
