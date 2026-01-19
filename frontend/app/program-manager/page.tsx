"use client";

import React, { useEffect, useState } from "react";
import ProgramAdminLayout from "@/components/program-admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";
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

export default function ProgramManagerDashboard() {
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
      subtitle: "(Participant/Anonymous)",
      icon: Users,
      variant: 'blue' as const,
    },
    {
      title: 'Active Participants',
      value: activeParticipants.toString(),
      subtitle: totalParticipants > 0 ? `${Math.round((activeParticipants/totalParticipants)*100)}% of total` : "0% of total",
      icon: Activity,
      variant: 'green' as const,
    },
    {
      title: 'Events Completed',
      value: completedActivities.toString(),
      subtitle: activities.length > 0 ? `${activities.length} total events` : '0 total events',
      icon: CheckCircle,
      variant: 'purple' as const,
    },
    {
      title: 'Pending Responses',
      value: pendingResponses.toString(),
      subtitle: pendingResponses > 0 ? 'Needs attention' : 'All current',
      icon: AlertCircle,
      variant: 'orange' as const,
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
        console.error('Program Manager has no program assigned');
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

      transformedActivities.forEach((activity: any) => {
        if (activity.languages && activity.languages.length > 0) {
          activity.languages.forEach((lang: string) => {
            const langCode = lang.toLowerCase();
            languageCounts[langCode] = (languageCounts[langCode] || 0) + (activity.totalParticipants || 0);
          });
        }
      });

      const languageDistData = Object.entries(languageCounts).map(([code, count]) => ({
        code: code.toUpperCase(),
        name: languageNames[code.toLowerCase()] || code.toUpperCase(),
        count: count,
        percentage: 0 // Will be calculated after we know total
      }));

      // Calculate percentages
      const totalLangParticipants = languageDistData.reduce((sum, lang) => sum + lang.count, 0);
      languageDistData.forEach(lang => {
        lang.percentage = totalLangParticipants > 0 ? Math.round((lang.count / totalLangParticipants) * 100) : 0;
      });

      setLanguageDistribution(languageDistData.sort((a, b) => b.count - a.count));

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

  const languageColors: { [key: string]: string } = {
    EN: "bg-blue-100 text-blue-700 border-blue-200",
    ES: "bg-red-100 text-red-700 border-red-200",
    FR: "bg-cyan-50 text-purple-700 border-purple-200",
    DE: "bg-yellow-100 text-yellow-700 border-yellow-200",
    IT: "bg-green-100 text-green-700 border-green-200",
  };

  const priorityColors: { [key: string]: string } = {
    high: "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };

  const statusColors: { [key: string]: string } = {
    active: "bg-green-100 text-green-700",
    closing: "bg-orange-100 text-orange-700",
    scheduled: "bg-blue-100 text-blue-700",
  };

  const participantStats = [
    {
      title: "Total Participants",
      value: totalParticipants.toString(),
      change: totalParticipants === 0 ? "No participants yet" : `${activeParticipants} active`,
      lightColor: "bg-blue-50",
      textColor: "text-blue-600",
      icon: Users,
    },
    {
      title: "Active Participants",
      value: activeParticipants.toString(),
      change: `${completionRate}% completion rate`,
      lightColor: "bg-green-50",
      textColor: "text-green-600",
      icon: Activity,
    },
    {
      title: "Completed Activities",
      value: completedActivities.toString(),
      change: completedActivities === 0 ? "0% completion rate" : `${completionRate}% completion rate`,
      lightColor: "bg-qsights-light",
      textColor: "text-qsights-cyan",
      icon: CheckCircle,
    },
    {
      title: "Pending Responses",
      value: pendingResponses.toString(),
      change: pendingResponses === 0 ? "100% pending" : `${Math.round((pendingResponses/totalParticipants)*100)}% pending`,
      lightColor: "bg-orange-50",
      textColor: "text-orange-600",
      icon: Clock,
    },
  ];

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
            <p className="text-gray-600 mt-1">Monitor participant engagement and activity completion</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              Export Data
            </button>
            <button className="px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan-dark">
              Send Reminder
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <GradientStatCard
              key={index}
              title={stat.title}
              value={stat.value}
              subtitle={stat.subtitle}
              icon={stat.icon}
              variant={stat.variant}
            />
          ))}
        </div>

        {/* Activity Progress Section */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Event Progress</CardTitle>
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
                {activities.map((activity) => (
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
                          {activity.priority.charAt(0).toUpperCase() + activity.priority.slice(1)} Priority
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4" />
                          {activity.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Due: {activity.dueDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {activity.totalParticipants} participants
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
                      <span className="text-lg font-bold text-gray-900">{activity.progress}%</span>
                    </div>
                    <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-4 rounded-full transition-all duration-500 ${
                          activity.progress >= 80
                            ? "bg-gradient-to-r from-green-500 to-green-600"
                            : activity.progress >= 50
                            ? "bg-gradient-to-r from-blue-500 to-blue-600"
                            : "bg-gradient-to-r from-orange-500 to-orange-600"
                        }`}
                        style={{ width: `${activity.progress}%` }}
                      >
                        <div className="w-full h-full bg-white/20"></div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-medium text-green-700">Completed</span>
                      </div>
                      <p className="text-xl font-bold text-green-900">{activity.completed}</p>
                      <p className="text-xs text-green-600">{Math.round((activity.completed / activity.totalParticipants) * 100)}%</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-medium text-blue-700">In Progress</span>
                      </div>
                      <p className="text-xl font-bold text-blue-900">{activity.inProgress}</p>
                      <p className="text-xs text-blue-600">{Math.round((activity.inProgress / activity.totalParticipants) * 100)}%</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <span className="text-xs font-medium text-orange-700">Not Started</span>
                      </div>
                      <p className="text-xl font-bold text-orange-900">{activity.notStarted}</p>
                      <p className="text-xs text-orange-600">{Math.round((activity.notStarted / activity.totalParticipants) * 100)}%</p>
                    </div>
                  </div>

                  {/* Language Badges */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                    <Globe className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">Available Languages:</span>
                    <div className="flex gap-1.5">
                      {activity.languages && activity.languages.length > 0 ? (
                        activity.languages.map((lang: string) => (
                          <span
                            key={lang}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold border ${languageColors[lang.toUpperCase()] || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                          >
                            {lang.toUpperCase()}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">No languages set</span>
                      )}
                    </div>
                  </div>
                </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Summary */}
          <Card>
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold">Activity Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <TrendingUp className="w-12 h-12 text-gray-300 mb-3" />
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
                  <div className="flex items-center justify-between p-3 bg-qsights-light rounded-lg">
                    <span className="text-sm font-medium text-purple-900">Avg. Completion</span>
                    <span className="text-xl font-bold text-purple-900">
                      {activities.length > 0 ? Math.round(activities.reduce((sum, a) => sum + a.progress, 0) / activities.length) : 0}%
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Language Distribution */}
          <Card>
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold">Participant Language Distribution</CardTitle>
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
                  {languageDistribution.map((lang) => (
                    <div key={lang.code}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1.5 rounded-md text-xs font-bold border ${languageColors[lang.code] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {lang.code}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{lang.name}</p>
                            <p className="text-xs text-gray-500">{lang.count} participants</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{lang.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-qsights-dark h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(lang.percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProgramAdminLayout>
  );
}
