"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Play,
  Pause,
  Clock,
  Radio,
  CheckSquare,
  Star,
  Type,
  List,
  RefreshCw,
  AlertCircle,
  Timer,
  Zap,
  StopCircle,
} from "lucide-react";
import { activitiesApi } from "@/lib/api";
import { toast } from "@/components/ui/toast";

interface Question {
  id: string;
  question_number?: number; // Global question number matching participant view
  title: string;
  type: string;
  order: number;
  section_id?: number;
  section_name: string;
  is_live_active: boolean;
  live_timer_seconds: number | null;
  live_activated_at: string | null;
}

interface QuestionActivationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activityId: string;
  activityName: string;
}

const questionTypeIcons: Record<string, React.ReactNode> = {
  radio: <Radio className="w-4 h-4" />,
  checkbox: <CheckSquare className="w-4 h-4" />,
  rating: <Star className="w-4 h-4" />,
  text: <Type className="w-4 h-4" />,
  textarea: <Type className="w-4 h-4" />,
  select: <List className="w-4 h-4" />,
  scale: <Star className="w-4 h-4" />,
  single_choice: <Radio className="w-4 h-4" />,
  multiple_choice: <CheckSquare className="w-4 h-4" />,
};

export default function QuestionActivationPanel({
  isOpen,
  onClose,
  activityId,
  activityName,
}: QuestionActivationPanelProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [noTimerFlags, setNoTimerFlags] = useState<Record<string, boolean>>({});
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [deactivatingAll, setDeactivatingAll] = useState(false);

  // Calculate remaining time for active questions
  const calculateRemainingTime = useCallback((question: Question): number | null => {
    if (!question.is_live_active || !question.live_timer_seconds || !question.live_activated_at) {
      return null;
    }
    // Ensure proper ISO date parsing
    const activatedAt = new Date(question.live_activated_at).getTime();
    if (isNaN(activatedAt)) {
      console.warn('Invalid live_activated_at format:', question.live_activated_at);
      return null;
    }
    const now = Date.now();
    const elapsed = Math.floor((now - activatedAt) / 1000);
    return Math.max(0, question.live_timer_seconds - elapsed);
  }, []);

  // Load questions
  const loadQuestions = useCallback(async () => {
    if (!activityId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await activitiesApi.getLiveQuestions(activityId);
      setQuestions(data.questions || []);
      
      // Initialize timers for active questions (use string keys for consistency)
      const newTimers: Record<string, number> = {};
      (data.questions || []).forEach((q: Question) => {
        newTimers[String(q.id)] = q.live_timer_seconds || 60;
      });
      setTimers(newTimers);
    } catch (err: any) {
      console.error('Failed to load questions:', err);
      setError(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  // Initial load
  useEffect(() => {
    if (isOpen && activityId) {
      loadQuestions();
    }
  }, [isOpen, activityId, loadQuestions]);

  // Real-time countdown display for active questions
  // NOTE: Timer is ONLY for display - questions stay active until MANUALLY deactivated
  // When timer expires, participants can no longer answer, but question remains visible
  useEffect(() => {
    if (!isOpen) return;

    // Just trigger re-render every second to update the timer display
    const interval = setInterval(() => {
      setQuestions(prev => [...prev]); // Force re-render to update timer display
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Activate question
  const handleActivate = async (questionId: string) => {
    setActivatingId(questionId);
    try {
      const timerSeconds = timers[questionId];
      const isNoTimer = noTimerFlags[questionId] || !timerSeconds || timerSeconds === 0;
      // If no timer selected or timer is 0/empty, don't send timer_seconds (unlimited time)
      await activitiesApi.activateLiveQuestion(activityId, questionId, {
        timer_seconds: isNoTimer ? undefined : timerSeconds,
        deactivate_others: false, // Multiple active questions allowed - each question stays active until manually deactivated
      });
      
      toast({
        title: "Question Activated",
        description: "The question is now live for participants",
        variant: "success",
      });
      
      // Refresh questions
      await loadQuestions();
    } catch (err: any) {
      console.error('Failed to activate question:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to activate question",
        variant: "error",
      });
    } finally {
      setActivatingId(null);
    }
  };

  // Deactivate question
  const handleDeactivate = async (questionId: string, silent = false) => {
    // Prevent double clicks
    if (deactivatingId === questionId) return;
    
    setDeactivatingId(questionId);
    try {
      await activitiesApi.deactivateLiveQuestion(activityId, questionId);
      
      if (!silent) {
        toast({
          title: "Question Deactivated",
          description: "The question is no longer live",
          variant: "success",
        });
      }
      
      // Refresh questions
      await loadQuestions();
    } catch (err: any) {
      console.error('Failed to deactivate question:', err);
      if (!silent) {
        toast({
          title: "Error",
          description: err.message || "Failed to deactivate question",
          variant: "error",
        });
      }
    } finally {
      setDeactivatingId(null);
    }
  };

  // Deactivate all questions
  const handleDeactivateAll = async () => {
    setDeactivatingAll(true);
    try {
      const result = await activitiesApi.deactivateAllLiveQuestions(activityId);
      
      toast({
        title: "All Questions Stopped",
        description: `Successfully stopped ${result.deactivated_count} active question(s)`,
        variant: "success",
      });
      
      // Refresh questions
      await loadQuestions();
    } catch (err: any) {
      console.error('Failed to deactivate all questions:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to stop questions",
        variant: "error",
      });
    } finally {
      setDeactivatingAll(false);
    }
  };

  // Update timer input
  const handleTimerChange = (questionId: string, value: string) => {
    const numValue = parseInt(value, 10);
    setTimers(prev => ({
      ...prev,
      [questionId]: isNaN(numValue) ? 0 : Math.min(3600, Math.max(0, numValue)),
    }));
  };

  // Format remaining time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const activeQuestion = questions.find(q => q.is_live_active);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-[700px] max-w-[95vw] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Live Question Control</h2>
              <p className="text-purple-100 text-sm">{activityName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Active Question Banner */}
        {activeQuestion && (
          <div className="p-3 bg-green-50 border-b border-green-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-800 font-medium text-sm">
                Live: Q{activeQuestion.order + 1} - {activeQuestion.title.substring(0, 40)}...
              </span>
              {activeQuestion.live_timer_seconds && activeQuestion.live_activated_at && (
                <span className="px-2 py-1 bg-green-100 rounded text-green-700 text-xs font-mono flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  {formatTime(calculateRemainingTime(activeQuestion) || 0)}
                </span>
              )}
            </div>
            <button
              onClick={handleDeactivateAll}
              disabled={deactivatingAll}
              className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deactivatingAll ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600" />
              ) : (
                <StopCircle className="w-3 h-3" />
              )}
              {deactivatingAll ? 'Stopping...' : 'Stop All'}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              <span className="ml-3 text-gray-600">Loading questions...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
              <p className="text-red-600 font-medium">{error}</p>
              <button
                onClick={loadQuestions}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600">No questions found in this poll</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-gray-100 rounded-lg text-xs font-semibold text-gray-600 uppercase">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Question</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Timer (sec)</div>
                <div className="col-span-2 text-center">Status</div>
              </div>

              {/* Question Rows */}
              {questions.map((question, index) => {
                const remainingTime = calculateRemainingTime(question);
                const isActive = question.is_live_active;
                const isActivating = activatingId === question.id;

                return (
                  <div
                    key={question.id}
                    className={`grid grid-cols-12 gap-3 p-3 rounded-lg border transition-all ${
                      isActive
                        ? 'bg-green-50 border-green-300 shadow-md'
                        : 'bg-white border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {/* Question Number - Use question_number from API to match participant view */}
                    <div className="col-span-1 flex items-center">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                        isActive ? 'bg-green-500 text-white' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {question.question_number || (index + 1)}
                      </span>
                    </div>

                    {/* Question Title */}
                    <div className="col-span-5 flex flex-col justify-center">
                      <p className={`text-sm font-medium ${isActive ? 'text-green-800' : 'text-gray-900'}`}>
                        {question.title}
                      </p>
                      <p className="text-xs text-gray-500">{question.section_name}</p>
                    </div>

                    {/* Question Type */}
                    <div className="col-span-2 flex items-center">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {questionTypeIcons[question.type] || <List className="w-3 h-3" />}
                        {question.type}
                      </span>
                    </div>

                    {/* Timer Input */}
                    <div className="col-span-2 flex items-center">
                      {isActive && remainingTime !== null ? (
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm font-mono ${
                          remainingTime <= 10 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-green-100 text-green-700'
                        }`}>
                          <Clock className="w-4 h-4" />
                          {formatTime(remainingTime)}
                        </div>
                      ) : isActive && remainingTime === null ? (
                        <span className="text-xs text-gray-500 italic">No limit</span>
                      ) : noTimerFlags[String(question.id)] ? (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={true}
                            onChange={() => setNoTimerFlags(prev => ({ ...prev, [String(question.id)]: false }))}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="text-xs text-gray-600">No limit</span>
                        </label>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="relative">
                            <input
                              type="number"
                              value={timers[String(question.id)] || ''}
                              onChange={(e) => handleTimerChange(String(question.id), e.target.value)}
                              placeholder="sec"
                              min="1"
                              max="3600"
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              disabled={isActive}
                            />
                          </div>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={() => setNoTimerFlags(prev => ({ ...prev, [String(question.id)]: true }))}
                              className="w-3 h-3 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <span className="text-[10px] text-gray-500">No limit</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="col-span-2 flex items-center justify-center">
                      {isActive ? (
                        <button
                          onClick={() => handleDeactivate(String(question.id))}
                          disabled={deactivatingId === String(question.id)}
                          className="flex items-center justify-center w-12 h-12 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 shadow-lg hover:shadow-red-500/30 disabled:opacity-50"
                          title="Stop Question (Currently Active)"
                        >
                          {deactivatingId === String(question.id) ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <StopCircle className="w-6 h-6" />
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(String(question.id))}
                          disabled={isActivating}
                          className="flex items-center justify-center w-12 h-12 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-200 shadow-lg hover:shadow-green-500/30 disabled:opacity-50"
                          title="Activate Question"
                        >
                          {isActivating ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Play className="w-6 h-6" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex flex-col gap-3">
            {/* Icon Legend */}
            <div className="flex items-center gap-6 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" />
                </div>
                <span>Click to Activate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <StopCircle className="w-4 h-4 text-white" />
                </div>
                <span>Click to Stop (Deactivate)</span>
              </div>
            </div>
            {/* Info and Refresh */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Questions stay active until manually stopped. Timer only limits participant answer time.
              </p>
              <button
                onClick={loadQuestions}
                className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
