"use client";

import React, { useEffect, useState } from "react";
import ProgramAdminLayout from "@/components/program-admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Activity,
  CheckCircle,
  Clock,
  TrendingUp,
  Globe,
  BarChart3,
  Calendar,
  AlertCircle,
  Mail,
  FileText,
  MoreVertical,
  UserCheck,
} from "lucide-react";
import { activitiesApi, participantsApi } from "@/lib/api";

interface UserData {
  userId: string;
  email: string;
  role: string;
  programId?: string;
  organizationId?: string;
}

// Helper functions
function getProgressColor(percentage: number): string {
  if (percentage >= 80) return 'bg-gradient-to-r from-green-500 to-green-600';
  if (percentage >= 50) return 'bg-gradient-to-r from-blue-500 to-blue-600';
  if (percentage >= 30) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
  return 'bg-gradient-to-r from-orange-500 to-orange-600';
}

function getLanguageBadgeColor(code: string): string {
  const colors: { [key: string]: string } = {
    'EN': 'bg-blue-100 text-blue-700 border-blue-300',
    'ES': 'bg-green-100 text-green-700 border-green-300',
    'FR': 'bg-purple-100 text-purple-700 border-purple-300',
    'DE': 'bg-orange-100 text-orange-700 border-orange-300',
    'IT': 'bg-pink-100 text-pink-700 border-pink-300',
    'PT': 'bg-indigo-100 text-indigo-700 border-indigo-300',
    'ZH': 'bg-red-100 text-red-700 border-red-300',
    'JA': 'bg-yellow-100 text-yellow-700 border-yellow-300',
    'KO': 'bg-teal-100 text-teal-700 border-teal-300',
    'AR': 'bg-cyan-100 text-cyan-700 border-cyan-300',
  };
  return colors[code] || 'bg-gray-100 text-gray-700 border-gray-300';
}

