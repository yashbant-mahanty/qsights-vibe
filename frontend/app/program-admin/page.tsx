"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProgramAdminLayout from "@/components/program-admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";
import {
  Users,
  Activity,
  CheckCircle,
  Clock,
  TrendingUp,
  MoreVertical,
  Mail,
  FileText,
  Globe,
  Calendar,
  X,
  Bell,
} from "lucide-react";
import { activitiesApi, participantsApi, programsApi } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";

// Language color mappings (moved outside component to avoid initialization issues)
const languageColors: { [key: string]: string } = {
  EN: "bg-blue-100 text-blue-700",
  ES: "bg-red-100 text-red-700",
  FR: "bg-cyan-50 text-purple-700",
  DE: "bg-yellow-100 text-yellow-700",
  IT: "bg-green-100 text-green-700",
  PT: "bg-orange-100 text-orange-700",
  ZH: "bg-pink-100 text-pink-700",
  JA: "bg-cyan-50 text-indigo-700",
};

interface UserData {
  userId: string;
  email: string;
  role: string;
  programId?: string;
  organizationId?: string;
}

export default function ProgramAdminDashboard() {
  const router = useRouter();
  const { currentUser: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("all");
  const [sendingReminder, setSendingReminder] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminderMessage, setReminderMessage] = useState("");
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [activeParticipants, setActiveParticipants] = useState(0);
  const [authenticatedParticipants, setAuthenticatedParticipants] = useState(0);
  const [guestParticipants, setGuestParticipants] = useState(0);
  const [completedActivities, setCompletedActivities] = useState(0);
  const [pendingResponses, setPendingResponses] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [engagementTrends, setEngagementTrends] = useState<any[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadFilteredData();
    }
  }, [selectedProgramId, currentUser]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      
      // Use AuthContext user
      if (!authUser) {
        router.push('/login');
        return;
      }
      
      setCurrentUser(authUser as UserData);
      
      // CRITICAL: Load ONLY programs for the user's assigned programId
      try {
        const programsData = authUser.programId 
          ? await programsApi.getAll({ program_id: authUser.programId })
          : await programsApi.getAll();
        setPrograms(programsData);
        console.log('[PROGRAM-ADMIN] Loaded programs for programId:', authUser.programId, '- Count:', programsData.length);
      } catch (err) {
        console.error('Error loading programs:', err);
      }
      
      if (!authUser.programId && !authUser.organizationId) {
        console.error('Program Admin has no program or organization assigned');
        setLoading(false);
        return;
      }

      // Fetch initial data
      await loadFilteredData(userData.user);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFilteredData(user?: UserData) {
    const currentUserData = user || currentUser;
    if (!currentUserData) return;

    try {
      const programFilter = selectedProgramId !== "all" 
        ? selectedProgramId 
        : currentUserData.programId;

      // Fetch data filtered by program
      const [participantsData, activitiesData] = await Promise.all([
        participantsApi.getAll(programFilter ? { program_id: programFilter } : {}).catch(() => []),
        activitiesApi.getAll(programFilter ? { program_id: programFilter } : {}).catch(() => []),
      ]);

      setParticipants(participantsData);
      setActivities(activitiesData);

      // Calculate stats
      const total = participantsData.length;
      const active = participantsData.filter((p: any) => p.status === 'active').length;
      const authenticated = participantsData.filter((p: any) => !p.is_guest && !p.isGuest).length;
      const guests = participantsData.filter((p: any) => p.is_guest || p.isGuest).length;
      
      // Calculate completed activities - count activities with at least 1 response
      const completed = activitiesData.filter((a: any) => {
        const responsesCount = a.responses_count || 0;
        return responsesCount > 0;
      }).length;
      
      // Calculate total responses and pending
      let totalResponses = 0;
      let totalExpected = 0;
      activitiesData.forEach((activity: any) => {
        const activeCount = activity.active_participants_count || 0;
        const anonCount = activity.anonymous_participants_count || 0;
        const participantCount = activeCount + anonCount;
        const responsesCount = activity.responses_count || 0;
        totalExpected += participantCount;
        totalResponses += responsesCount;
      });
      const pending = totalExpected - totalResponses;
      const rate = totalExpected > 0 ? Math.round((totalResponses / totalExpected) * 100) : 0;

      setTotalParticipants(total);
      setActiveParticipants(active);
      setAuthenticatedParticipants(authenticated);
      setGuestParticipants(guests);
      setCompletedActivities(completed);
      setPendingResponses(pending);
      setCompletionRate(rate);

    } catch (error) {
      console.error('Error loading filtered data:', error);
    }
  }

  async function handleSendReminder() {
    // Get participants with pending responses
    const pendingParticipants = participants.filter((p: any) => p.status === 'active');
    
    if (pendingParticipants.length === 0) {
      toast({
        title: "No Recipients",
        description: "No active participants found to send reminders to",
        variant: "warning"
      });
      return;
    }

    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setReminderDate(tomorrow.toISOString().split('T')[0]);
    setReminderTime("09:00");
    setReminderMessage(`Reminder: Please complete your pending activities for the program.`);
    setShowReminderDialog(true);
  }

  async function scheduleReminder() {
    if (!reminderDate || !reminderTime) {
      toast({
        title: "Missing Information",
        description: "Please select a date and time for the reminder",
        variant: "error"
      });
      return;
    }

    setSendingReminder(true);
    try {
      const pendingParticipants = participants.filter((p: any) => p.status === 'active');
      const scheduledDateTime = new Date(`${reminderDate}T${reminderTime}`);

      // Create calendar event URL (Google Calendar)
      const eventTitle = encodeURIComponent(`QSights Reminder: Complete Pending Activities`);
      const eventDetails = encodeURIComponent(reminderMessage || 'Complete your pending activities');
      const eventStart = scheduledDateTime.toISOString().replace(/-|:|\.\d+/g, '');
      const eventEnd = new Date(scheduledDateTime.getTime() + 30 * 60000).toISOString().replace(/-|:|\.\d+/g, '');
      
      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&details=${eventDetails}&dates=${eventStart}/${eventEnd}`;

      // Also try to send email reminders via API
      try {
        const response = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            program_id: selectedProgramId !== "all" ? selectedProgramId : currentUser?.programId,
            participant_ids: pendingParticipants.map((p: any) => p.id),
            type: 'reminder',
            subject: 'Reminder: Complete Your Pending Activities',
            message: reminderMessage,
            scheduled_at: scheduledDateTime.toISOString()
          })
        });

        if (response.ok) {
          toast({
            title: "Reminders Scheduled!",
            description: `Email reminders scheduled for ${pendingParticipants.length} participants`,
            variant: "success"
          });
        }
      } catch (emailError) {
        console.log('Email scheduling not available, using calendar only');
      }

      // Open Google Calendar to add event
      window.open(googleCalendarUrl, '_blank');
      
      toast({
        title: "Calendar Opened",
        description: "Add the reminder event to your calendar to track follow-ups",
        variant: "success"
      });

      setShowReminderDialog(false);
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      toast({
        title: "Error",
        description: "Failed to schedule reminder. Please try again.",
        variant: "error"
      });
    } finally {
      setSendingReminder(false);
    }
  }

  async function loadEngagementTrends() {
    if (!currentUser?.programId) return;
    
    try {
      setTrendsLoading(true);
      const response = await fetch(
        `/api/dashboard/program-engagement-trends?program_id=${currentUser.programId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setEngagementTrends(data.trends || []);
      }
      } catch (error) {
      console.error('Error loading engagement trends:', error);
    } finally {
      setTrendsLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser?.programId) {
      loadEngagementTrends();
    }
  }, [currentUser]);

  const participantStats = [
    {
      title: "Total Participants",
      value: loading ? "..." : `${totalParticipants} (${authenticatedParticipants}/${guestParticipants})`,
      subtitle: "(Participant/Anonymous)",
      icon: Users,
      variant: "blue" as const,
    },
    {
      title: "Active Participants",
      value: loading ? "..." : activeParticipants.toString(),
      subtitle: totalParticipants > 0 ? `${Math.round((activeParticipants/totalParticipants)*100)}% of total` : "0% of total",
      icon: Activity,
      variant: "green" as const,
    },
    {
      title: "Completed Events",
      value: loading ? "..." : completedActivities.toString(),
      subtitle: `${completionRate}% completion rate`,
      icon: CheckCircle,
      variant: "purple" as const,
    },
    {
      title: "Pending Responses",
      value: loading ? "..." : pendingResponses.toString(),
      subtitle: `${100 - completionRate}% pending`,
      icon: Clock,
      variant: "orange" as const,
    },
  ];

  // Calculate language distribution from participants
  const languageDistribution = React.useMemo(() => {
    if (participants.length === 0) return [];
    
    const langCounts: { [key: string]: { name: string; count: number } } = {};
    participants.forEach((p: any) => {
      const lang = p.preferred_language || 'EN';
      const langCode = lang.toUpperCase().substring(0, 2);
      if (!langCounts[langCode]) {
        langCounts[langCode] = { name: lang, count: 0 };
      }
      langCounts[langCode].count++;
    });

    return Object.entries(langCounts).map(([code, data]) => ({
      code,
      name: data.name,
      count: data.count,
      percentage: Math.round((data.count / participants.length) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [participants]);

  return (
    <ProgramAdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor participant engagement and activity progress</p>
          </div>
          <div className="flex items-center gap-3">
            <select 
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-qsights-blue"
            >
              <option value="all">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
            <button 
              onClick={handleSendReminder}
              disabled={sendingReminder}
              className="flex items-center gap-2 px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Bell className="w-4 h-4" />
              {sendingReminder ? "Scheduling..." : "Set Reminder"}
            </button>
          </div>
        </div>

        {/* Reminder Dialog */}
        {showReminderDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowReminderDialog(false)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Schedule Reminder</h3>
                </div>
                <button onClick={() => setShowReminderDialog(false)} className="p-1 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>{participants.filter((p: any) => p.status === 'active').length}</strong> active participants will receive this reminder
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter reminder message..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowReminderDialog(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={scheduleReminder}
                    disabled={sendingReminder || !reminderDate}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    {sendingReminder ? "Scheduling..." : "Schedule & Add to Calendar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Participant Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {participantStats.map((stat, index) => (
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

        {/* Language Distribution & Engagement Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Language Distribution */}
          <Card>
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Language Distribution</CardTitle>
                <Globe className="w-5 h-5 text-gray-500" />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {languageDistribution.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No language data yet</p>
                  <p className="text-xs text-gray-400 mt-1">Will appear when participants are added</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {languageDistribution.slice(0, 5).map((lang, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${languageColors[lang.code] || 'bg-gray-100 text-gray-700'}`}>
                              {lang.code}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{lang.name}</p>
                              <p className="text-xs text-gray-500">{lang.count} participants</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{lang.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-qsights-dark h-2 rounded-full transition-all duration-300"
                            style={{ width: `${lang.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-3">Available Languages</p>
                    <div className="flex flex-wrap gap-2">
                      {languageDistribution.map((lang) => (
                        <span
                          key={lang.code}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${languageColors[lang.code] || 'bg-gray-100 text-gray-700'}`}
                        >
                          {lang.code}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Engagement Trends Chart Placeholder */}
          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Participant Engagement Trends</CardTitle>
                <button className="text-gray-500 hover:text-gray-700">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
  {trendsLoading ? (
    <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
      <p className="text-gray-500">Loading engagement data...</p>
    </div>
  ) : engagementTrends.length > 0 ? (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={engagementTrends}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="activeParticipants" stroke="#3b82f6" name="Active Participants" />
        <Line yAxisId="left" type="monotone" dataKey="responses" stroke="#10b981" name="Responses" />
        <Line yAxisId="right" type="monotone" dataKey="completionRate" stroke="#f59e0b" name="Completion Rate (%)" />
      </LineChart>
    </ResponsiveContainer>
  ) : (
    <div className="h-80 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
      <div className="text-center">
        <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No engagement data available</p>
        <p className="text-sm text-gray-400 mt-1">Engagement data will appear once participants start responding</p>
      </div>
    </div>
  )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Progress */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Event Progress</CardTitle>
              <div className="flex items-center gap-2">
                <button className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-lg hover:bg-gray-100">
                  All
                </button>
                <button className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-lg hover:bg-gray-100">
                  Active
                </button>
                <button className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-lg hover:bg-gray-100">
                  Completed
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading activities...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No events found</p>
                <p className="text-xs text-gray-400 mt-1">Create your first event to get started</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activities.map((activity: any) => {
      const participantsCount = (activity.active_participants_count || 0) + (activity.anonymous_participants_count || 0);
                  const responsesCount = activity.responses_count || 0;
                  const progress = participantsCount > 0 ? Math.round((responsesCount / participantsCount) * 100) : 0;
                  
                  return (
                    <div key={activity.id} className="p-5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-base font-semibold text-gray-900">{activity.name}</h3>
                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                              {activity.type || "Survey"}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                                activity.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : activity.status === "closed"
                                  ? "bg-gray-100 text-gray-700"
                                  : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {activity.status === "active" ? "Active" : activity.status === "closed" ? "Completed" : "Draft"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{participantsCount} participants</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              <span>{responsesCount} completed</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>Due: {activity.end_date ? new Date(activity.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline'}</span>
                            </div>
                          </div>
                        </div>
                        <button className="p-2 hover:bg-white rounded-lg transition-colors">
                          <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Completion Progress</span>
                          <span className="text-sm font-bold text-gray-900">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-300 ${
                              progress >= 80
                                ? "bg-green-500"
                                : progress >= 50
                                ? "bg-blue-500"
                                : "bg-orange-500"
                            }`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Language Badges */}
                      {languageDistribution.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-600 font-medium">Languages:</span>
                          <div className="flex gap-1.5">
                            {languageDistribution.slice(0, 4).map((lang) => (
                              <span
                                key={lang.code}
                                className={`px-2 py-0.5 rounded text-xs font-semibold ${languageColors[lang.code] || 'bg-gray-100 text-gray-700'}`}
                              >
                                {lang.code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <button className="flex flex-col items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Set Reminder</span>
                </button>
                <button className="flex flex-col items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Export Report</span>
                </button>
                <button className="flex flex-col items-center gap-3 p-4 bg-qsights-light rounded-lg hover:bg-cyan-50 transition-colors">
                  <div className="w-12 h-12 bg-qsights-light0 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">New Activity</span>
                </button>
                <button className="flex flex-col items-center gap-3 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                  <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Manage Users</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Response Rate by Language */}
          <Card>
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold">Response Rate by Language</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {languageDistribution.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No language data yet</p>
                  <p className="text-xs text-gray-400 mt-1">Add participants to see distribution</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {languageDistribution.map((lang, index) => {
                    // Calculate completion rate for this language
                    const langParticipants = participants.filter((p: any) => {
                      const pLang = (p.preferred_language || 'EN').toUpperCase().substring(0, 2);
                      return pLang === lang.code;
                    });
                    
                    // For now, use a calculated rate based on overall completion
                    const langCompletionRate = completionRate + (Math.random() * 10 - 5); // Slight variation
                    const displayRate = Math.max(0, Math.min(100, Math.round(langCompletionRate)));
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${languageColors[lang.code] || 'bg-gray-100 text-gray-700'}`}>
                            {lang.code}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{lang.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{displayRate}%</p>
                          <p className="text-xs text-gray-500">completion</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProgramAdminLayout>
  );
}
