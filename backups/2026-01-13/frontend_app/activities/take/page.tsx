"use client";

import React, { useState } from "react";
import ParticipantLayout from "@/components/participant-layout";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function TakeActivityPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [answers, setAnswers] = useState<{ [key: number]: any }>({});
  const [savedProgress, setSavedProgress] = useState(false);

  // Mock activity data
  const activity = {
    title: "Employee Satisfaction Survey Q1",
    description: "Help us understand your experience and improve our workplace",
    totalQuestions: 8,
    estimatedTime: "10 minutes",
  };

  const questions = [
    {
      id: 1,
      type: "text",
      question: "What is your employee ID?",
      required: true,
      placeholder: "Enter your employee ID",
    },
    {
      id: 2,
      type: "mcq",
      question: "What is your department?",
      required: true,
      options: ["Engineering", "Sales", "Marketing", "HR", "Operations", "Other"],
    },
    {
      id: 3,
      type: "rating",
      question: "How satisfied are you with your current role?",
      required: true,
      scale: 5,
    },
    {
      id: 4,
      type: "slider",
      question: "On a scale of 0-100, how likely are you to recommend our company as a great place to work?",
      required: true,
      min: 0,
      max: 100,
    },
    {
      id: 5,
      type: "multi",
      question: "Which of the following benefits are most important to you? (Select all that apply)",
      required: false,
      options: [
        "Health Insurance",
        "Retirement Plans",
        "Flexible Hours",
        "Remote Work",
        "Professional Development",
        "Paid Time Off",
      ],
    },
    {
      id: 6,
      type: "text",
      question: "What do you value most about working here?",
      required: true,
      placeholder: "Share your thoughts...",
      multiline: true,
    },
    {
      id: 7,
      type: "matrix",
      question: "Rate the following aspects of your work environment",
      required: true,
      rows: [
        "Physical workspace",
        "Team collaboration",
        "Management support",
        "Work-life balance",
      ],
      columns: ["Poor", "Fair", "Good", "Excellent"],
    },
    {
      id: 8,
      type: "text",
      question: "Any additional feedback or suggestions?",
      required: false,
      placeholder: "Optional: Share any additional thoughts...",
      multiline: true,
    },
  ];

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswer = (value: any) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: value }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSaveProgress = () => {
    setSavedProgress(true);
    setTimeout(() => setSavedProgress(false), 2000);
  };

  const handleSubmit = () => {
    setIsCompleted(true);
    window.scrollTo(0, 0);
  };

  const isQuestionAnswered = () => {
    return answers[currentQ.id] !== undefined && answers[currentQ.id] !== null && answers[currentQ.id] !== "";
  };

  const canProceed = () => {
    if (!currentQ.required) return true;
    return isQuestionAnswered();
  };

  if (isCompleted) {
    return (
      <ParticipantLayout>
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-blue-50">
          <Card className="w-full max-w-2xl">
            <CardContent className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Thank You!
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Your responses have been submitted successfully.
              </p>
              <div className="space-y-4 text-left bg-gray-50 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Activity</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {activity.title}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Questions Answered</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {Object.keys(answers).length} / {questions.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completion Date</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {new Date().toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 justify-center">
                <a
                  href="/participant"
                  className="px-6 py-3 bg-qsights-blue text-white rounded-lg font-medium hover:bg-qsights-blue/90 transition-colors"
                >
                  Back to Dashboard
                </a>
                <button className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                  View My Activities
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ParticipantLayout>
    );
  }

  return (
    <ParticipantLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="mb-6">
            <a
              href="/participant"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </a>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {activity.title}
                  </h1>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{activity.estimatedTime}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">
                    Question {currentQuestion + 1} of {questions.length}
                  </span>
                  <span className="text-gray-500">{Math.round(progress)}% Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-qsights-blue h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Question Card */}
          <Card className="mb-6 shadow-md">
            <CardContent className="p-8">
              {/* Question Header */}
              <div className="mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-qsights-blue text-white rounded-full font-bold flex-shrink-0">
                    {currentQuestion + 1}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {(currentQ as any).isRichText && (currentQ as any).formattedQuestion ? (
                        <span dangerouslySetInnerHTML={{ __html: (currentQ as any).formattedQuestion }} />
                      ) : (
                        <span>{currentQ.question}</span>
                      )}
                      {currentQ.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </h2>
                    {!currentQ.required && (
                      <span className="text-xs text-gray-500 italic">Optional</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Answer Input */}
              <div className="mb-8">
                {/* Text Input */}
                {currentQ.type === "text" && (
                  <div>
                    {currentQ.multiline ? (
                      <textarea
                        value={answers[currentQ.id] || ""}
                        onChange={(e) => handleAnswer(e.target.value)}
                        placeholder={currentQ.placeholder}
                        rows={6}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                      />
                    ) : (
                      <input
                        type="text"
                        value={answers[currentQ.id] || ""}
                        onChange={(e) => handleAnswer(e.target.value)}
                        placeholder={currentQ.placeholder}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                      />
                    )}
                  </div>
                )}

                {/* Multiple Choice */}
                {currentQ.type === "mcq" && (
                  <div className="space-y-3">
                    {currentQ.options?.map((option, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          answers[currentQ.id] === option
                            ? "border-qsights-blue bg-blue-50"
                            : "border-gray-300 hover:border-gray-400 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQ.id}`}
                          value={option}
                          checked={answers[currentQ.id] === option}
                          onChange={(e) => handleAnswer(e.target.value)}
                          className="w-5 h-5 text-qsights-blue"
                        />
                        {(currentQ as any).isRichText && (currentQ as any).formattedOptions?.[idx] ? (
                          <span className="text-base text-gray-900" dangerouslySetInnerHTML={{ __html: (currentQ as any).formattedOptions[idx] }} />
                        ) : (
                          <span className="text-base text-gray-900">{option}</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}

                {/* Multi-Select */}
                {currentQ.type === "multi" && (
                  <div className="space-y-3">
                    {currentQ.options?.map((option, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          answers[currentQ.id]?.includes(option)
                            ? "border-qsights-blue bg-blue-50"
                            : "border-gray-300 hover:border-gray-400 bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={option}
                          checked={answers[currentQ.id]?.includes(option) || false}
                          onChange={(e) => {
                            const current = answers[currentQ.id] || [];
                            const newValue = e.target.checked
                              ? [...current, option]
                              : current.filter((v: string) => v !== option);
                            handleAnswer(newValue);
                          }}
                          className="w-5 h-5 text-qsights-blue rounded"
                        />
                        {(currentQ as any).isRichText && (currentQ as any).formattedOptions?.[idx] ? (
                          <span className="text-base text-gray-900" dangerouslySetInnerHTML={{ __html: (currentQ as any).formattedOptions[idx] }} />
                        ) : (
                          <span className="text-base text-gray-900">{option}</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}

                {/* Rating */}
                {currentQ.type === "rating" && (
                  <div className="flex justify-center gap-4 py-4">
                    {Array.from({ length: currentQ.scale || 5 }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(idx + 1)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-12 h-12 ${
                            answers[currentQ.id] > idx
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Slider */}
                {currentQ.type === "slider" && (
                  <div className="space-y-4 py-4">
                    <div className="text-center">
                      <span className="text-4xl font-bold text-qsights-blue">
                        {answers[currentQ.id] || 50}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={currentQ.min}
                      max={currentQ.max}
                      value={answers[currentQ.id] || 50}
                      onChange={(e) => handleAnswer(parseInt(e.target.value))}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-qsights-blue"
                    />
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{currentQ.min}</span>
                      <span>{currentQ.max}</span>
                    </div>
                  </div>
                )}

                {/* Matrix */}
                {currentQ.type === "matrix" && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="p-3 text-left border-b-2 border-gray-300"></th>
                          {currentQ.columns?.map((col, idx) => (
                            <th
                              key={idx}
                              className="p-3 text-center border-b-2 border-gray-300 text-sm font-semibold text-gray-700"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentQ.rows?.map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-b border-gray-200">
                            <td className="p-3 text-sm font-medium text-gray-900">
                              {row}
                            </td>
                            {currentQ.columns?.map((col, colIdx) => (
                              <td key={colIdx} className="p-3 text-center">
                                <input
                                  type="radio"
                                  name={`matrix-${currentQ.id}-${rowIdx}`}
                                  checked={
                                    answers[currentQ.id]?.[row] === col
                                  }
                                  onChange={() => {
                                    const current = answers[currentQ.id] || {};
                                    handleAnswer({ ...current, [row]: col });
                                  }}
                                  className="w-5 h-5 text-qsights-blue cursor-pointer"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Validation Message */}
              {currentQ.required && !canProceed() && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    This question is required. Please provide an answer to continue.
                  </p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between gap-4 pt-6 border-t border-gray-200">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveProgress}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    Save Progress
                  </button>

                  {currentQuestion < questions.length - 1 ? (
                    <button
                      onClick={handleNext}
                      disabled={currentQ.required && !canProceed()}
                      className="flex items-center gap-2 px-6 py-3 bg-qsights-blue text-white rounded-lg font-medium hover:bg-qsights-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={currentQ.required && !canProceed()}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Submit
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Progress Notification */}
          {savedProgress && (
            <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Progress saved successfully!</span>
            </div>
          )}

          {/* Question Navigation */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Question Navigation
              </h3>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestion(idx)}
                    className={`w-10 h-10 rounded-lg font-medium text-sm transition-all ${
                      idx === currentQuestion
                        ? "bg-qsights-blue text-white"
                        : answers[q.id] !== undefined
                        ? "bg-green-100 text-green-700 border-2 border-green-300"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ParticipantLayout>
  );
}
