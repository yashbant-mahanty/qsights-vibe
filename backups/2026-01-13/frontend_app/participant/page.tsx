"use client";

import React, { useState } from "react";
import ParticipantLayout from "@/components/participant-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  Calendar,
  Clock,
  Globe,
  CheckCircle,
  PlayCircle,
  Circle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

export default function ParticipantDashboard() {
  const [selectedLanguage, setSelectedLanguage] = useState("EN");

  const activities = [
    {
      id: 1,
      name: "Employee Engagement Survey 2025",
      type: "Survey",
      description: "Share your thoughts on workplace culture and engagement",
      status: "not-started",
      dueDate: "Dec 15, 2025",
      estimatedTime: "15 mins",
      priority: "high",
      multilingual: true,
      availableLanguages: ["EN", "ES", "FR", "DE"],
      progress: 0,
    },
    {
      id: 2,
      name: "Product Feedback Poll",
      type: "Poll",
      description: "Quick poll about our new product features",
      status: "in-progress",
      dueDate: "Dec 10, 2025",
      estimatedTime: "5 mins",
      priority: "medium",
      multilingual: true,
      availableLanguages: ["EN", "ES"],
      progress: 45,
    },
    {
      id: 3,
      name: "Skills Assessment Q4",
      type: "Assessment",
      description: "Quarterly skills evaluation and development plan",
      status: "completed",
      dueDate: "Dec 8, 2025",
      estimatedTime: "30 mins",
      priority: "high",
      multilingual: false,
      availableLanguages: ["EN"],
      progress: 100,
      completedDate: "Dec 5, 2025",
    },
    {
      id: 4,
      name: "Customer Satisfaction Survey",
      type: "Survey",
      description: "Help us improve by sharing your customer experience",
      status: "not-started",
      dueDate: "Dec 20, 2025",
      estimatedTime: "10 mins",
      priority: "medium",
      multilingual: true,
      availableLanguages: ["EN", "ES", "FR"],
      progress: 0,
    },
    {
      id: 5,
      name: "Training Effectiveness Assessment",
      type: "Assessment",
      description: "Evaluate the recent training program effectiveness",
      status: "in-progress",
      dueDate: "Dec 18, 2025",
      estimatedTime: "20 mins",
      priority: "low",
      multilingual: true,
      availableLanguages: ["EN", "DE"],
      progress: 60,
    },
    {
      id: 6,
      name: "Monthly Team Feedback",
      type: "Poll",
      description: "Quick check-in on team dynamics and collaboration",
      status: "completed",
      dueDate: "Dec 1, 2025",
      estimatedTime: "3 mins",
      priority: "low",
      multilingual: false,
      availableLanguages: ["EN"],
      progress: 100,
      completedDate: "Nov 30, 2025",
    },
  ];

  const stats = [
    {
      title: "Total Activities",
      value: activities.length,
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "In Progress",
      value: activities.filter((a) => a.status === "in-progress").length,
      icon: PlayCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Completed",
      value: activities.filter((a) => a.status === "completed").length,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Not Started",
      value: activities.filter((a) => a.status === "not-started").length,
      icon: Circle,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
    },
  ];

  const getStatusConfig = (status: string) => {
    const configs: { [key: string]: { label: string; color: string; icon: any } } = {
      "not-started": {
        label: "Not Started",
        color: "bg-gray-100 text-gray-700 border-gray-300",
        icon: Circle,
      },
      "in-progress": {
        label: "In Progress",
        color: "bg-orange-100 text-orange-700 border-orange-300",
        icon: PlayCircle,
      },
      completed: {
        label: "Completed",
        color: "bg-green-100 text-green-700 border-green-300",
        icon: CheckCircle,
      },
    };
    return configs[status];
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      high: "bg-red-100 text-red-700",
      medium: "bg-yellow-100 text-yellow-700",
      low: "bg-blue-100 text-blue-700",
    };
    return colors[priority];
  };

  const getLanguageBadgeColor = (code: string) => {
    const colors: { [key: string]: string } = {
      EN: "border-blue-500 text-blue-700 bg-blue-50",
      ES: "border-red-500 text-red-700 bg-red-50",
      FR: "border-purple-500 text-purple-700 bg-purple-50",
      DE: "border-yellow-600 text-yellow-800 bg-yellow-50",
      IT: "border-green-500 text-green-700 bg-green-50",
    };
    return colors[code] || "border-gray-500 text-gray-700 bg-gray-50";
  };

  return (
    <ParticipantLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track and complete your assigned activities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Calendar className="w-4 h-4 inline mr-2" />
              This Month
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} ${stat.color} p-3 rounded-xl`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activities List */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">My Activities</CardTitle>
              <div className="flex items-center gap-2">
                <select className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
                  <option>All Status</option>
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
                <select className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
                  <option>All Types</option>
                  <option>Surveys</option>
                  <option>Polls</option>
                  <option>Assessments</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {activities.map((activity) => {
                const statusConfig = getStatusConfig(activity.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={activity.id}
                    className="p-5 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all"
                  >
                    {/* Activity Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-base font-bold text-gray-900">
                            {activity.name}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}
                          >
                            <StatusIcon className="w-3 h-3 inline mr-1" />
                            {statusConfig.label}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(
                              activity.priority
                            )}`}
                          >
                            {activity.priority.charAt(0).toUpperCase() +
                              activity.priority.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Activity className="w-4 h-4" />
                            {activity.type}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Due: {activity.dueDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {activity.estimatedTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar (for in-progress activities) */}
                    {activity.status === "in-progress" && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">
                            Progress
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {activity.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500"
                            style={{ width: `${activity.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Completed Date */}
                    {activity.status === "completed" && activity.completedDate && (
                      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700">
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          Completed on {activity.completedDate}
                        </p>
                      </div>
                    )}

                    {/* Language Selector & Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        {activity.multilingual && (
                          <>
                            <Globe className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600 mr-2">
                              Language:
                            </span>
                            <div className="flex items-center gap-1">
                              {activity.availableLanguages.map((lang) => (
                                <button
                                  key={lang}
                                  onClick={() => setSelectedLanguage(lang)}
                                  className={`px-2 py-1 rounded-md text-xs font-bold border-2 transition-all ${
                                    selectedLanguage === lang
                                      ? getLanguageBadgeColor(lang)
                                      : "border-gray-300 text-gray-500 bg-gray-50 hover:border-gray-400"
                                  }`}
                                >
                                  {lang}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {activity.status === "not-started" && (
                          <button className="px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors">
                            Start Activity
                          </button>
                        )}
                        {activity.status === "in-progress" && (
                          <button className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">
                            Continue
                          </button>
                        )}
                        {activity.status === "completed" && (
                          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">
                            View Results
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </ParticipantLayout>
  );
}
