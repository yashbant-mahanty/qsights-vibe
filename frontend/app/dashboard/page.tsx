"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";
import { UserRole } from "@/lib/permissions";
import {
  Users,
  Building2,
  FolderTree,
  Activity,
  TrendingUp,
  FileText,
  BarChart3,
  Download,
  MapPin,
  CheckCircle,
  DollarSign,
  Calendar,
  Percent,
  UserCheck,
  PieChart,
  IndianRupee,
  Clock,
  Search,
  X,
  Bell,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  organizationsApi,
  programsApi,
  activitiesApi,
  participantsApi,
  questionnairesApi,
  dashboardApi,
} from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, isLoading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  // Redirect program-level users to their respective dashboards
  useEffect(() => {
    setMounted(true);
    
    // Wait for auth to load
    if (authLoading || !currentUser) return;
    
    const userRole = currentUser.role as UserRole;
    const programId = currentUser.programId;
    
    // Redirect evaluation-staff to evaluation page
    if (userRole === 'evaluation-staff' || userRole === 'evaluation_staff') {
      router.push('/evaluation-new');
      return;
    }
    
    // NEW: Redirect to program-scoped pages
    if (userRole === 'program-admin' || userRole === 'program-manager' || userRole === 'program-moderator') {
      if (programId) {
        router.push(`/program/${programId}/dashboard`);
        return;
      }
    }
  }, [authLoading, currentUser, router]);
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState("30days");
  const [searchQuery, setSearchQuery] = useState("");
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [orgPerformance, setOrgPerformance] = useState<any[]>([]);
  const [subscriptionMetrics, setSubscriptionMetrics] = useState<any>(null);
  const [activityStartDate, setActivityStartDate] = useState<string>("");
  const [activityEndDate, setActivityEndDate] = useState<string>("");
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all");
  const [activityGroupHeadFilter, setActivityGroupHeadFilter] = useState<string>("all");
  const [activityStatusFilter, setActivityStatusFilter] = useState<string>("all");
  const [filteredActivityDetails, setFilteredActivityDetails] = useState<any[]>([]);

  // Send Reminder states
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [reminderDate, setReminderDate] = useState<string>("");
  const [reminderTime, setReminderTime] = useState<string>("");
  const [reminderMessage, setReminderMessage] = useState<string>("");
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => {
    // CRITICAL: Wait for auth to finish loading before doing anything
    if (authLoading) return;
    
    // Only redirect if auth is done and user is not logged in
    if (!currentUser) {
      router.push('/');
      return;
    }
    
    loadData();

    // Listen for global search events
    const handleGlobalSearch = (e: CustomEvent) => {
      if (e.detail.pathname === '/dashboard') {
        setSearchQuery(e.detail.query);
      }
    };

    const handleGlobalSearchClear = () => {
      setSearchQuery("");
    };

    window.addEventListener('global-search' as any, handleGlobalSearch);
    window.addEventListener('global-search-clear' as any, handleGlobalSearchClear);

    return () => {
      window.removeEventListener('global-search' as any, handleGlobalSearch);
      window.removeEventListener('global-search-clear' as any, handleGlobalSearchClear);
    };
  }, [authLoading, currentUser]);

  // Re-filter activities when search query changes
  useEffect(() => {
    if (subscriptionMetrics?.activity_details) {
      filterActivitiesByDate(activityStartDate, activityEndDate);
    }
  }, [searchQuery]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Only load essential dashboard data - remove unnecessary API calls
      const [dashStats, orgPerf, subMetrics] = await Promise.all([
        dashboardApi.getGlobalStatistics().catch((e) => { console.error('Dashboard stats error:', e); return null; }),
        dashboardApi.getOrganizationPerformance().catch((e) => { console.error('Org performance error:', e); return { data: [] }; }),
        dashboardApi.getSubscriptionMetrics().catch((e) => { console.error('Subscription metrics error:', e); return null; }),
      ]);
      
      setGlobalStats(dashStats);
      // Extract data array from response
      const orgPerfData = Array.isArray(orgPerf?.data) ? orgPerf.data : (Array.isArray(orgPerf) ? orgPerf : []);
      setOrgPerformance(orgPerfData);
      setSubscriptionMetrics(subMetrics);
      if (subMetrics?.activity_details) {
        setFilteredActivityDetails(subMetrics.activity_details);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filter activities by date range, type, group head, status, and search query
  const filterActivitiesByDate = (startDate: string, endDate: string, typeFilter?: string, groupHeadFilter?: string, statusFilter?: string) => {
    if (!subscriptionMetrics?.activity_details) return;

    let filtered = subscriptionMetrics.activity_details;
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      // Split query into words for more flexible matching
      const queryWords = query.split(/\s+/).filter(w => w.length > 0);
      
      // Generic terms that should show all activities
      const genericTerms = ['activity', 'activities', 'performance', 'event', 'events'];
      
      // If searching for generic terms only, show all activities
      const isGenericSearch = queryWords.every(word => genericTerms.includes(word));
      
      if (!isGenericSearch) {
        filtered = filtered.filter((activity: any) => {
          const name = (activity.name || '').toLowerCase();
          const code = (activity.code || '').toLowerCase();
          const type = (activity.type || '').toLowerCase();
          const description = (activity.description || '').toLowerCase();
          const programName = (activity.program_name || '').toLowerCase();
          const orgName = (activity.organization_name || '').toLowerCase();
          const status = (activity.status || '').toLowerCase();
          
          // Combine all searchable text
          const searchableText = `${name} ${code} ${type} ${description} ${programName} ${orgName} ${status}`;
          
          // Match if ANY query word is found anywhere in the searchable text
          return queryWords.some(word => searchableText.includes(word));
        });
      }
    }
    
    // Apply type filter
    const currentTypeFilter = typeFilter !== undefined ? typeFilter : activityTypeFilter;
    if (currentTypeFilter !== "all") {
      filtered = filtered.filter((activity: any) => activity.type === currentTypeFilter);
    }

    // Apply group head filter
    const currentGroupHeadFilter = groupHeadFilter !== undefined ? groupHeadFilter : activityGroupHeadFilter;
    if (currentGroupHeadFilter !== "all") {
      filtered = filtered.filter((activity: any) => {
        const groupHead = activity.group_head || '';
        return groupHead !== 'N/A' && groupHead === currentGroupHeadFilter;
      });
    }

    // Apply status filter
    const currentStatusFilter = statusFilter !== undefined ? statusFilter : activityStatusFilter;
    if (currentStatusFilter !== "all") {
      filtered = filtered.filter((activity: any) => activity.status === currentStatusFilter);
    }

    if (startDate || endDate) {
      filtered = filtered.filter((activity: any) => {
        const activityStart = activity.start_date ? new Date(activity.start_date) : null;
        const activityEnd = activity.end_date ? new Date(activity.end_date) : null;
        const filterStart = startDate ? new Date(startDate) : null;
        const filterEnd = endDate ? new Date(endDate) : null;

        // Activity overlaps with filter range if:
        // - Activity starts before or on filter end (or no filter end)
        // - Activity ends after or on filter start (or no filter start)
        const startsBeforeFilterEnd = !filterEnd || !activityStart || activityStart <= filterEnd;
        const endsAfterFilterStart = !filterStart || !activityEnd || activityEnd >= filterStart;

        return startsBeforeFilterEnd && endsAfterFilterStart;
      });
    }

    setFilteredActivityDetails(filtered);
  };

  // Send Reminder Functions
  async function handleSendReminder() {
    // Lazy load activities only when needed
    if (activities.length === 0) {
      try {
        const actsData = await activitiesApi.getAll();
        setActivities(actsData || []);
        
        if (!actsData || actsData.length === 0) {
          toast({
            title: "No Events",
            description: "No events available to send reminders for",
            variant: "warning"
          });
          return;
        }
      } catch (error) {
        console.error('Error loading activities:', error);
        toast({
          title: "Error",
          description: "Failed to load events",
          variant: "error"
        });
        return;
      }
    }

    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setReminderDate(tomorrow.toISOString().split('T')[0]);
    setReminderTime("09:00");
    setSelectedEventId(activities[0]?.id || "");
    setReminderMessage(`Reminder: Please complete your pending activities.`);
    setShowReminderDialog(true);
  }

  async function scheduleReminder() {
    if (!selectedEventId || !reminderDate || !reminderTime) {
      toast({
        title: "Missing Information",
        description: "Please select an event, date and time for the reminder",
        variant: "error"
      });
      return;
    }

    setSendingReminder(true);

    try {
      console.log('Looking for event:', selectedEventId, 'in activities:', activities);
      const selectedEvent = activities.find((a: any) => String(a.id) === String(selectedEventId));
      if (!selectedEvent) {
        console.error('Event not found. Available activities:', activities.map((a: any) => ({ id: a.id, name: a.name })));
        throw new Error("Event not found");
      }

      // Create Google Calendar event URL
      const eventDate = new Date(`${reminderDate}T${reminderTime}`);
      const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000); // 1 hour later

      const formatDateForGoogle = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        `Reminder: ${selectedEvent.name}`
      )}&dates=${formatDateForGoogle(eventDate)}/${formatDateForGoogle(endDate)}&details=${encodeURIComponent(
        reminderMessage || `Remember to complete the event: ${selectedEvent.name}`
      )}&sf=true&output=xml`;

      // Open Google Calendar
      window.open(calendarUrl, '_blank');

      toast({
        title: "Reminder Scheduled!",
        description: `Calendar reminder has been opened for ${selectedEvent.name}`,
        variant: "success"
      });

      setShowReminderDialog(false);
      setSelectedEventId("");
      setReminderDate("");
      setReminderTime("");
      setReminderMessage("");

    } catch (error) {
      console.error('Error scheduling reminder:', error);
      toast({
        title: "Error",
        description: "Failed to schedule reminder",
        variant: "error"
      });
    } finally {
      setSendingReminder(false);
    }
  }

  // Get statistics from dashboard API only (no mock data)
  const totalOrganizations = globalStats?.organizations || 0;
  const totalPrograms = globalStats?.programs || 0;
  const totalActivities = globalStats?.activities || 0;
  const totalParticipants = globalStats?.participants || 0;
  const authenticatedParticipants = (globalStats?.active_participants || 0) + (globalStats?.inactive_participants || 0);
  const guestParticipants = globalStats?.guest_participants || 0;
  const totalQuestionnaires = questionnaires.length;
  
  const totalResponses = globalStats?.responses || 0;
  const authenticatedResponsesCount = globalStats?.authenticated_responses || 0;
  const guestResponsesCount = globalStats?.guest_responses || 0;
  const engagementRate = Math.min(globalStats?.platform_engagement || 0, 100);
  const completionRate = totalParticipants > 0 ? Math.round((totalResponses / totalParticipants) * 100) : 0;

  // Activity type counts from API only
  const surveyCount = globalStats?.activity_types?.surveys || 0;
  const pollCount = globalStats?.activity_types?.polls || 0;
  const assessmentCount = globalStats?.activity_types?.assessments || 0;

  // Use organization performance from dashboard API
  const filteredOrgPerformance = Array.isArray(orgPerformance) 
    ? orgPerformance
        .filter((org: any) => {
          if (!searchQuery) return true;
          
          const query = searchQuery.toLowerCase().trim();
          // Split query into words for more flexible matching
          const queryWords = query.split(/\s+/).filter(w => w.length > 0);
          
          // Generic terms that should show all organizations
          const genericTerms = ['organization', 'performance', 'org', 'organizations'];
          
          // If searching for generic terms only, show all organizations
          const isGenericSearch = queryWords.every(word => genericTerms.includes(word));
          if (isGenericSearch) return true;
          
          const orgName = (org?.name || '').toLowerCase();
          const orgCode = (org?.code || '').toLowerCase();
          const orgDescription = (org?.description || '').toLowerCase();
          const orgLocation = (org?.location || '').toLowerCase();
          const orgIndustry = (org?.industry || '').toLowerCase();
          
          // Combine all searchable text
          const searchableText = `${orgName} ${orgCode} ${orgDescription} ${orgLocation} ${orgIndustry}`;
          
          // Match if ANY query word is found in ANY field
          return queryWords.some(word => searchableText.includes(word));
        })
        .map((org: any) => ({
          name: org.name,
          programs: org.programs_count || 0,
          authenticatedParticipants: (org.active_participants_count || 0) + (org.inactive_participants_count || 0),
          guestParticipants: org.guest_participants_count || 0,
          totalParticipants: (org.active_participants_count || 0) + (org.inactive_participants_count || 0) + (org.guest_participants_count || 0),
          responses: org.responses_count || 0,
          engagement: org.effectiveness || 0,
        }))
        .slice(0, 6)
    : [];

  const stats = [
    {
      title: "Total Events",
      value: totalActivities > 0 ? totalActivities.toLocaleString() : "0",
      change: "",
      subtitle: `${surveyCount} surveys, ${pollCount} polls, ${assessmentCount} assessments`,
      icon: Activity,
      variant: 'blue' as const,
    },
    {
      title: "Total Participants",
      value: totalParticipants > 0 ? `${totalParticipants.toLocaleString()} (${authenticatedParticipants}/${guestParticipants})` : "0",
      change: "",
      subtitle: "(Participant/Anonymous)",
      icon: Users,
      variant: 'green' as const,
    },
    {
      title: "Total Responses",
      value: totalResponses > 0 ? `${totalResponses.toLocaleString()} (${authenticatedResponsesCount}/${guestResponsesCount})` : "0",
      change: "",
      subtitle: "(Participant/Anonymous)",
      icon: TrendingUp,
      variant: 'purple' as const,
    },
    {
      title: "Engagement Rate",
      value: `${Math.round(engagementRate)}%`,
      change: "",
      subtitle: "Overall engagement",
      icon: BarChart3,
      variant: 'cyan' as const,
    },
  ];

  const exportReport = () => {
    const csvContent = [
      'DASHBOARD REPORT',
      `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`,
      'SUMMARY STATISTICS',
      `Total Organizations,${totalOrganizations}`,
      `Total Programs,${totalPrograms}`,
      `Total Events,${totalActivities}`,
      `Total Participants,${totalParticipants}`,
      `Total Questionnaires,${totalQuestionnaires}`,
      `Total Responses,${totalResponses}`,
      `Engagement Rate,${engagementRate}%\n`,
      'ORGANIZATION PERFORMANCE',
      'Organization,Programs,Participants,Responses,Engagement',
      ...filteredOrgPerformance.map(org => 
        `"${org.name}",${org.programs},${org.totalParticipants} (${org.authenticatedParticipants}/${org.guestParticipants}),${org.responses},${org.engagement}%`
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Scroll to results when search is active
  const resultsRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (searchQuery && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [searchQuery, filteredActivityDetails.length]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Search Results Banner */}
        {searchQuery && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg shadow-sm animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Search Results for "{searchQuery}"
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Found {filteredActivityDetails.length} events and {filteredOrgPerformance.length} organizations
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('global-search-clear'));
                  }
                }}
                className="text-blue-600 hover:text-blue-800 p-1 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor and manage the entire platform</p>
          </div>
          <div className="flex items-center gap-3">
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-qsights-blue"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
              <option value="1year">This year</option>
            </select>
            <button 
              onClick={handleSendReminder}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              <Bell className="w-4 h-4" />
              Set Reminder
            </button>
            <button 
              onClick={exportReport}
              className="flex items-center gap-2 px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* Tabs - Modern Design */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 p-1.5 text-gray-600 shadow-inner border border-gray-200">
            <TabsTrigger 
              value="overview" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-qsights-blue data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100 hover:text-gray-900"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Platform Overview
            </TabsTrigger>
            <TabsTrigger 
              value="revenue" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-100 hover:text-gray-900"
            >
              <IndianRupee className="w-4 h-4 mr-2" />
              Revenue & Subscriptions
            </TabsTrigger>
          </TabsList>

          {/* Platform Overview Tab Content */}
          <TabsContent value="overview" className="space-y-6">

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
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
        )}

        {/* Survey Performance & Platform Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Performance Trends */}
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900">Event Performance Overview</CardTitle>
                  <p className="text-sm text-gray-600 mt-0.5">Surveys, polls, and assessments breakdown</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="h-80 animate-pulse bg-gray-100 rounded-lg"></div>
              ) : totalActivities === 0 ? (
                <div className="h-80 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No event data available yet</p>
                    <p className="text-sm text-gray-400 mt-1">Performance trends will appear once events are created</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-sm">
                      <p className="text-sm text-gray-600 font-medium">Surveys</p>
                      <p className="text-3xl font-bold text-blue-600">{surveyCount}</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 shadow-sm">
                      <p className="text-sm text-gray-600 font-medium">Polls</p>
                      <p className="text-3xl font-bold text-green-600">{pollCount}</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 shadow-sm">
                      <p className="text-sm text-gray-600 font-medium">Assessments</p>
                      <p className="text-3xl font-bold text-qsights-cyan">{assessmentCount}</p>
                    </div>
                  </div>
                  <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between text-sm py-2">
                      <span className="text-gray-600 font-medium">Total Events</span>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">{totalActivities}</span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {globalStats?.live_activities > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-100 text-green-700 mr-1">
                              {globalStats.live_activities} Live
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm py-2 border-t border-gray-200">
                      <span className="text-gray-600 font-medium">Total Programs</span>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">{totalPrograms}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm py-2 border-t border-gray-200">
                      <span className="text-gray-600 font-medium">Platform Engagement</span>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">{engagementRate.toFixed(1)}%</span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Active participants responding
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Platform Statistics */}
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-qsights-light to-cyan-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-qsights-light0 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900">Platform Statistics</CardTitle>
                  <p className="text-sm text-gray-600 mt-0.5">Overall platform health and usage</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="h-80 animate-pulse bg-gray-100 rounded-lg"></div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                      <Building2 className="w-8 h-8 text-blue-600 mb-2" />
                      <p className="text-sm text-gray-600 font-medium">Organizations</p>
                      <p className="text-3xl font-bold text-gray-900">{totalOrganizations}</p>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                      <FolderTree className="w-8 h-8 text-green-600 mb-2" />
                      <p className="text-sm text-gray-600 font-medium">Programs</p>
                      <p className="text-3xl font-bold text-gray-900">{totalPrograms}</p>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-purple-50 via-fuchsia-50 to-purple-100 rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
                      <Users className="w-8 h-8 text-qsights-cyan mb-2" />
                      <p className="text-sm text-gray-600 font-medium mb-1">Participants</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {totalParticipants.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        ({authenticatedParticipants}/{guestParticipants})
                      </p>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 rounded-xl border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                      <Activity className="w-8 h-8 text-orange-600 mb-2" />
                      <p className="text-sm text-gray-600 font-medium">Events</p>
                      <p className="text-3xl font-bold text-gray-900">{totalActivities}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 space-y-4">
                    {/* Platform Engagement - Participant based */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-700 font-semibold">Platform Engagement</span>
                        <span className="text-lg font-bold text-gray-900">{engagementRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-1000 shadow-md"
                          style={{ width: `${Math.min(engagementRate, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Participants with responses</p>
                    </div>
                    {/* Activity Completion Rate */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-700 font-semibold">Event Completion</span>
                        <span className="text-lg font-bold text-gray-900">{globalStats?.activity_completion_rate || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-1000 shadow-md"
                          style={{ width: `${Math.min(globalStats?.activity_completion_rate || 0, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{globalStats?.activities_with_responses || 0} of {globalStats?.live_activities || 0} live events have responses</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Organization Performance */}
        <Card className="border-0 shadow-md">
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Organization Performance</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Top performers by survey effectiveness</p>
              </div>
              <button 
                onClick={() => router.push('/organizations')}
                className="text-sm text-qsights-blue font-medium hover:underline"
              >
                View All
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </div>
            ) : orgPerformance.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No organization data available yet</p>
                <p className="text-sm text-gray-400 mt-1">Metrics will appear once organizations are created</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Programs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participants
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Responses
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Effectiveness
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredOrgPerformance.map((org, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? 'bg-yellow-100 text-yellow-700' :
                              index === 1 ? 'bg-gray-100 text-gray-700' :
                              index === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-50 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <p className="text-sm font-semibold text-gray-900">{org.name}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{org.programs}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {org.totalParticipants}
                          </div>
                          <div className="text-xs text-gray-500">
                            ({org.authenticatedParticipants}/{org.guestParticipants})
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{org.responses}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-[80px]">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-900">{org.engagement}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    org.engagement >= 80 ? 'bg-green-500' :
                                    org.engagement >= 60 ? 'bg-blue-500' :
                                    org.engagement >= 40 ? 'bg-yellow-500' :
                                    org.engagement >= 20 ? 'bg-orange-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(org.engagement, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                            {org.engagement >= 80 && (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Revenue & Subscriptions Tab */}
          <TabsContent value="revenue" className="space-y-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <IndianRupee className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-gray-900">Subscription & Revenue Metrics</CardTitle>
                <p className="text-sm text-gray-600 mt-0.5">Financial overview and participant analytics</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-24 bg-gray-100 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : !subscriptionMetrics || !subscriptionMetrics.activity_details || subscriptionMetrics.activity_details.length === 0 ? (
              <div className="py-12 text-center">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No subscription data available yet</p>
                <p className="text-sm text-gray-400 mt-1">Metrics will appear once events with subscription details are created</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Main Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <GradientStatCard
                    title="Total Revenue"
                    value={`₹${(subscriptionMetrics.total_configuration_price + subscriptionMetrics.total_revenue_with_tax)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`}
                    subtitle={`Base: ₹${(subscriptionMetrics.total_configuration_price + subscriptionMetrics.total_subscription_revenue)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`}
                    icon={IndianRupee}
                    variant="green"
                  />

                  <GradientStatCard
                    title="Avg Subscription"
                    value={`₹${subscriptionMetrics.average_subscription_price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`}
                    subtitle={`${subscriptionMetrics.activities_with_subscription || 0} activities`}
                    icon={BarChart3}
                    variant="blue"
                  />

                  <GradientStatCard
                    title="Avg Tax Rate"
                    value={`${subscriptionMetrics.average_tax_percentage?.toFixed(2) || '0.00'}%`}
                    subtitle={`Tax: ₹${subscriptionMetrics.total_tax_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}`}
                    icon={Percent}
                    variant="purple"
                  />

                  <GradientStatCard
                    title="Total Participants"
                    value={subscriptionMetrics.total_participants?.toLocaleString('en-IN') || '0'}
                    subtitle={`(${subscriptionMetrics.authenticated_participants || 0}/${subscriptionMetrics.anonymous_participants || 0}) Registered/Anonymous`}
                    icon={Users}
                    variant="orange"
                  />
                </div>

                {/* Subscription Frequency Breakdown */}
                {subscriptionMetrics.frequency_breakdown && subscriptionMetrics.frequency_breakdown.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <PieChart className="w-5 h-5 text-gray-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Subscription Frequency Breakdown</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {subscriptionMetrics.frequency_breakdown.map((freq: any, index: number) => (
                        <div 
                          key={index}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-qsights-blue" />
                              <span className="text-sm font-semibold text-gray-900 capitalize">
                                {freq.frequency || 'Not specified'}
                              </span>
                            </div>
                            <span className="bg-qsights-dark/10 text-qsights-blue text-xs font-medium px-2 py-1 rounded-full">
                              {freq.count} {freq.count === 1 ? 'event' : 'events'}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Total Revenue:</span>
                              <span className="font-semibold text-gray-900">
                                ₹{freq.total_revenue?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Avg Price:</span>
                              <span className="font-semibold text-gray-900">
                                ₹{freq.avg_price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Participants:</span>
                              <span className="font-semibold text-gray-900">
                                {freq.total_participants?.toLocaleString('en-IN') || '0'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Activity Breakdown Table - Modern Design */}
        {subscriptionMetrics && subscriptionMetrics.activity_details && subscriptionMetrics.activity_details.length > 0 && (
          <div ref={resultsRef}>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
            <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50">
              {/* Title Section */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    Event Breakdown
                    <span className={`text-xs font-normal px-2 py-1 rounded-full ${searchQuery ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-500'}`}>
                      {filteredActivityDetails.length} items
                    </span>
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-0.5">Comprehensive pricing and configuration details</p>
                </div>
              </div>
              
              {/* Filters Section */}
              <div className="flex flex-wrap items-center gap-2">
                  {/* Activity Type Filter */}
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg shadow-sm border border-gray-200">
                    <Activity className="w-3.5 h-3.5 text-gray-400" />
                    <label className="text-xs text-gray-600">TYPE:</label>
                    <select
                      value={activityTypeFilter}
                      onChange={(e) => {
                        setActivityTypeFilter(e.target.value);
                        filterActivitiesByDate(activityStartDate, activityEndDate, e.target.value, activityGroupHeadFilter, activityStatusFilter);
                      }}
                      className="px-1.5 py-0.5 border-0 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded bg-transparent"
                    >
                      <option value="all">All Types</option>
                      <option value="survey">Survey</option>
                      <option value="poll">Poll</option>
                      <option value="assessment">Assessment</option>
                    </select>
                  </div>
                  
                  {/* Group Head Filter */}
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg shadow-sm border border-gray-200">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <label className="text-xs text-gray-600">GROUP HEAD:</label>
                    <select
                      value={activityGroupHeadFilter}
                      onChange={(e) => {
                        setActivityGroupHeadFilter(e.target.value);
                        filterActivitiesByDate(activityStartDate, activityEndDate, activityTypeFilter, e.target.value, activityStatusFilter);
                      }}
                      className="px-1.5 py-0.5 border-0 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded bg-transparent"
                    >
                      <option value="all">All Group Heads</option>
                      {Array.from(new Set(
                        (subscriptionMetrics?.activity_details || [])
                          .map((a: any) => a.group_head)
                          .filter((gh: string) => gh && gh !== 'N/A')
                      )).sort().map((gh: any) => (
                        <option key={gh} value={gh}>{gh}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg shadow-sm border border-gray-200">
                    <CheckCircle className="w-3.5 h-3.5 text-gray-400" />
                    <label className="text-xs text-gray-600">STATUS:</label>
                    <select
                      value={activityStatusFilter}
                      onChange={(e) => {
                        setActivityStatusFilter(e.target.value);
                        filterActivitiesByDate(activityStartDate, activityEndDate, activityTypeFilter, activityGroupHeadFilter, e.target.value);
                      }}
                      className="px-1.5 py-0.5 border-0 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded bg-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="live">Live</option>
                      <option value="draft">Draft</option>
                      <option value="closed">Completed</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg shadow-sm border border-gray-200">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <label className="text-xs text-gray-600">FROM:</label>
                    <input
                      type="date"
                      value={activityStartDate}
                      onChange={(e) => {
                        setActivityStartDate(e.target.value);
                        filterActivitiesByDate(e.target.value, activityEndDate, activityTypeFilter, activityGroupHeadFilter, activityStatusFilter);
                      }}
                      className="px-1.5 py-0.5 border-0 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg shadow-sm border border-gray-200">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <label className="text-xs text-gray-600">TO:</label>
                    <input
                      type="date"
                      value={activityEndDate}
                      onChange={(e) => {
                        setActivityEndDate(e.target.value);
                        filterActivitiesByDate(activityStartDate, e.target.value, activityTypeFilter, activityGroupHeadFilter, activityStatusFilter);
                      }}
                      className="px-1.5 py-0.5 border-0 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                    />
                  </div>
                  {(activityStartDate || activityEndDate || activityTypeFilter !== "all" || activityGroupHeadFilter !== "all" || activityStatusFilter !== "all") && (
                    <button
                      onClick={() => {
                        setActivityStartDate("");
                        setActivityEndDate("");
                        setActivityTypeFilter("all");
                        setActivityGroupHeadFilter("all");
                        setActivityStatusFilter("all");
                        setFilteredActivityDetails(subscriptionMetrics.activity_details);
                      }}
                      className="px-2.5 py-1.5 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-gray-600 uppercase">
                        #
                      </th>
                      <th className="px-3 py-2 text-left text-xs text-gray-600 uppercase">
                        Group Head
                      </th>
                      <th className="px-3 py-2 text-left text-xs text-gray-600 uppercase">
                        Program
                      </th>
                      <th className="px-3 py-2 text-left text-xs text-gray-600 uppercase min-w-[200px]">
                        Activity
                      </th>
                      <th className="px-3 py-2 text-left text-xs text-gray-600 uppercase">
                        Type
                      </th>
                      <th className="px-3 py-2 text-center text-xs text-gray-600 uppercase bg-blue-50 border-l border-r border-blue-200" colSpan={3}>
                        📅 Date Timeline
                      </th>
                      <th className="px-3 py-2 text-center text-xs text-gray-600 uppercase bg-green-50 border-r border-green-200" colSpan={4}>
                        💰 Pricing (₹)
                      </th>
                    </tr>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <th colSpan={5}></th>
                      <th className="px-3 py-1.5 text-center text-xs text-blue-600 bg-blue-50 border-l border-blue-200">Config</th>
                      <th className="px-3 py-1.5 text-center text-xs text-blue-600 bg-blue-50">Start</th>
                      <th className="px-3 py-1.5 text-center text-xs text-blue-600 bg-blue-50 border-r border-blue-200">End</th>
                      <th className="px-3 py-1.5 text-center text-xs text-green-600 bg-green-50">Config</th>
                      <th className="px-3 py-1.5 text-center text-xs text-green-600 bg-green-50">Subsc</th>
                      <th className="px-3 py-1.5 text-center text-xs text-green-600 bg-green-50">Tax</th>
                      <th className="px-3 py-1.5 text-center text-xs text-green-600 bg-green-50 border-r border-green-200">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {filteredActivityDetails.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-4 py-12 text-center">
                          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">No activities found for selected date range</p>
                          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                        </td>
                      </tr>
                    ) : filteredActivityDetails.map((activity: any, index: number) => (
                      <tr key={activity.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-all duration-200 border-b border-gray-100 group`}>
                        <td className="px-3 py-3 text-xs text-gray-700 group-hover:text-blue-600">
                          {index + 1}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700">
                          {activity.group_head && activity.group_head !== 'N/A' ? activity.group_head : '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700">
                          {activity.program}
                        </td>
                        <td className="px-3 py-3">
                          <a 
                            href={`/activities/${activity.id}/edit`}
                            className="text-xs text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                          >
                            {activity.name}
                          </a>
                          {activity.subscription_frequency && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500 capitalize bg-gray-100 px-1.5 py-0.5 rounded-full">{activity.subscription_frequency}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs ${
                            activity.type === 'survey' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                            activity.type === 'poll' ? 'bg-green-100 text-green-700 border border-green-200' :
                            'bg-cyan-50 text-purple-700 border border-purple-200'
                          }`}>
                            {activity.type}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 text-center bg-blue-50/30 border-l border-blue-100">
                          {activity.configuration_date || '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 text-center bg-blue-50/30">
                          {activity.start_date || '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 text-center bg-blue-50/30 border-r border-blue-100">
                          {activity.end_date || '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-900 text-right bg-green-50/30">
                          ₹{activity.configuration_price === 0 ? '0' : activity.configuration_price.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-900 text-right bg-green-50/30">
                          ₹{activity.subscription_price.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-900 text-right bg-green-50/30">
                          ₹{activity.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </td>
                        <td className="px-3 py-3 text-xs text-emerald-700 text-right font-semibold bg-green-50/30 border-r border-green-100">
                          ₹{activity.total_price.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    {filteredActivityDetails.length > 0 && (
                    <tr className="bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 border-t-2 border-indigo-500">
                      <td colSpan={8} className="px-3 py-3 text-xs text-gray-900 text-right uppercase">
                        <span className="inline-flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5" />
                          Grand Total (Configuration + Subscription + Tax):
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-900 text-right font-semibold bg-green-100">
                        ₹{filteredActivityDetails.reduce((sum, act) => sum + (act.configuration_price || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-900 text-right font-semibold bg-green-100">
                        ₹{filteredActivityDetails.reduce((sum, act) => sum + (act.subscription_price || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-900 text-right font-semibold bg-green-100">
                        ₹{filteredActivityDetails.reduce((sum, act) => sum + (act.tax_amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-3 text-sm text-emerald-700 text-right font-bold bg-gradient-to-r from-green-100 to-emerald-100 border-r border-green-200">
                        ₹{filteredActivityDetails.reduce((sum, act) => sum + (act.total_price || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </td>
                    </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          </div>
        )}
          </TabsContent>
        </Tabs>

        {/* Send Reminder Dialog */}
        {showReminderDialog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-50 rounded-lg">
                      <Bell className="w-5 h-5 text-qsights-cyan" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Set Reminder</h3>
                      <p className="text-sm text-gray-500">Schedule a calendar reminder</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowReminderDialog(false)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Event Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Event
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-cyan"
                  >
                    {activities.map((activity: any) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name} ({activity.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-cyan"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-cyan"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reminder Message (Optional)
                  </label>
                  <textarea
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-cyan"
                    placeholder="Add a custom message..."
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <span className="font-semibold">📅 Note:</span> This will open Google Calendar where you can add the reminder to your calendar.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <div className="flex items-center gap-3 justify-end">
                  <button
                    onClick={() => setShowReminderDialog(false)}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={scheduleReminder}
                    disabled={sendingReminder}
                    className="px-4 py-2 bg-qsights-cyan text-white rounded-lg font-medium hover:bg-qsights-cyan/90 transition-colors disabled:opacity-50"
                  >
                    {sendingReminder ? "Opening Calendar..." : "Open Calendar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
