'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Star, Send, CheckCircle, Loader2, AlertCircle, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

interface Question {
  question: string;
  type: 'rating' | 'mcq' | 'text';
  options?: string[];
  scale?: number;
  description?: string;
}

interface Subordinate {
  id: string;
  name: string;
  email: string;
  employee_id?: string;
}

interface EvaluationData {
  id: string;
  template_name: string;
  template_questions: Question[];
  evaluator_name: string;
  subordinates: Subordinate[];
  status: string;
}

interface Response {
  [subordinateId: string]: {
    [questionIndex: number]: string | number;
  };
}

export default function TakeEvaluationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const evaluationId = params.id as string;
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Response>({});
  const [currentSubIndex, setCurrentSubIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  
  // API URL - handle both formats (with or without /api suffix)
  const getApiUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://prod.qsights.com/api';
    // Remove trailing /api if present to avoid duplication
    return baseUrl.replace(/\/api\/?$/, '');
  };
  const API_BASE = getApiUrl();

  useEffect(() => {
    const fetchEvaluation = async () => {
      if (!evaluationId || !token) {
        setError('Invalid evaluation link');
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`${API_BASE}/api/evaluation/triggered/${evaluationId}?token=${token}`);
        const data = await response.json();
        
        if (data.success && data.evaluation) {
          if (data.evaluation.status === 'completed') {
            setCompleted(true);
          }
          setEvaluation(data.evaluation);
          
          // Initialize responses structure
          const initialResponses: Response = {};
          data.evaluation.subordinates.forEach((sub: Subordinate) => {
            initialResponses[sub.id] = {};
          });
          setResponses(initialResponses);
        } else {
          setError(data.message || 'Failed to load evaluation');
        }
      } catch (err) {
        setError('Failed to load evaluation. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvaluation();
  }, [evaluationId, token, API_BASE]);

  const handleResponseChange = (subId: string, questionIndex: number, value: string | number) => {
    setResponses(prev => ({
      ...prev,
      [subId]: {
        ...prev[subId],
        [questionIndex]: value
      }
    }));
  };

  const calculateProgress = () => {
    if (!evaluation) return 0;
    const totalQuestions = evaluation.subordinates.length * evaluation.template_questions.length;
    let answered = 0;
    
    Object.values(responses).forEach(subResponses => {
      answered += Object.keys(subResponses).length;
    });
    
    return Math.round((answered / totalQuestions) * 100);
  };

  const handleSubmit = async () => {
    if (!evaluation || !token) return;
    
    // Check if all questions are answered
    const totalQuestions = evaluation.subordinates.length * evaluation.template_questions.length;
    let answered = 0;
    Object.values(responses).forEach(subResponses => {
      answered += Object.keys(subResponses).length;
    });
    
    if (answered < totalQuestions) {
      toast.error('Please answer all questions before submitting');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const response = await fetch(`${API_BASE}/api/evaluation/triggered/${evaluationId}/submit?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ responses })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Evaluation submitted successfully!');
        setCompleted(true);
      } else {
        toast.error(data.message || 'Failed to submit evaluation');
      }
    } catch (err) {
      toast.error('Failed to submit evaluation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentSubordinate = evaluation?.subordinates[currentSubIndex];
  const questions = evaluation?.template_questions || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading evaluation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Evaluation Complete!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for completing the evaluation. Your feedback has been recorded.
          </p>
          <p className="text-sm text-gray-500">You may close this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">{evaluation?.template_name}</h1>
          <p className="text-gray-600 mt-1">
            Welcome, <span className="font-medium">{evaluation?.evaluator_name}</span>
          </p>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{calculateProgress()}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${calculateProgress()}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Team member tabs */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3">
            {evaluation?.subordinates.map((sub, index) => {
              const subResponses = responses[sub.id] || {};
              const answeredCount = Object.keys(subResponses).length;
              const isComplete = answeredCount === questions.length;
              
              return (
                <button
                  key={sub.id}
                  onClick={() => setCurrentSubIndex(index)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
                    currentSubIndex === index
                      ? 'bg-purple-100 text-purple-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>{sub.name}</span>
                  {isComplete && <CheckCircle className="h-4 w-4 text-green-500" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Evaluation form */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {currentSubordinate && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{currentSubordinate.name}</h2>
                <p className="text-sm text-gray-500">{currentSubordinate.email}</p>
              </div>
            </div>

            <div className="space-y-8">
              {questions.map((question, qIndex) => (
                <div key={qIndex} className="border-b pb-6 last:border-b-0">
                  <label className="block text-lg font-medium text-gray-900 mb-2">
                    {qIndex + 1}. {question.question}
                  </label>
                  {question.description && (
                    <p className="text-sm text-gray-500 mb-4">{question.description}</p>
                  )}

                  {/* Rating type */}
                  {question.type === 'rating' && (
                    <div className="flex gap-2 mt-3">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const currentValue = responses[currentSubordinate.id]?.[qIndex] || 0;
                        return (
                          <button
                            key={star}
                            onClick={() => handleResponseChange(currentSubordinate.id, qIndex, star)}
                            className={`p-2 rounded-lg transition ${
                              currentValue >= star
                                ? 'bg-yellow-100 text-yellow-500'
                                : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                            }`}
                          >
                            <Star className={`h-8 w-8 ${currentValue >= star ? 'fill-current' : ''}`} />
                          </button>
                        );
                      })}
                      <span className="ml-4 self-center text-gray-500">
                        {responses[currentSubordinate.id]?.[qIndex] 
                          ? `${responses[currentSubordinate.id][qIndex]} / 5` 
                          : 'Select rating'}
                      </span>
                    </div>
                  )}

                  {/* MCQ type */}
                  {question.type === 'mcq' && question.options && (
                    <div className="space-y-2 mt-3">
                      {question.options.map((option, optIndex) => (
                        <label
                          key={optIndex}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                            responses[currentSubordinate.id]?.[qIndex] === option
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${currentSubordinate.id}-${qIndex}`}
                            checked={responses[currentSubordinate.id]?.[qIndex] === option}
                            onChange={() => handleResponseChange(currentSubordinate.id, qIndex, option)}
                            className="w-4 h-4 text-purple-600"
                          />
                          <span className="text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Text type */}
                  {question.type === 'text' && (
                    <textarea
                      value={responses[currentSubordinate.id]?.[qIndex] || ''}
                      onChange={(e) => handleResponseChange(currentSubordinate.id, qIndex, e.target.value)}
                      className="w-full mt-3 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                      rows={3}
                      placeholder="Enter your feedback..."
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentSubIndex(Math.max(0, currentSubIndex - 1))}
            disabled={currentSubIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
            Previous
          </button>
          
          <span className="text-gray-500">
            {currentSubIndex + 1} of {evaluation?.subordinates.length}
          </span>
          
          {currentSubIndex < (evaluation?.subordinates.length || 0) - 1 ? (
            <button
              onClick={() => setCurrentSubIndex(currentSubIndex + 1)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || calculateProgress() < 100}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Submit Evaluation
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
