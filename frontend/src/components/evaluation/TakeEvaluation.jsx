import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Star, ThumbsUp, ThumbsDown } from 'lucide-react';

/**
 * TakeEvaluation Component
 * Public form for staff to complete evaluations via token link
 */
const TakeEvaluation = ({ token, apiUrl = '/api' }) => {
  const [evaluation, setEvaluation] = useState(null);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      fetchEvaluation();
    }
  }, [token]);

  const fetchEvaluation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiUrl}/evaluation/take/${token}`);
      const data = await response.json();
      
      if (data.success) {
        setEvaluation(data.evaluation);
        
        // Check if already completed
        if (data.evaluation.status === 'completed') {
          setSubmitted(true);
        }
        
        // Initialize responses
        const initialResponses = {};
        data.evaluation.questions?.forEach((q) => {
          initialResponses[q.id] = '';
        });
        setResponses(initialResponses);
      } else {
        setError(data.message || 'Failed to load evaluation');
      }
    } catch (err) {
      console.error('Failed to fetch evaluation:', err);
      setError('Failed to load evaluation. Please check your link and try again.');
    }
    
    setLoading(false);
  };

  const handleResponseChange = (questionId, value) => {
    setResponses({
      ...responses,
      [questionId]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required questions
    const missingRequired = evaluation.questions.filter(
      q => q.required && !responses[q.id]
    );
    
    if (missingRequired.length > 0) {
      alert('Please answer all required questions');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiUrl}/evaluation/take/${token}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          responses: responses
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'Failed to submit evaluation');
      }
    } catch (err) {
      console.error('Failed to submit evaluation:', err);
      setError('Failed to submit evaluation. Please try again.');
    }
    
    setSubmitting(false);
  };

  const renderQuestionInput = (question) => {
    const value = responses[question.id] || '';

    switch (question.type) {
      case 'rating':
        return (
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleResponseChange(question.id, rating.toString())}
                className={`p-2 rounded-lg transition-colors ${
                  value === rating.toString()
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                <Star
                  className="h-8 w-8"
                  fill={value === rating.toString() ? 'currentColor' : 'none'}
                />
              </button>
            ))}
            {value && (
              <span className="ml-4 text-sm text-gray-600">
                {value} / 5
              </span>
            )}
          </div>
        );

      case 'scale':
        return (
          <div className="space-y-2">
            <input
              type="range"
              min="1"
              max="10"
              value={value || 5}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>1</span>
              <span className="text-base font-semibold">{value || 5}</span>
              <span>10</span>
            </div>
          </div>
        );

      case 'yesno':
        return (
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => handleResponseChange(question.id, 'yes')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                value === 'yes'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <ThumbsUp className="h-6 w-6 mx-auto mb-1" />
              <div className="text-sm font-medium">Yes</div>
            </button>
            <button
              type="button"
              onClick={() => handleResponseChange(question.id, 'no')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                value === 'no'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <ThumbsDown className="h-6 w-6 mx-auto mb-1" />
              <div className="text-sm font-medium">No</div>
            </button>
          </div>
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            rows="4"
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Enter your response..."
          />
        );

      case 'text':
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Enter your response..."
          />
        );
    }
  };

  // Loading State
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

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="mt-4 text-center text-xl font-semibold text-gray-900">Error Loading Evaluation</h2>
          <p className="mt-2 text-center text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Success State
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="mt-4 text-center text-xl font-semibold text-gray-900">Evaluation Submitted</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Thank you for completing the evaluation. Your responses have been recorded.
          </p>
          {evaluation?.evaluatee_name && (
            <p className="mt-4 text-center text-sm text-gray-500">
              Evaluation for: <span className="font-medium">{evaluation.evaluatee_name}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Main Form
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-8">
            <h1 className="text-2xl font-bold text-white">
              {evaluation.template_name || 'Staff Evaluation'}
            </h1>
            {evaluation.template_description && (
              <p className="mt-2 text-blue-100">{evaluation.template_description}</p>
            )}
            {evaluation.evaluatee_name && (
              <div className="mt-4 bg-blue-500 rounded-lg p-4">
                <p className="text-sm text-blue-100">You are evaluating:</p>
                <p className="text-lg font-semibold text-white">{evaluation.evaluatee_name}</p>
                {evaluation.evaluatee_role && (
                  <p className="text-sm text-blue-100">{evaluation.evaluatee_role}</p>
                )}
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-8">
            <div className="space-y-8">
              {evaluation.questions?.map((question, index) => (
                <div key={question.id} className="pb-8 border-b border-gray-200 last:border-b-0">
                  <label className="block text-base font-medium text-gray-900 mb-4">
                    {index + 1}. {question.question}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderQuestionInput(question)}
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Submit Evaluation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>All responses are confidential and will be used for performance review purposes.</p>
        </div>
      </div>
    </div>
  );
};

export default TakeEvaluation;
