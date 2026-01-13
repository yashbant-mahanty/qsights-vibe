"use client";

import React, { useState, useEffect } from "react";
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
  Mail,
  Eye,
  MousePointer,
  Send,
  CheckCircle,
  PieChart,
  LineChart,
  Settings,
  Search,
  X,
  ChevronDown,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import { 
  organizationsApi, 
  programsApi, 
  activitiesApi, 
  participantsApi,
  notificationsApi
} from "@/lib/api";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";

interface EmailNotification {
  id: string;
  activity_id: string;
  activity_name: string;
  participant_email: string;
  participant_name: string;
  status: 'sent' | 'delivered' | 'opened' | 'read' | 'failed';
  sent_at: string;
  delivered_at?: string;
  opened_at?: string;
  read_at?: string;
  click_count: number;
}

export default function AdvancedAnalyticsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState({
    organization: "all",
    groupHead: "all",
    program: "all",
    activity: "all",
    participant: "all",
    activityType: "all",
    dateRange: "30days",
    startDate: "",
    endDate: "",
    status: "all",
  });

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [groupHeads, setGroupHeads] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();

    // Listen for global search events
    const handleGlobalSearch = (e: CustomEvent) => {
      if (e.detail.pathname === '/analytics') {
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
      
      const userResponse = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      let user = null;
      if (userResponse.ok) {
        const userData = await userResponse.json();
        user = userData.user;
        setCurrentUser(user);
      }
      
      let actsData: any[] = [];
      let partsData: any[] = [];
      
      // Load data based on user role
      if (user && user.programId && ['program-admin', 'program-manager', 'program-moderator'].includes(user.role)) {
        const [orgsData, progsData, acts, parts] = await Promise.all([
          organizationsApi.getAll().catch(() => []),
          programsApi.getAll({ program_id: user.programId }).catch(() => []),
          activitiesApi.getAll({ program_id: user.programId }).catch(() => []),
          participantsApi.getAll({ program_id: user.programId }).catch(() => []),
        ]);
        setOrganizations(orgsData);
        setPrograms(progsData);
        setActivities(acts);
        setParticipants(parts);
        actsData = acts;
        partsData = parts;
      } else {
        const [orgsData, progsData, acts, parts] = await Promise.all([
          organizationsApi.getAll().catch(() => []),
          programsApi.getAll().catch(() => []),
          activitiesApi.getAll().catch(() => []),
          participantsApi.getAll().catch(() => []),
        ]);
        setOrganizations(orgsData);
        setPrograms(progsData);
        setActivities(acts);
        setParticipants(parts);
        actsData = acts;
        partsData = parts;
      }

      // Load real notification reports from API
      try {
        console.log('🔍 Loading all notification reports...');
        const notifData = await notificationsApi.getAllReports();
        console.log('✅ Notification reports loaded:', notifData);
        console.log('Total reports:', notifData.data?.length || 0);
        
        // Transform notification reports to match expected format
        const transformedNotifications = (notifData.data || []).flatMap((report: any) => 
          Array(report.total_recipients).fill(null).map((_, idx) => ({
            id: `${report.id}-${idx}`,
            activity_id: report.activity_id,
            activity_name: report.activity?.name || 'Unknown Activity',
            participant_email: report.failed_emails?.[idx] || `participant-${idx}@example.com`,
            participant_name: `Participant ${idx + 1}`,
            status: idx < report.sent_count ? 'sent' : 'failed',
            sent_at: report.created_at,
            delivered_at: idx < report.sent_count ? report.created_at : null,
            opened_at: null,
            read_at: null,
            click_count: 0,
          }))
        );
        console.log('Transformed notifications count:', transformedNotifications.length);
        setNotifications(transformedNotifications);
      } catch (err) {
        console.error('❌ Failed to load notifications:', err);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }



  // Filter data
  const getFilteredActivities = () => {
    let filtered = activities.filter(a => !a.deleted_at && a.status !== 'archived');

    if (filters.organization !== "all") {
      filtered = filtered.filter(a => a.organization_id === filters.organization);
    }
    if (filters.program !== "all") {
      filtered = filtered.filter(a => a.program_id === filters.program);
    }
    if (filters.activityType !== "all") {
      filtered = filtered.filter(a => a.type === filters.activityType);
    }
    if (filters.status !== "all") {
      filtered = filtered.filter(a => a.status === filters.status);
    }
    if (searchQuery) {
      filtered = filtered.filter(a => 
        a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredActivities = getFilteredActivities();
  // Filter participants to only show VALID ones (registered OR anonymous with proper type)
  const filteredParticipants = participants.filter(p => {
    if (p.deleted_at) return false;
    
    // Registered participants (not guests, or guests without anonymous type)
    const isRegistered = !p.is_guest || 
      (p.additional_data?.participant_type !== 'anonymous');
    
    // Anonymous participants (with proper type marking)
    const isAnonymous = p.additional_data?.participant_type === 'anonymous';
    
    // Include if either registered or anonymous
    return isRegistered || isAnonymous;
  });
  const filteredNotifications = notifications.filter(n => {
    if (filters.activity !== "all") return n.activity_id === filters.activity;
    return true;
  });

  // Calculate statistics from activities (real counts) - UPDATED: Using Active + Anonymous
  const totalRegisteredParticipants = filteredActivities.reduce((sum, a) => sum + (a.active_participants_count || 0), 0);
  const totalAnonymousParticipants = filteredActivities.reduce((sum, a) => sum + (a.anonymous_participants_count || 0), 0);
  const totalParticipantsFromActivities = totalRegisteredParticipants + totalAnonymousParticipants;

  const stats = {
    totalActivities: filteredActivities.length,
    liveActivities: filteredActivities.filter(a => a.status === 'live').length,
    totalParticipants: totalParticipantsFromActivities,
    activeParticipants: totalRegisteredParticipants, // Registered/Active participants
    anonymousParticipants: totalAnonymousParticipants, // Anonymous participants
    totalResponses: filteredActivities.reduce((sum, a) => sum + (a.responses_count || 0), 0),
    averageCompletion: filteredActivities.length > 0
      ? Math.round(filteredActivities.reduce((sum, a) => {
          const registered = a.active_participants_count || 0;
          const anonymous = a.anonymous_participants_count || 0;
          const total = registered + anonymous;
          const responded = a.participants_responded_count || 0;
          // Cap each activity's completion at 100% before averaging
          return sum + (total > 0 ? Math.min(100, (responded / total) * 100) : 0);
        }, 0) / filteredActivities.length)
      : 0,
  };

  // Notification stats
  const notificationStats = {
    sent: filteredNotifications.length,
    delivered: filteredNotifications.filter(n => ['delivered', 'opened', 'read'].includes(n.status)).length,
    opened: filteredNotifications.filter(n => ['opened', 'read'].includes(n.status)).length,
    read: filteredNotifications.filter(n => n.status === 'read').length,
    deliveryRate: filteredNotifications.length > 0
      ? ((filteredNotifications.filter(n => ['delivered', 'opened', 'read'].includes(n.status)).length / filteredNotifications.length) * 100).toFixed(1)
      : 0,
    openRate: filteredNotifications.filter(n => ['delivered', 'opened', 'read'].includes(n.status)).length > 0
      ? ((filteredNotifications.filter(n => ['opened', 'read'].includes(n.status)).length / filteredNotifications.filter(n => ['delivered', 'opened', 'read'].includes(n.status)).length) * 100).toFixed(1)
      : 0,
  };

  // Export functions
  const exportToExcel = async (format: 'xlsx' | 'csv') => {
    // Dynamically import xlsx only when needed (client-side only)
    const XLSX = await import('xlsx');
    
    const data = filteredActivities.map((activity) => {
      const registered = activity.active_participants_count || 0;
      const anonymous = activity.anonymous_participants_count || 0;
      const total = registered + anonymous;
      const responded = activity.participants_responded_count || 0;
      // Cap completion at 100%
      const completion = total > 0 ? Math.min(100, Math.round((responded / total) * 100)) : 0;

      return {
        'Activity Name': activity.name || 'N/A',
        'Activity Code': String(activity.id || '').substring(0, 8).toUpperCase() || 'N/A',
        'Type': activity.type || 'N/A',
        'Program': String(activity.program_id || '').substring(0, 8).toUpperCase() || 'N/A',
        'Participants': registered,
        'Anonymous Participants': anonymous,
        'Total Participants': total,
        'Responses': activity.responses_count || 0,
        'Responded': responded,
        'Completion %': completion,
        'Status': activity.status || 'N/A',
        'Start Date': activity.start_date ? new Date(activity.start_date).toLocaleDateString() : 'N/A',
        'End Date': activity.end_date ? new Date(activity.end_date).toLocaleDateString() : 'N/A',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analytics Report");

    if (format === 'xlsx') {
      XLSX.writeFile(wb, `Analytics_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      XLSX.writeFile(wb, `Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  const exportToPDF = async () => {
    // Dynamically import jspdf and jspdf-autotable only when needed (client-side only)
    // @ts-ignore - jspdf types may not be available
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    // @ts-ignore - jspdf-autotable extends jsPDF prototype
    await import('jspdf-autotable');
    
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text('Advanced Analytics Report', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    // Summary statistics
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Summary Statistics', 14, 40);

    const summaryData = [
      ['Total Events', stats.totalActivities.toString()],
      ['Live Events', stats.liveActivities.toString()],
      ['Total Participants', stats.totalParticipants.toString()],
      ['Total Responses', stats.totalResponses.toString()],
      ['Average Completion', `${stats.averageCompletion}%`],
    ];

    // @ts-ignore - autoTable extends jsPDF prototype
    doc.autoTable({
      startY: 45,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Activity breakdown
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Activity Breakdown', 14, 20);

    const tableData = filteredActivities.map((activity, idx) => {
      const registered = activity.active_participants_count || 0;
      const anonymous = activity.anonymous_participants_count || 0;
      const total = registered + anonymous;

      return [
        (idx + 1).toString(),
        activity.name || 'N/A',
        activity.type || 'N/A',
        `${registered}/${anonymous}`,
        (activity.responses_count || 0).toString(),
        activity.status || 'N/A',
      ];
    });

    // @ts-ignore - autoTable extends jsPDF prototype
    doc.autoTable({
      startY: 25,
      head: [['#', 'Activity', 'Type', 'Participants (R/A)', 'Responses', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
    });

    doc.save(`Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const resetFilters = () => {
    setFilters({
      organization: "all",
      groupHead: "all",
      program: "all",
      activity: "all",
      participant: "all",
      activityType: "all",
      dateRange: "30days",
      startDate: "",
      endDate: "",
      status: "all",
    });
    setSearchQuery("");
  };

  return (
    <RoleBasedLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-500 mt-1">Comprehensive insights and reporting</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? <X className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <div className="relative export-dropdown">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className="w-4 h-4" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        exportToExcel('xlsx');
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      <div>
                        <div className="font-medium">Export as Excel</div>
                        <div className="text-xs text-gray-500">Download .xlsx file</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => {
                        exportToExcel('csv');
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="font-medium">Export as CSV</div>
                        <div className="text-xs text-gray-500">Download .csv file</div>
                      </div>
                    </button>
                    
                    <div className="border-t border-gray-100 my-1"></div>
                    
                    <button
                      onClick={() => {
                        exportToPDF();
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <FileText className="w-4 h-4 text-red-600" />
                      <div>
                        <div className="font-medium">Export as PDF</div>
                        <div className="text-xs text-gray-500">Download .pdf file</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search activities by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Filter className="w-4 h-4 text-qsights-blue" />
                Advanced Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization
                  </label>
                  <select
                    value={filters.organization}
                    onChange={(e) => setFilters({ ...filters, organization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                  >
                    <option value="all">All Organizations</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Program
                  </label>
                  <select
                    value={filters.program}
                    onChange={(e) => setFilters({ ...filters, program: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                  >
                    <option value="all">All Programs</option>
                    {programs.map((prog) => (
                      <option key={prog.id} value={prog.id}>
                        {prog.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Activity Type
                  </label>
                  <select
                    value={filters.activityType}
                    onChange={(e) => setFilters({ ...filters, activityType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                  >
                    <option value="all">All Types</option>
                    <option value="survey">Survey</option>
                    <option value="assessment">Assessment</option>
                    <option value="poll">Poll</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="expired">Expired</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                  >
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="90days">Last 90 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {filters.dateRange === "custom" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setFilters({ ...filters })}
                  className="px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90"
                >
                  Apply Filters
                </button>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Reset All
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs - Modern Dashboard Style */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="inline-flex h-auto items-center justify-start rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 p-1.5 text-gray-600 shadow-inner border border-gray-200 flex-wrap gap-1 mb-6">
            <TabsTrigger 
              value="overview" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100 hover:text-gray-900"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="activities" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-100 hover:text-gray-900"
            >
              <Activity className="w-4 h-4 mr-2" />
              Event-wise
            </TabsTrigger>
            <TabsTrigger 
              value="participants" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-100 hover:text-gray-900"
            >
              <Users className="w-4 h-4 mr-2" />
              Participant-wise
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-lg data-[state=active]:shadow-amber-100 hover:text-gray-900"
            >
              <Mail className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <GradientStatCard
                  title="Total Events"
                  value={stats.totalActivities}
                  icon={Activity}
                  variant="blue"
                />

                <GradientStatCard
                  title="Live Events"
                  value={stats.liveActivities}
                  icon={TrendingUp}
                  variant="green"
                />

                <GradientStatCard
                  title="Total Participants"
                  value={stats.totalParticipants}
                  subtitle={`(${stats.activeParticipants} / ${stats.anonymousParticipants})`}
                  icon={Users}
                  variant="purple"
                />

                <GradientStatCard
                  title="Active Participants"
                  value={stats.activeParticipants}
                  icon={Users}
                  variant="indigo"
                />

                <GradientStatCard
                  title="Total Responses"
                  value={stats.totalResponses}
                  icon={FileText}
                  variant="orange"
                />

                <GradientStatCard
                  title="Avg Completion"
                  value={`${stats.averageCompletion}%`}
                  icon={TrendingUp}
                  variant="pink"
                />
              </div>

              {/* Activity Summary Table */}
              <Card>
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-qsights-blue" />
                    Event Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Event
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Program
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Participants
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Responded
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Responses
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Completion
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center">
                              <div className="flex items-center justify-center gap-2 text-gray-500">
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                Loading data...
                              </div>
                            </td>
                          </tr>
                        ) : filteredActivities.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                              No activities found matching your filters
                            </td>
                          </tr>
                        ) : (
                          filteredActivities.map((activity) => {
                            const registeredParticipants = activity.active_participants_count || 0;
                            const anonymousParticipants = activity.anonymous_participants_count || 0;
                            const totalParticipants = registeredParticipants + anonymousParticipants;
                            const responded = activity.participants_responded_count || 0;
                            const responses = activity.responses_count || 0;
                            // Cap completion at 100% to prevent display issues
                            const completion = totalParticipants > 0 ? Math.min(100, Math.round((responded / totalParticipants) * 100)) : 0;

                            return (
                              <tr key={activity.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                  <p className="text-sm font-semibold text-gray-900">{activity.name}</p>
                                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                                    {String(activity.id).padStart(8, '0')}
                                  </p>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    activity.type === 'survey' ? 'bg-blue-100 text-blue-700' :
                                    activity.type === 'poll' ? 'bg-green-100 text-green-700' :
                                    activity.type === 'assessment' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {activity.type}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm text-gray-900">
                                    {activity.program_id ? String(activity.program_id).padStart(8, '0') : 'N/A'}
                                  </p>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm text-gray-600">
                                    ({registeredParticipants} / {anonymousParticipants})
                                  </p>
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
                                      <div className="text-xs font-medium text-gray-900 mb-1">
                                        {completion}%
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div
                                          className={`h-1.5 rounded-full ${
                                            completion >= 80 ? 'bg-green-500' :
                                            completion >= 50 ? 'bg-yellow-500' :
                                            'bg-red-500'
                                          }`}
                                          style={{ width: `${completion}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    activity.status === 'live' ? 'bg-green-100 text-green-700' :
                                    activity.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                                    activity.status === 'expired' ? 'bg-gray-100 text-gray-700' :
                                    activity.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {activity.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity-wise Tab */}
          <TabsContent value="activities">
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-qsights-blue" />
                  Event-wise Detailed Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {filteredActivities.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No activities found</p>
                    </div>
                  ) : (
                    filteredActivities.map((activity) => {
                      const registeredParticipants = activity.active_participants_count || 0;
                      const anonymousParticipants = activity.anonymous_participants_count || 0;
                      const totalParticipants = registeredParticipants + anonymousParticipants;
                      const responded = activity.participants_responded_count || 0;
                      // Cap completion at 100% to prevent display issues
                      const completion = totalParticipants > 0 ? Math.min(100, Math.round((responded / totalParticipants) * 100)) : 0;

                      return (
                        <Card key={activity.id} className="border-l-4 border-qsights-blue">
                          <CardHeader className="bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-base font-bold">{activity.name}</CardTitle>
                                <p className="text-xs text-gray-500 font-mono mt-1">
                                  {String(activity.id).padStart(8, '0')}
                                </p>
                              </div>
                              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                activity.status === 'live' ? 'bg-green-100 text-green-700' :
                                activity.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {activity.status}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Participants</p>
                                <p className="text-lg font-bold text-green-600">{registeredParticipants}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Anonymous Participants</p>
                                <p className="text-lg font-bold text-purple-600">{anonymousParticipants}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Total Responses</p>
                                <p className="text-lg font-bold text-blue-600">{activity.responses_count || 0}</p>
                              </div>
                            </div>
                            
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Completion Rate</span>
                                <span className="text-sm font-bold text-gray-900">{completion}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                  className={`h-3 rounded-full transition-all ${
                                    completion >= 80 ? 'bg-green-500' :
                                    completion >= 50 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${completion}%` }}
                                ></div>
                              </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Type:</span> <span className="capitalize">{activity.type}</span>
                              </div>
                              <a
                                href={`/activities/${activity.id}/results`}
                                className="text-sm text-qsights-blue hover:underline font-medium"
                              >
                                View Full Results →
                              </a>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Participant-wise Tab */}
          <TabsContent value="participants">
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-qsights-blue" />
                  Participant-wise Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Participant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Program
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Activities Assigned
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredParticipants.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                            No participants found
                          </td>
                        </tr>
                      ) : (
                        filteredParticipants.map((participant) => (
                          <tr key={participant.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <p className="text-sm font-semibold text-gray-900">{participant.name || 'N/A'}</p>
                              <p className="text-xs text-gray-500 font-mono mt-0.5">
                                {String(participant.id || '').substring(0, 8).toUpperCase() || 'N/A'}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-900">{participant.email || 'N/A'}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-900">
                                {participant.programs && participant.programs.length > 0
                                  ? participant.programs[0].name
                                  : 'N/A'}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                participant.status === 'active' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {participant.status || 'active'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                participant.additional_data?.participant_type === 'anonymous' 
                                  ? 'bg-purple-100 text-purple-700' 
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {participant.additional_data?.participant_type === 'anonymous' ? 'Anonymous' : 'Participant'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-gray-900">
                                {participant.programs && participant.programs.length > 0
                                  ? filteredActivities.filter(a => 
                                      participant.programs.some((p: any) => p.id === a.program_id)
                                    ).length
                                  : 0}
                              </p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="space-y-6">
              {/* Notification Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <GradientStatCard
                  title="Sent"
                  value={notificationStats.sent}
                  icon={Send}
                  variant="blue"
                />

                <GradientStatCard
                  title="Delivered"
                  value={notificationStats.delivered}
                  subtitle={`${notificationStats.deliveryRate}% delivery rate`}
                  icon={CheckCircle}
                  variant="green"
                />

                <GradientStatCard
                  title="Opened"
                  value={notificationStats.opened}
                  subtitle={`${notificationStats.openRate}% open rate`}
                  icon={Eye}
                  variant="purple"
                />

                <GradientStatCard
                  title="Read"
                  value={notificationStats.read}
                  icon={MousePointer}
                  variant="orange"
                />
              </div>

              {/* Notification Details Table */}
              <Card>
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Mail className="w-5 h-5 text-qsights-blue" />
                    Email Notification Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Participant
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Activity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sent At
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Delivered At
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Opened At
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Clicks
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredNotifications.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                              No notification data available
                            </td>
                          </tr>
                        ) : (
                          filteredNotifications.slice(0, 50).map((notification) => (
                            <tr key={notification.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <p className="text-sm font-semibold text-gray-900">{notification.participant_name}</p>
                                <p className="text-xs text-gray-500">{notification.participant_email}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-gray-900">{notification.activity_name}</p>
                                <p className="text-xs text-gray-500 font-mono">
                                  {String(notification.activity_id || '').substring(0, 8).toUpperCase() || 'N/A'}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  notification.status === 'read' ? 'bg-green-100 text-green-700' :
                                  notification.status === 'opened' ? 'bg-blue-100 text-blue-700' :
                                  notification.status === 'delivered' ? 'bg-purple-100 text-purple-700' :
                                  notification.status === 'sent' ? 'bg-gray-100 text-gray-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {notification.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-xs text-gray-900">
                                  {new Date(notification.sent_at).toLocaleString()}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-xs text-gray-900">
                                  {notification.delivered_at ? new Date(notification.delivered_at).toLocaleString() : '-'}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-xs text-gray-900">
                                  {notification.opened_at ? new Date(notification.opened_at).toLocaleString() : '-'}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-medium text-gray-900">{notification.click_count}</p>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RoleBasedLayout>
  );
}
