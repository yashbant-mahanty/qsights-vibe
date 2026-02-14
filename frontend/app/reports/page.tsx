"use client";

import React, { useState, useEffect, useMemo } from "react";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Download,
  Filter,
  Calendar,
  Building2,
  FolderOpen,
  Activity,
  Users,
  FileText,
  Clock,
  Minus,
  ChevronLeft,
  ChevronRight,
  Bell,
  LayoutGrid,
  ListOrdered,
  UserCircle,
} from "lucide-react";
import { 
  organizationsApi, 
  programsApi, 
  activitiesApi, 
  participantsApi,
  evaluationEventsApi,
  notificationsApi
} from "@/lib/api";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    organization: "all",
    program: "all",
    activityType: "all",
    dateRange: "30days",
    startDate: "",
    endDate: "",
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  
  // Tab state
  const [activeTab, setActiveTab] = useState("overview");
  
  // Pagination states for each tab
  const [overviewPage, setOverviewPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const [participantPage, setParticipantPage] = useState(1);
  const [notificationPage, setNotificationPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    loadData();

    // Listen for global search events
    const handleGlobalSearch = (e: CustomEvent) => {
      if (e.detail.pathname === '/reports') {
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
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // Get current user to check role and programId
      const userResponse = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      let fetchedUser = null;
      if (userResponse.ok) {
        const userData = await userResponse.json();
        fetchedUser = userData.user;
        setUser(fetchedUser);
      }
      
      // If user is program-admin, program-manager, program-moderator, or evaluation-admin, filter by their program
      if (fetchedUser && fetchedUser.programId && ['program-admin', 'program-manager', 'program-moderator', 'evaluation-admin'].includes(fetchedUser.role)) {
        // For evaluation-admin, load evaluation events instead of activities
        if (fetchedUser.role === 'evaluation-admin') {
          const [orgsData, progsData, evalEventsData, partsData] = await Promise.all([
            organizationsApi.getAll().catch(() => []),
            programsApi.getAll({ program_id: fetchedUser.programId }).catch(() => []),
            evaluationEventsApi.getAll({ program_id: fetchedUser.programId }).catch(() => []),
            participantsApi.getAll({ program_id: fetchedUser.programId }).catch(() => []),
          ]);
          setOrganizations(orgsData);
          setPrograms(progsData);
          // Convert evaluation events to activity-like format for consistency
          const evaluationActivities = (evalEventsData || []).map((event: any) => ({
            ...event,
            type: 'evaluation',
            code: event.code || String(event.id).slice(0, 8),
            // Map evaluation event fields to activity fields
            participants_count: 0, // Evaluation events don't have direct participant count
            active_participants_count: 0,
            anonymous_participants_count: 0,
            participants_responded_count: 0,
            responses_count: 0,
            authenticated_responses_count: 0,
            guest_responses_count: 0,
          }));
          
          // Check if data is paginated
          const programsArray = Array.isArray(progsData) ? progsData : progsData?.data || [];
          const participantsArray = Array.isArray(partsData) ? partsData : partsData?.data || [];
          const orgsArray = Array.isArray(orgsData) ? orgsData : orgsData?.data || [];
          
          setActivities(evaluationActivities);
          setPrograms(programsArray);
          setParticipants(participantsArray);
          setOrganizations(orgsArray);
        } else {
          // For other program-scoped roles, load regular activities
          const [orgsData, progsData, actsData, partsData] = await Promise.all([
            organizationsApi.getAll().catch((err) => { console.error('Orgs error:', err); return []; }),
            programsApi.getAll({ program_id: fetchedUser.programId }).catch((err) => { console.error('Programs error:', err); return []; }),
            activitiesApi.getAll({ program_id: fetchedUser.programId }).catch((err) => { console.error('Activities error:', err); return []; }),
            participantsApi.getAll({ program_id: fetchedUser.programId }).catch((err) => { console.error('Participants error:', err); return []; }),
          ]);
          
          console.log('🔍 Reports Data Loaded (Program-scoped):', {
            user: fetchedUser,
            programId: fetchedUser.programId,
            organizations: orgsData?.length || 0,
            programs: progsData?.length || 0,
            activities: actsData?.length || 0,
            activitiesSample: actsData?.[0],
            participants: partsData?.length || 0
          });
          
          // Check if activities is an object with data property
          const activitiesArray = Array.isArray(actsData) ? actsData : actsData?.data || [];
          const programsArray = Array.isArray(progsData) ? progsData : progsData?.data || [];
          const participantsArray = Array.isArray(partsData) ? partsData : partsData?.data || [];
          const orgsArray = Array.isArray(orgsData) ? orgsData : orgsData?.data || [];
          
          setOrganizations(orgsArray);
          setPrograms(programsArray);
          setActivities(activitiesArray);
          setParticipants(participantsArray);
        }
      } else {
        // Super-admin, admin, or other roles see all data
        const [orgsData, progsData, actsData, partsData, logsData] = await Promise.all([
          organizationsApi.getAll().catch((err) => { console.error('Orgs error:', err); return []; }),
          programsApi.getAll().catch((err) => { console.error('Programs error:', err); return []; }),
          activitiesApi.getAll().catch((err) => { console.error('Activities error:', err); return []; }),
          participantsApi.getAll().catch((err) => { console.error('Participants error:', err); return []; }),
          notificationsApi.getAllLogs().catch((err) => { console.error('Notifications error:', err); return { data: [] }; }),
        ]);
        
        console.log('🔍 Reports Data Loaded:', {
          user: fetchedUser,
          organizations: orgsData?.length || 0,
          programs: progsData?.length || 0,
          activities: actsData?.length || 0,
          activitiesSample: actsData?.[0],
          participants: partsData?.length || 0,
          notifications: logsData?.data?.length || 0
        });
        
        // Check if activities is an object with data property (paginated response)
        const activitiesArray = Array.isArray(actsData) ? actsData : actsData?.data || [];
        const programsArray = Array.isArray(progsData) ? progsData : progsData?.data || [];
        const participantsArray = Array.isArray(partsData) ? partsData : partsData?.data || [];
        const orgsArray = Array.isArray(orgsData) ? orgsData : orgsData?.data || [];
        
        console.log('📊 After Array Conversion:', {
          activitiesCount: activitiesArray.length,
          programsCount: programsArray.length,
          participantsCount: participantsArray.length,
          orgsCount: orgsArray.length,
          firstActivity: activitiesArray[0]
        });
        
        setOrganizations(orgsArray);
        setPrograms(programsArray);
        setActivities(activitiesArray);
        setParticipants(participantsArray);
        setNotificationLogs(logsData?.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filter data based on current filters
  const getFilteredActivities = () => {
    let filtered = activities;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(a => 
        a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.organization !== "all") {
      filtered = filtered.filter(a => a.organization_id === filters.organization);
    }

    if (filters.program !== "all") {
      filtered = filtered.filter(a => a.program_id === filters.program);
    }

    if (filters.activityType !== "all") {
      filtered = filtered.filter(a => a.type === filters.activityType);
    }

    // Date filtering
    if (filters.dateRange !== "custom") {
      const now = new Date();
      let startDate = new Date();
      
      switch (filters.dateRange) {
        case "7days":
          startDate.setDate(now.getDate() - 7);
          break;
        case "30days":
          startDate.setDate(now.getDate() - 30);
          break;
        case "90days":
          startDate.setDate(now.getDate() - 90);
          break;
        case "6months":
          startDate.setMonth(now.getMonth() - 6);
          break;
        case "1year":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(a => {
        const activityDate = new Date(a.created_at);
        return activityDate >= startDate;
      });
    } else if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      filtered = filtered.filter(a => {
        const activityDate = new Date(a.created_at);
        return activityDate >= start && activityDate <= end;
      });
    }

    return filtered;
  };

  const filteredActivities = getFilteredActivities();
  
  // Pagination calculations for Overview tab
  const overviewTotalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const paginatedOverviewData = useMemo(() => {
    const startIndex = (overviewPage - 1) * itemsPerPage;
    return filteredActivities.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredActivities, overviewPage, itemsPerPage]);

  // Event-wise grouping and pagination
  const eventGroupedData = useMemo(() => {
    const grouped: { [key: string]: typeof filteredActivities } = {};
    filteredActivities.forEach(activity => {
      const eventType = activity.type || 'unknown';
      if (!grouped[eventType]) grouped[eventType] = [];
      grouped[eventType].push(activity);
    });
    return Object.entries(grouped).map(([type, activities]) => ({
      type,
      count: activities.length,
      totalResponses: activities.reduce((sum, a) => sum + (a.responses_count || 0), 0),
      totalParticipants: activities.reduce((sum, a) => sum + ((a.active_participants_count || 0) + (a.anonymous_participants_count || 0)), 0),
      activities
    }));
  }, [filteredActivities]);
  const eventTotalPages = Math.ceil(eventGroupedData.length / itemsPerPage);
  const paginatedEventData = useMemo(() => {
    const startIndex = (eventPage - 1) * itemsPerPage;
    return eventGroupedData.slice(startIndex, startIndex + itemsPerPage);
  }, [eventGroupedData, eventPage, itemsPerPage]);

  // Participant-wise data (aggregate by program)
  const participantData = useMemo(() => {
    const grouped: { [key: string]: { programId: string | number, programName: string, totalParticipants: number, responded: number, responses: number } } = {};
    filteredActivities.forEach(activity => {
      const programId = activity.program_id || 'unassigned';
      const key = String(programId);
      if (!grouped[key]) {
        grouped[key] = {
          programId,
          programName: `Program ${programId}`,
          totalParticipants: 0,
          responded: 0,
          responses: 0
        };
      }
      grouped[key].totalParticipants += (activity.active_participants_count || 0) + (activity.anonymous_participants_count || 0);
      grouped[key].responded += activity.participants_responded_count || 0;
      grouped[key].responses += activity.responses_count || 0;
    });
    return Object.values(grouped);
  }, [filteredActivities]);
  const participantTotalPages = Math.ceil(participantData.length / itemsPerPage);
  const paginatedParticipantData = useMemo(() => {
    const startIndex = (participantPage - 1) * itemsPerPage;
    return participantData.slice(startIndex, startIndex + itemsPerPage);
  }, [participantData, participantPage, itemsPerPage]);

  // Notifications pagination
  const notificationTotalPages = Math.ceil(notificationLogs.length / itemsPerPage);
  const paginatedNotifications = useMemo(() => {
    const startIndex = (notificationPage - 1) * itemsPerPage;
    return notificationLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [notificationLogs, notificationPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setOverviewPage(1);
    setEventPage(1);
    setParticipantPage(1);
    setNotificationPage(1);
  }, [JSON.stringify(filters), searchQuery, itemsPerPage]);

  // Calculate statistics from real data (Active + Anonymous, excluding Preview)
  const totalResponses = filteredActivities.reduce((sum, a) => sum + (a.responses_count || 0), 0);
  const authenticatedResponses = filteredActivities.reduce((sum, a) => sum + (a.authenticated_responses_count || 0), 0);
  const guestResponses = filteredActivities.reduce((sum, a) => sum + (a.guest_responses_count || 0), 0);
  const totalActiveParticipants = filteredActivities.reduce((sum, a) => sum + ((a.active_participants_count || 0) + (a.anonymous_participants_count || 0)), 0);
  const totalParticipantsResponded = filteredActivities.reduce((sum, a) => sum + (a.participants_responded_count || 0), 0);
  const completionRate = totalActiveParticipants > 0 ? Math.round((totalParticipantsResponded / totalActiveParticipants) * 100) : 0;

  const stats = [
    {
      title: "Total Responses",
      value: `${totalResponses} (${authenticatedResponses}/${guestResponses})`,
      subtitle: "(Participant/Anonymous)",
      icon: FileText,
      variant: "blue" as const,
    },
    {
      title: "Active Participants",
      value: totalParticipantsResponded.toString(),
      subtitle: `${totalActiveParticipants} total invited`,
      icon: Users,
      variant: "green" as const,
    },
    {
      title: "Completion Rate",
      value: `${completionRate}%`,
      subtitle: "Overall completion",
      icon: TrendingUp,
      variant: "purple" as const,
    },
    {
      title: "Avg. Response Time",
      value: "0m",
      subtitle: "Per response",
      icon: Clock,
      variant: "orange" as const,
    },
  ];

  const getTrendIcon = (trend: string) => {
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (trend: string) => {
    return "text-gray-500";
  };

  const hasData = filteredActivities.length > 0;

  const exportToPDF = () => {
    // Create CSV content from the filtered activities data
    const headers = ['Activity', 'Type', 'Program', 'Active', 'Anonymous', 'Total', 'Responded', 'Responses', 'Completion Rate', 'Status'];
    const rows = filteredActivities.map(activity => {
      const active = activity.active_participants_count || 0;
      const anonymous = activity.anonymous_participants_count || 0;
      const participants = active + anonymous;
      const responded = activity.participants_responded_count || 0;
      const responses = activity.responses_count || 0;
      const completion = participants > 0 ? Math.round((responded / participants) * 100) : 0;
      
      return [
        activity.name,
        activity.type,
        String(activity.program_id || '').substring(0, 8).toUpperCase() || 'N/A',
        active,
        anonymous,
        participants,
        responded,
        responses,
        `${completion}%`,
        activity.status
      ];
    });

    // Create a simple text report
    let content = 'REPORTS & ANALYTICS\n\n';
    content += `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
    content += `SUMMARY STATISTICS\n`;
    content += `Total Responses: ${totalResponses}\n`;
    content += `Active Participants: ${totalParticipantsResponded}\n`;
    content += `Completion Rate: ${completionRate}%\n\n`;
    content += `ACTIVITY BREAKDOWN\n\n`;
    content += headers.join('\t') + '\n';
    content += '-'.repeat(100) + '\n';
    rows.forEach(row => {
      content += row.join('\t') + '\n';
    });

    // Create a blob and download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-analytics-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    // Create CSV content
    const headers = ['Activity', 'Code', 'Type', 'Program', 'Participants', 'Responded', 'Responses', 'Completion Rate', 'Status', 'Start Date', 'End Date'];
    const rows = filteredActivities.map(activity => {
      const participants = activity.participants_count || 0;
      const responded = activity.participants_responded_count || 0;
      const responses = activity.responses_count || 0;
      const completion = participants > 0 ? Math.round((responded / participants) * 100) : 0;
      
      return [
        `"${activity.name}"`,
        String(activity.id).padStart(8, '0'),
        activity.type,
        activity.program_id ? String(activity.program_id).padStart(8, '0') : 'N/A',
        participants,
        responded,
        responses,
        `${completion}%`,
        activity.status,
        activity.start_date || 'N/A',
        activity.end_date || 'N/A'
      ];
    });

    // Build CSV content
    let csvContent = 'REPORTS & ANALYTICS\n';
    csvContent += `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
    csvContent += `SUMMARY\n`;
    csvContent += `Total Responses,${totalResponses}\n`;
    csvContent += `Active Participants,${totalParticipantsResponded}\n`;
    csvContent += `Total Participants,${totalActiveParticipants}\n`;
    csvContent += `Completion Rate,${completionRate}%\n\n`;
    csvContent += `ACTIVITY BREAKDOWN\n`;
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">
              View insights and analyze activity responses
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={exportToPDF}
              disabled={!hasData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
            <button 
              onClick={exportToExcel}
              disabled={!hasData}
              className="flex items-center gap-2 px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Filter className="w-5 h-5 text-qsights-blue" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Organization Filter - Only show for super-admin and admin */}
              {user && !['program-admin', 'program-manager', 'program-moderator'].includes(user.role) && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    Organization
                  </label>
                  <select
                    value={filters.organization}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, organization: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                  >
                    <option value="all">All Organizations</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Program Filter */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FolderOpen className="w-4 h-4 text-gray-500" />
                  Program
                </label>
                <select
                  value={filters.program}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, program: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                >
                  <option value="all">All Programs</option>
                  {programs
                    .filter(p => filters.organization === "all" || p.organization_id === filters.organization)
                    .map(prog => (
                      <option key={prog.id} value={prog.id}>
                        {prog.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Activity Type Filter */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Activity className="w-4 h-4 text-gray-500" />
                  Activity Type
                </label>
                <select
                  value={filters.activityType}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, activityType: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="survey">Surveys</option>
                  <option value="poll">Polls</option>
                  <option value="assessment">Assessments</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, dateRange: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="1year">Last Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
            </div>

            {/* Custom Date Range */}
            {filters.dateRange === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Filter Actions */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setFilters({...filters})}
                className="px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={() =>
                  setFilters({
                    organization: "all",
                    program: "all",
                    activityType: "all",
                    dateRange: "30days",
                    startDate: "",
                    endDate: "",
                  })
                }
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <GradientStatCard
                key={index}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                variant={stat.variant}
              />
            ))}
          </div>
        )}

        {!hasData && !loading ? (
          /* Placeholder State */
          <div className="space-y-4">
            {/* Placeholder Message */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-dashed border-blue-200">
              <CardContent className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
                  <BarChart3 className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  No Data Available Yet
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Reports will appear once responses are collected from your activities.
                  Start by creating and launching activities to gather insights.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <a
                    href="/activities/create"
                    className="px-6 py-3 bg-qsights-cyan text-white rounded-lg font-medium hover:bg-qsights-cyan/90 transition-colors"
                  >
                    Create Activity
                  </a>
                  <a
                    href="/activities"
                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    View Activities
                  </a>
                </div>
              </CardContent>
            </Card>


          </div>
        ) : (
          /* Activity Breakdown with Tabs */
          <Card>
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-qsights-blue" />
                Reports & Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 border-b bg-gray-50">
                  <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <LayoutGrid className="w-4 h-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="event-wise" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <ListOrdered className="w-4 h-4" />
                    Event-wise
                  </TabsTrigger>
                  <TabsTrigger value="participant-wise" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <UserCircle className="w-4 h-4" />
                    Participant-wise
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <Bell className="w-4 h-4" />
                    Notifications
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responded</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responses</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedOverviewData.map((activity) => {
                          const activeParticipants = activity.active_participants_count || 0;
                          const anonymousParticipants = activity.anonymous_participants_count || 0;
                          const totalParticipants = activeParticipants + anonymousParticipants;
                          const responded = activity.participants_responded_count || 0;
                          const responses = activity.responses_count || 0;
                          const completion = totalParticipants > 0 ? Math.round((responded / totalParticipants) * 100) : 0;

                          return (
                            <tr key={activity.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <p className="text-sm font-semibold text-gray-900">{activity.name}</p>
                                <p className="text-xs text-gray-500 font-mono mt-0.5">{String(activity.id).padStart(8, '0')}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  activity.type === 'survey' ? 'bg-blue-100 text-blue-700' :
                                  activity.type === 'poll' ? 'bg-green-100 text-green-700' :
                                  'bg-cyan-50 text-purple-700'
                                }`}>{activity.type}</span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-gray-900">{activity.program_id ? String(activity.program_id).padStart(8, '0') : 'N/A'}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-gray-600">({activeParticipants} / {anonymousParticipants})</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-medium text-gray-900">{responded}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-medium text-gray-900">{responses}</p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 min-w-[60px]">
                                    <div className="text-xs font-medium text-gray-900 mb-1">{completion}%</div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                      <div className={`h-1.5 rounded-full ${
                                        completion >= 80 ? 'bg-green-500' :
                                        completion >= 50 ? 'bg-blue-500' :
                                        completion >= 25 ? 'bg-yellow-500' :
                                        'bg-red-500'
                                      }`} style={{ width: `${Math.min(completion, 100)}%` }}></div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  activity.status === 'live' ? 'bg-green-100 text-green-700' :
                                  activity.status === 'upcoming' ? 'bg-yellow-100 text-yellow-700' :
                                  activity.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                                  activity.status === 'closed' ? 'bg-blue-100 text-blue-700' :
                                  activity.status === 'expired' ? 'bg-red-100 text-red-700' :
                                  'bg-cyan-50 text-purple-700'
                                }`}>{activity.status}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Overview Pagination */}
                  <div className="px-6 py-4 border-t border-gray-200">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-600">
                            Showing {filteredActivities.length > 0 ? (overviewPage - 1) * itemsPerPage + 1 : 0} to{" "}
                            {Math.min(overviewPage * itemsPerPage, filteredActivities.length)} of{" "}
                            {filteredActivities.length} activities
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Per page:</span>
                            <select
                              value={itemsPerPage}
                              onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setOverviewPage(1);
                              }}
                              className="px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setOverviewPage(1)}
                            disabled={overviewPage === 1}
                            className="px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            title="First page"
                          >
                            «
                          </button>
                          <button
                            onClick={() => setOverviewPage(Math.max(1, overviewPage - 1))}
                            disabled={overviewPage === 1}
                            className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                          </button>
                          {(() => {
                            const pages: (number | string)[] = [];
                            const maxVisible = 5;
                            if (overviewTotalPages <= maxVisible + 2) {
                              for (let i = 1; i <= overviewTotalPages; i++) pages.push(i);
                            } else {
                              pages.push(1);
                              let start = Math.max(2, overviewPage - Math.floor(maxVisible / 2));
                              let end = Math.min(overviewTotalPages - 1, start + maxVisible - 1);
                              if (end === overviewTotalPages - 1) start = Math.max(2, end - maxVisible + 1);
                              if (start > 2) pages.push('...');
                              for (let i = start; i <= end; i++) pages.push(i);
                              if (end < overviewTotalPages - 1) pages.push('...');
                              if (overviewTotalPages > 1) pages.push(overviewTotalPages);
                            }
                            return pages.map((page, idx) => (
                              page === '...' ? (
                                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 text-sm">...</span>
                              ) : (
                                <button
                                  key={page}
                                  onClick={() => setOverviewPage(page as number)}
                                  className={`min-w-[36px] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    overviewPage === page
                                      ? "bg-qsights-dark text-white shadow-sm"
                                      : "text-gray-700 hover:bg-gray-100 border border-gray-300"
                                  }`}
                                >
                                  {page}
                                </button>
                              )
                            ));
                          })()}
                          <button
                            onClick={() => setOverviewPage(Math.min(overviewTotalPages, overviewPage + 1))}
                            disabled={overviewPage === overviewTotalPages || overviewTotalPages === 0}
                            className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => setOverviewPage(overviewTotalPages)}
                            disabled={overviewPage === overviewTotalPages || overviewTotalPages === 0}
                            className="px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            title="Last page"
                          >
                            »
                          </button>
                        </div>
                      </div>
                    </div>
                </TabsContent>

                {/* Event-wise Tab */}
                <TabsContent value="event-wise" className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Responses</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Participants</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Response Rate</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedEventData.map((event) => {
                          const avgRate = event.totalParticipants > 0 ? Math.round((event.totalResponses / event.totalParticipants) * 100) : 0;
                          return (
                            <tr key={event.type} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  event.type === 'survey' ? 'bg-blue-100 text-blue-700' :
                                  event.type === 'poll' ? 'bg-green-100 text-green-700' :
                                  'bg-cyan-50 text-purple-700'
                                }`}>{event.type}</span>
                              </td>
                              <td className="px-6 py-4"><p className="text-sm font-medium text-gray-900">{event.count}</p></td>
                              <td className="px-6 py-4"><p className="text-sm font-medium text-gray-900">{event.totalResponses}</p></td>
                              <td className="px-6 py-4"><p className="text-sm text-gray-600">{event.totalParticipants}</p></td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 min-w-[60px]">
                                    <div className="text-xs font-medium text-gray-900 mb-1">{avgRate}%</div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                      <div className={`h-1.5 rounded-full ${avgRate >= 80 ? 'bg-green-500' : avgRate >= 50 ? 'bg-blue-500' : avgRate >= 25 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(avgRate, 100)}%` }}></div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Event-wise Pagination */}
                  <div className="px-6 py-4 border-t border-gray-200">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-600">
                            Showing {eventGroupedData.length > 0 ? (eventPage - 1) * itemsPerPage + 1 : 0} to{" "}
                            {Math.min(eventPage * itemsPerPage, eventGroupedData.length)} of{" "}
                            {eventGroupedData.length} event types
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Per page:</span>
                            <select
                              value={itemsPerPage}
                              onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setEventPage(1);
                              }}
                              className="px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEventPage(1)} disabled={eventPage === 1} className="px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm" title="First page">«</button>
                          <button onClick={() => setEventPage(Math.max(1, eventPage - 1))} disabled={eventPage === 1} className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
                          {(() => {
                            const pages: (number | string)[] = [];
                            const maxVisible = 5;
                            if (eventTotalPages <= maxVisible + 2) {
                              for (let i = 1; i <= eventTotalPages; i++) pages.push(i);
                            } else {
                              pages.push(1);
                              let start = Math.max(2, eventPage - Math.floor(maxVisible / 2));
                              let end = Math.min(eventTotalPages - 1, start + maxVisible - 1);
                              if (end === eventTotalPages - 1) start = Math.max(2, end - maxVisible + 1);
                              if (start > 2) pages.push('...');
                              for (let i = start; i <= end; i++) pages.push(i);
                              if (end < eventTotalPages - 1) pages.push('...');
                              if (eventTotalPages > 1) pages.push(eventTotalPages);
                            }
                            return pages.map((page, idx) => (
                              page === '...' ? (
                                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 text-sm">...</span>
                              ) : (
                                <button key={page} onClick={() => setEventPage(page as number)} className={`min-w-[36px] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${eventPage === page ? "bg-qsights-dark text-white shadow-sm" : "text-gray-700 hover:bg-gray-100 border border-gray-300"}`}>{page}</button>
                              )
                            ));
                          })()}
                          <button onClick={() => setEventPage(Math.min(eventTotalPages, eventPage + 1))} disabled={eventPage === eventTotalPages || eventTotalPages === 0} className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
                          <button onClick={() => setEventPage(eventTotalPages)} disabled={eventPage === eventTotalPages || eventTotalPages === 0} className="px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm" title="Last page">»</button>
                        </div>
                      </div>
                    </div>
                </TabsContent>

                {/* Participant-wise Tab */}
                <TabsContent value="participant-wise" className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Participants</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responded</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Responses</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Rate</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedParticipantData.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                              <UserCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                              <p className="text-lg font-medium">No participant data yet</p>
                              <p className="text-sm">Participant analytics will appear here when participants respond to activities.</p>
                            </td>
                          </tr>
                        ) : (
                          paginatedParticipantData.map((item) => {
                            const rate = item.totalParticipants > 0 ? Math.round((item.responded / item.totalParticipants) * 100) : 0;
                            return (
                              <tr key={String(item.programId)} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                  <p className="text-sm font-semibold text-gray-900">{item.programId === 'unassigned' ? 'Unassigned' : String(item.programId).padStart(8, '0')}</p>
                                </td>
                                <td className="px-6 py-4"><p className="text-sm text-gray-600">{item.totalParticipants}</p></td>
                                <td className="px-6 py-4"><p className="text-sm font-medium text-gray-900">{item.responded}</p></td>
                                <td className="px-6 py-4"><p className="text-sm font-medium text-gray-900">{item.responses}</p></td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 min-w-[60px]">
                                      <div className="text-xs font-medium text-gray-900 mb-1">{rate}%</div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div className={`h-1.5 rounded-full ${rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-blue-500' : rate >= 25 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(rate, 100)}%` }}></div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Participant-wise Pagination */}
                  {participantData.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-200">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-600">
                            Showing {participantData.length > 0 ? (participantPage - 1) * itemsPerPage + 1 : 0} to{" "}
                            {Math.min(participantPage * itemsPerPage, participantData.length)} of{" "}
                            {participantData.length} programs
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Per page:</span>
                            <select
                              value={itemsPerPage}
                              onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setParticipantPage(1);
                              }}
                              className="px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setParticipantPage(1)} disabled={participantPage === 1} className="px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm" title="First page">«</button>
                          <button onClick={() => setParticipantPage(Math.max(1, participantPage - 1))} disabled={participantPage === 1} className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
                          {(() => {
                            const pages: (number | string)[] = [];
                            const maxVisible = 5;
                            if (participantTotalPages <= maxVisible + 2) {
                              for (let i = 1; i <= participantTotalPages; i++) pages.push(i);
                            } else {
                              pages.push(1);
                              let start = Math.max(2, participantPage - Math.floor(maxVisible / 2));
                              let end = Math.min(participantTotalPages - 1, start + maxVisible - 1);
                              if (end === participantTotalPages - 1) start = Math.max(2, end - maxVisible + 1);
                              if (start > 2) pages.push('...');
                              for (let i = start; i <= end; i++) pages.push(i);
                              if (end < participantTotalPages - 1) pages.push('...');
                              if (participantTotalPages > 1) pages.push(participantTotalPages);
                            }
                            return pages.map((page, idx) => (
                              page === '...' ? (
                                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 text-sm">...</span>
                              ) : (
                                <button key={page} onClick={() => setParticipantPage(page as number)} className={`min-w-[36px] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${participantPage === page ? "bg-qsights-dark text-white shadow-sm" : "text-gray-700 hover:bg-gray-100 border border-gray-300"}`}>{page}</button>
                              )
                            ));
                          })()}
                          <button onClick={() => setParticipantPage(Math.min(participantTotalPages, participantPage + 1))} disabled={participantPage === participantTotalPages || participantTotalPages === 0} className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
                          <button onClick={() => setParticipantPage(participantTotalPages)} disabled={participantPage === participantTotalPages || participantTotalPages === 0} className="px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm" title="Last page">»</button>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Notifications Tab */}
                <TabsContent value="notifications" className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedNotifications.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                              <p className="text-lg font-medium">No notifications yet</p>
                              <p className="text-sm">Notification logs will appear here when activities generate notifications.</p>
                            </td>
                          </tr>
                        ) : paginatedNotifications.map((notification: any) => (
                          <tr key={notification.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-600">{new Date(notification.created_at).toLocaleDateString()}</p>
                              <p className="text-xs text-gray-400">{new Date(notification.created_at).toLocaleTimeString()}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                notification.type === 'activity_created' ? 'bg-blue-100 text-blue-700' :
                                notification.type === 'reminder' ? 'bg-yellow-100 text-yellow-700' :
                                notification.type === 'evaluation' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>{notification.type || 'general'}</span>
                            </td>
                            <td className="px-6 py-4"><p className="text-sm font-medium text-gray-900">{notification.title || 'Notification'}</p></td>
                            <td className="px-6 py-4"><p className="text-sm text-gray-600 max-w-xs truncate">{notification.message || notification.body || '-'}</p></td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${notification.read_at ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {notification.read_at ? 'Read' : 'Unread'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Notifications Pagination */}
                  <div className="px-6 py-4 border-t border-gray-200">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-600">
                            Showing {notificationLogs.length > 0 ? (notificationPage - 1) * itemsPerPage + 1 : 0} to{" "}
                            {Math.min(notificationPage * itemsPerPage, notificationLogs.length)} of{" "}
                            {notificationLogs.length} notifications
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Per page:</span>
                            <select
                              value={itemsPerPage}
                              onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setNotificationPage(1);
                              }}
                              className="px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setNotificationPage(1)} disabled={notificationPage === 1} className="px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm" title="First page">«</button>
                          <button onClick={() => setNotificationPage(Math.max(1, notificationPage - 1))} disabled={notificationPage === 1} className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
                          {(() => {
                            const pages: (number | string)[] = [];
                            const maxVisible = 5;
                            if (notificationTotalPages <= maxVisible + 2) {
                              for (let i = 1; i <= notificationTotalPages; i++) pages.push(i);
                            } else {
                              pages.push(1);
                              let start = Math.max(2, notificationPage - Math.floor(maxVisible / 2));
                              let end = Math.min(notificationTotalPages - 1, start + maxVisible - 1);
                              if (end === notificationTotalPages - 1) start = Math.max(2, end - maxVisible + 1);
                              if (start > 2) pages.push('...');
                              for (let i = start; i <= end; i++) pages.push(i);
                              if (end < notificationTotalPages - 1) pages.push('...');
                              if (notificationTotalPages > 1) pages.push(notificationTotalPages);
                            }
                            return pages.map((page, idx) => (
                              page === '...' ? (
                                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 text-sm">...</span>
                              ) : (
                                <button key={page} onClick={() => setNotificationPage(page as number)} className={`min-w-[36px] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${notificationPage === page ? "bg-qsights-dark text-white shadow-sm" : "text-gray-700 hover:bg-gray-100 border border-gray-300"}`}>{page}</button>
                              )
                            ));
                          })()}
                          <button onClick={() => setNotificationPage(Math.min(notificationTotalPages, notificationPage + 1))} disabled={notificationPage === notificationTotalPages || notificationTotalPages === 0} className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
                          <button onClick={() => setNotificationPage(notificationTotalPages)} disabled={notificationPage === notificationTotalPages || notificationTotalPages === 0} className="px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm" title="Last page">»</button>
                        </div>
                      </div>
                    </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleBasedLayout>
  );
}