export default function ProgramModeratorDashboard() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [activeParticipants, setActiveParticipants] = useState(0);
  const [authenticatedParticipants, setAuthenticatedParticipants] = useState(0);
  const [guestParticipants, setGuestParticipants] = useState(0);
  const [completedActivities, setCompletedActivities] = useState(0);
  const [pendingResponses, setPendingResponses] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [languageDistribution, setLanguageDistribution] = useState<any[]>([]);

  // Stats array for dashboard cards
  const stats = [
    {
      title: 'Total Participants',
      value: `${totalParticipants} (${authenticatedParticipants}/${guestParticipants})`,
      change: '(Participant/Anonymous)',
      trend: 'up' as const,
      icon: Users,
      bgColor: 'bg-blue-50',
      color: 'text-blue-600',
    },
    {
      title: 'Active Participants',
      value: activeParticipants.toString(),
      change: totalParticipants > 0 ? `${Math.round((activeParticipants/totalParticipants)*100)}% of total` : '0% of total',
      trend: 'up' as const,
      icon: UserCheck,
      bgColor: 'bg-green-50',
      color: 'text-green-600',
    },
    {
      title: 'Events Completed',
      value: completedActivities.toString(),
      change: activities.length > 0 ? `${activities.length} total events` : '0 total events',
      trend: 'up' as const,
      icon: CheckCircle,
      bgColor: 'bg-purple-50',
      color: 'text-purple-600',
    },
    {
      title: 'Pending Responses',
      value: pendingResponses.toString(),
      change: pendingResponses > 0 ? 'Needs attention' : 'All current',
      trend: pendingResponses > 0 ? ('down' as const) : ('up' as const),
      icon: AlertCircle,
      bgColor: 'bg-orange-50',
      color: 'text-orange-600',
    },
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      
      // Get current user
      const userResponse = await fetch('/api/auth/me');
      if (!userResponse.ok) {
        window.location.href = '/login';
        return;
      }
      
      const userData = await userResponse.json();
      setCurrentUser(userData.user);
      
      if (!userData.user.programId) {
        console.error('Program Moderator has no program assigned');
        setLoading(false);
        return;
      }

      // Fetch data filtered by program
      const [participantsData, activitiesData] = await Promise.all([
        participantsApi.getAll({ program_id: userData.user.programId }).catch(() => []),
        activitiesApi.getAll({ program_id: userData.user.programId }).catch(() => []),
      ]);

      // Transform activities to include UI properties
      const transformedActivities = activitiesData.map((activity: any) => {
        const activityParticipants = activity.participants_count || 0;
        const responses = activity.responses_count || 0;
        const participantsResponded = activity.participants_responded_count || 0;
        
        // Calculate progress based on actual data
        const completed = participantsResponded;
        const notStarted = Math.max(0, activityParticipants - participantsResponded);
        const inProgress = 0; // We don't have partial completion data
        
        return {
          ...activity,
          type: activity.type || 'survey',
          dueDate: activity.end_date ? new Date(activity.end_date).toLocaleDateString() : 'No due date',
          participants: activityParticipants,
          totalParticipants: activityParticipants,
          completed: completed,
          inProgress: inProgress,
          notStarted: notStarted,
          progress: activityParticipants > 0 ? Math.round((completed / activityParticipants) * 100) : 0,
          priority: activity.priority || 'medium',
          languages: activity.languages ? (Array.isArray(activity.languages) ? activity.languages : JSON.parse(activity.languages)) : [],
        };
      });

      setParticipants(participantsData);
      setActivities(transformedActivities);

      // Calculate language distribution from activities
      const languageCounts: { [key: string]: number } = {};
      const languageNames: { [key: string]: string } = {
        'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
        'pt': 'Portuguese', 'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic',
        'ru': 'Russian', 'hi': 'Hindi', 'nl': 'Dutch', 'sv': 'Swedish', 'pl': 'Polish',
        'tr': 'Turkish', 'vi': 'Vietnamese', 'th': 'Thai', 'id': 'Indonesian', 'ro': 'Romanian'
      };
      const languageColors = [
        'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500',
        'bg-indigo-500', 'bg-red-500', 'bg-yellow-500', 'bg-teal-500', 'bg-cyan-500'
      ];

      transformedActivities.forEach((activity: any) => {
        if (activity.languages && activity.languages.length > 0) {
          activity.languages.forEach((lang: string) => {
            const langCode = lang.toLowerCase();
            languageCounts[langCode] = (languageCounts[langCode] || 0) + (activity.participants || 0);
          });
        }
      });

      const languageDistData = Object.entries(languageCounts).map(([code, count], index) => ({
        code: code.toUpperCase(),
        name: languageNames[code.toLowerCase()] || code.toUpperCase(),
        participants: count,
        color: languageColors[index % languageColors.length]
      })).sort((a, b) => b.participants - a.participants);

      setLanguageDistribution(languageDistData);

      // Calculate stats
      const total = participantsData.length;
      const active = participantsData.filter((p: any) => p.status === 'active').length;
      const authenticated = participantsData.filter((p: any) => !p.is_guest && !p.isGuest).length;
      const guests = participantsData.filter((p: any) => p.is_guest || p.isGuest).length;
      const completed = activitiesData.filter((a: any) => a.status === 'completed').length;
      const pending = activitiesData.filter((a: any) => a.status === 'active' || a.status === 'scheduled').length;
      const rate = active > 0 ? Math.round((participantsData.filter((p: any) => p.responses_count > 0).length / active) * 100) : 0;

      setTotalParticipants(total);
      setActiveParticipants(active);
      setAuthenticatedParticipants(authenticated);
      setGuestParticipants(guests);
      setCompletedActivities(completed);
      setPendingResponses(pending);
      setCompletionRate(rate);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const statusColors: { [key: string]: string } = {
    active: "bg-green-100 text-green-700",
    closing: "bg-orange-100 text-orange-700",
    scheduled: "bg-blue-100 text-blue-700",
  };

  const priorityColors: { [key: string]: string } = {
    high: "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-gray-100 text-gray-700",
  };

  if (loading) {
    return (
      <ProgramAdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue"></div>
        </div>
      </ProgramAdminLayout>
    );
  }

  return (
    <ProgramAdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Monitor and manage activity participation</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Calendar className="w-4 h-4 inline mr-2" />
              Last 30 Days
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-qsights-blue rounded-lg hover:bg-qsights-blue/90 transition-colors">
              Export Report
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className={`w-4 h-4 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'} ${stat.trend === 'down' && 'rotate-180'}`} />
                      <span className={`text-sm font-semibold ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.change}
                      </span>
                      <span className="text-xs text-gray-500">vs last month</span>
                    </div>
                  </div>
                  <div className={`${stat.bgColor} ${stat.color} p-3 rounded-xl`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activities Progress - Takes 2 columns */}
          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">Event Progress</CardTitle>
                <div className="flex items-center gap-2">
                  <select className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
                    <option>All Events</option>
                    <option>Surveys</option>
                    <option>Polls</option>
                    <option>Assessments</option>
                  </select>
                  <select className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
                    <option>All Status</option>
                    <option>Active</option>
                    <option>Closing</option>
                    <option>Scheduled</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="w-16 h-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Found</h3>
                  <p className="text-sm text-gray-500 max-w-sm">
                    There are no events assigned to your program yet. Events will appear here once they are created.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {activities.map((activity) => {
                  const totalParticipants = activity.participants;
                  const completedPercentage = Math.round((activity.completed / totalParticipants) * 100);
                  const inProgressPercentage = Math.round((activity.inProgress / totalParticipants) * 100);
                  const notStartedPercentage = 100 - completedPercentage - inProgressPercentage;

                  return (
                    <div key={activity.id} className="p-5 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-md transition-all">
                      {/* Activity Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base font-bold text-gray-900">{activity.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[activity.status]}`}>
                              {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityColors[activity.priority]}`}>
                              {activity.priority.charAt(0).toUpperCase() + activity.priority.slice(1)}
                            </span>
                          </div>
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
                              <Users className="w-4 h-4" />
                              {activity.participants} participants
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          {activity.languages && activity.languages.length > 0 ? (
                            activity.languages.map((lang: string) => (
                              <span
                                key={lang}
                                className={`px-2 py-1 rounded-md text-xs font-bold border-2 ${getLanguageBadgeColor(lang.toUpperCase())}`}
                              >
                                {lang.toUpperCase()}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400 italic">No languages set</span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
                          <span className="text-sm font-bold text-gray-900">{completedPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(completedPercentage)} transition-all duration-500 rounded-full shadow-sm`}
                            style={{ width: `${completedPercentage}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Detailed Breakdown */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-green-700">Completed</span>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                          <p className="text-xl font-bold text-green-900">{activity.completed}</p>
                          <p className="text-xs text-green-600 font-medium">{completedPercentage}%</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-blue-700">In Progress</span>
                            <Activity className="w-4 h-4 text-blue-600" />
                          </div>
                          <p className="text-xl font-bold text-blue-900">{activity.inProgress}</p>
                          <p className="text-xs text-blue-600 font-medium">{inProgressPercentage}%</p>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-orange-700">Not Started</span>
                            <Clock className="w-4 h-4 text-orange-600" />
                          </div>
                          <p className="text-xl font-bold text-orange-900">{activity.notStarted}</p>
                          <p className="text-xs text-orange-600 font-medium">{notStartedPercentage}%</p>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Language Distribution - Takes 1 column */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Globe className="w-5 h-5 text-qsights-blue" />
                  Language Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {languageDistribution.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Globe className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-900 mb-1">No Language Data</p>
                    <p className="text-xs text-gray-500 max-w-xs">
                      Language distribution will be shown when activities with language settings are available.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {languageDistribution.map((lang) => {
                      const totalParticipants = languageDistribution.reduce((sum, l) => sum + l.participants, 0);
                      const percentage = totalParticipants > 0 ? Math.round((lang.participants / totalParticipants) * 100) : 0;
                      
                      return (
                        <div key={lang.code} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-md text-xs font-bold border-2 ${getLanguageBadgeColor(lang.code)}`}>
                                {lang.code}
                              </span>
                              <span className="text-sm font-medium text-gray-700">{lang.name}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">{lang.participants}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-full ${lang.color} rounded-full transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 text-right">{isNaN(percentage) ? '0' : percentage}% of total</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-qsights-blue" />
                  Activity Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <BarChart3 className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-900 mb-1">No Activity Data</p>
                    <p className="text-xs text-gray-500 max-w-xs">
                      Activity statistics will appear here once activities are created and have participant engagement.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-900">Total Activities</span>
                      <span className="text-xl font-bold text-blue-900">{activities.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-900">Active Activities</span>
                      <span className="text-xl font-bold text-green-900">{activities.filter(a => a.status === 'active').length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-purple-900">Avg. Completion</span>
                      <span className="text-xl font-bold text-purple-900">
                        {activities.length > 0 ? Math.round(activities.reduce((sum, a) => sum + a.progress, 0) / activities.length) : 0}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProgramAdminLayout>
  );
}
