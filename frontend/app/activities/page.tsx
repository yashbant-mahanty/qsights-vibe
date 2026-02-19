"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Download,
  BarChart3,
  Users,
  Calendar,
  TrendingUp,
  Mail,
  Palette,
  Link2,
  UserPlus,
  ExternalLink,
  Bell,
  BellRing,
  X,
  QrCode,
  Zap,
} from "lucide-react";
import { activitiesApi, activityApprovalsApi, type Activity, fetchWithAuth } from "@/lib/api";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import DuplicateConfirmationModal from "@/components/duplicate-confirmation-modal";
import ResendApprovalModal from "@/components/resend-approval-modal";
import QuestionActivationPanel from "@/components/question-activation-panel";
import { toast } from "@/components/ui/toast";
import { QRCodeModal } from "@/components/ui/qr-code-modal";

export default function ActivitiesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [rejectedApprovals, setRejectedApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ role?: string; programId?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; activityId: string | null; activityName: string | null }>({ isOpen: false, activityId: null, activityName: null });
  const [duplicateModal, setDuplicateModal] = useState<{ isOpen: boolean; activityId: string | null; activityName: string | null }>({ isOpen: false, activityId: null, activityName: null });
  const [resendModal, setResendModal] = useState<{ isOpen: boolean; approvalId: string | null; activityName: string | null; hasManagerReview: boolean }>({ isOpen: false, approvalId: null, activityName: null, hasManagerReview: false });
  const [linksDropdown, setLinksDropdown] = useState<{ activityId: string | null; links: any | null; loading: boolean }>({ activityId: null, links: null, loading: false });
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; url: string; title: string; subtitle: string; color: string }>({ isOpen: false, url: '', title: '', subtitle: '', color: 'blue' });
  const [questionActivationPanel, setQuestionActivationPanel] = useState<{ isOpen: boolean; activityId: string; activityName: string }>({ isOpen: false, activityId: '', activityName: '' });

  useEffect(() => {
    loadActivities();

    // Listen for global search events
    const handleGlobalSearch = (e: CustomEvent) => {
      if (e.detail.pathname === '/activities') {
        setSearchQuery(e.detail.query);
        setCurrentPage(1);
      }
    };

    const handleGlobalSearchClear = () => {
      setSearchQuery("");
      setCurrentPage(1);
    };

    // Close links dropdown when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.links-dropdown-container')) {
        setLinksDropdown({ activityId: null, links: null, loading: false });
      }
    };

    window.addEventListener('global-search' as any, handleGlobalSearch);
    window.addEventListener('global-search-clear' as any, handleGlobalSearchClear);
    document.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('global-search' as any, handleGlobalSearch);
      window.removeEventListener('global-search-clear' as any, handleGlobalSearchClear);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  async function loadCurrentUser() {
    try {
      const userData = await fetchWithAuth('/auth/me');
      if (userData?.user) {
        setCurrentUser(userData.user);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  }

  async function loadActivities() {
    try {
      setError(null);
      
      // Get current user to filter by program_id for program roles
      let programId = null;
      let isProgramRole = false;
      let isSuperAdminOrAdmin = false;
      try {
        const userData = await fetchWithAuth('/auth/me');
        isProgramRole = userData?.user?.role && ['program-admin', 'program-manager', 'program-moderator'].includes(userData.user.role);
        isSuperAdminOrAdmin = userData?.user?.role && ['super-admin', 'admin'].includes(userData.user.role);
        if (isProgramRole) {
          programId = userData.user.programId;
        }
        // Set current user to avoid duplicate API call
        if (userData?.user) {
          setCurrentUser(userData.user);
        }
      } catch (error) {
        console.error('Failed to fetch user for filtering:', error);
      }
      
      // Load activities
      const data = await activitiesApi.getAll(programId ? { program_id: programId } : {});
      
      // Load pending approval requests for program roles OR super-admin/admin
      if (isProgramRole || isSuperAdminOrAdmin) {
        try {
          const approvalsResponse = await activityApprovalsApi.getAll({ status: 'pending' });
          const approvals = approvalsResponse?.data || approvalsResponse || [];
          setPendingApprovals(Array.isArray(approvals) ? approvals : []);
        } catch (err) {
          console.error('Failed to load pending approvals:', err);
          setPendingApprovals([]);
        }
      }
      
      // Load rejected approvals for program roles to allow resubmission
      if (isProgramRole) {
        try {
          const rejectedResponse = await fetchWithAuth('/activity-approvals/my-requests?status=rejected');
          const rejected = rejectedResponse?.data || rejectedResponse || [];
          setRejectedApprovals(Array.isArray(rejected) ? rejected : []);
        } catch (err) {
          console.error('Failed to load rejected approvals:', err);
          setRejectedApprovals([]);
        }
      }
      
      // Sort by updated_at or created_at descending (newest first)
      const sortedData = [...data].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });
      setActivities(sortedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities');
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleViewResults = (activityId: string) => {
    router.push(`/activities/${activityId}/results`);
  };

  const handlePreview = (activityId: string) => {
    router.push(`/activities/${activityId}/preview`);
  };

  const handleEdit = (activityId: string) => {
    router.push(`/activities/${activityId}/edit`);
  };

  const handleDuplicate = (activityId: string, activityName: string) => {
    setDuplicateModal({ isOpen: true, activityId, activityName });
  };

  const confirmDuplicate = async () => {
    if (!duplicateModal.activityId) return;
    
    try {
      const activity = activities.find(a => a.id === duplicateModal.activityId);
      if (!activity) return;
      
      const duplicatePayload = {
        name: `${activity.name} (Copy)`,
        description: activity.description,
        type: activity.type,
        status: 'draft' as const,
        program_id: activity.program_id,
        organization_id: activity.organization_id,
        questionnaire_id: activity.questionnaire_id,
        start_date: activity.start_date,
        end_date: activity.end_date,
      };
      
      await activitiesApi.create(duplicatePayload);
      await loadActivities();
      setDuplicateModal({ isOpen: false, activityId: null, activityName: null });
      toast({ title: "Success!", description: "Event duplicated successfully!", variant: "success" });
    } catch (err) {
      console.error('Failed to duplicate activity:', err);
      toast({ title: "Error", description: 'Failed to duplicate event: ' + (err instanceof Error ? err.message : 'Unknown error'), variant: "error" });
    }
  };

  const handleSendNotification = (activityId: string) => {
    router.push(`/activities/${activityId}/notifications`);
  };

  const handleLandingConfig = (activityId: string) => {
    router.push(`/activities/${activityId}/landing-config`);
  };

  const handleDelete = (activityId: string, activityName: string) => {
    setDeleteModal({ isOpen: true, activityId, activityName });
  };

  const confirmDelete = async () => {
    if (!deleteModal.activityId) return;
    
    try {
      await activitiesApi.delete(deleteModal.activityId);
      await loadActivities();
      toast({ title: "Success!", description: "Activity deleted successfully!", variant: "success" });
    } catch (err) {
      console.error('Failed to delete activity:', err);
      toast({ title: "Error", description: "Failed to delete activity", variant: "error" });
    }
  };

  const handleResendApproval = async (approvalId: string, activityName: string, hasManagerReview: boolean = false) => {
    setResendModal({ isOpen: true, approvalId, activityName, hasManagerReview });
  };

  const confirmResendApproval = async () => {
    if (!resendModal.approvalId) return;

    try {
      setLoading(true);
      const response = await fetchWithAuth(`/activity-approvals/${resendModal.approvalId}/resend`, {
        method: 'POST',
      });

      if (response) {
        toast({ 
          title: "Success!", 
          description: "Approval request resubmitted successfully!", 
          variant: "success" 
        });
        await loadActivities();
      }
    } catch (err: any) {
      console.error('Failed to resend approval:', err);
      toast({ 
        title: "Error", 
        description: err?.message || "Failed to resend approval request", 
        variant: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShowLinks = async (activityId: string) => {
    if (linksDropdown.activityId === activityId) {
      setLinksDropdown({ activityId: null, links: null, loading: false });
      return;
    }
    
    setLinksDropdown({ activityId, links: null, loading: true });
    try {
      const data = await activitiesApi.getActivityLinks(activityId);
      setLinksDropdown({ activityId, links: data.links, loading: false });
    } catch (err) {
      console.error('Failed to fetch links:', err);
      toast({ title: "Error", description: "Failed to fetch activity links", variant: "error" });
      setLinksDropdown({ activityId: null, links: null, loading: false });
    }
  };

  const copyToClipboard = async (url: string, linkType: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(linkType);
      toast({ title: "Copied!", description: `${linkType} copied to clipboard`, variant: "success" });
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({ title: "Error", description: "Failed to copy link", variant: "error" });
    }
  };

  const handleExport = () => {
    const csvContent = [
      'ACTIVITIES REPORT',
      `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`,
      'SUMMARY STATISTICS',
      `Total Activities,${totalActivities}`,
      `Active,${activeActivities}`,
      `Scheduled,${scheduledActivities}`,
      `Completed,${completedActivities}`,
      `Surveys,${activities.filter(a => a.type === 'survey').length}`,
      `Polls,${activities.filter(a => a.type === 'poll').length}`,
      `Assessments,${activities.filter(a => a.type === 'assessment').length}\n`,
      'ACTIVITY DETAILS',
      'Title,Code,Type,Program,Participants,Responses,Progress,Status,Languages,Start Date,End Date',
      ...displayActivities.map(a => 
        `"${a.title}",${a.code},${a.type},${a.program},${a.participants},${a.responses},${a.progress}%,${a.status},"${a.languages.join('; ')}",${a.startDate},${a.endDate}`
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activities-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleToggleStatus = async (activityId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'live' ? 'closed' : 'live';
    const action = newStatus === 'live' ? 'activate' : 'close';
    
    if (!confirm(`Are you sure you want to ${action} this activity?`)) {
      return;
    }
    
    try {
      await activitiesApi.updateStatus(activityId, newStatus);
      await loadActivities();
      toast({ title: "Success!", description: `Activity ${action}d successfully!`, variant: "success" });
    } catch (err) {
      console.error(`Failed to ${action} activity:`, err);
      toast({ title: "Error", description: `Failed to ${action} activity`, variant: "error" });
    }
  };

  const toggleParticipantReminders = async (activityId: string, currentValue: boolean) => {
    try {
      // Optimistically update the local state immediately
      setActivities(prevActivities => {
        return prevActivities.map(activity => {
          if (activity.id.toString() === activityId) {
            return { ...activity, allow_participant_reminders: !currentValue };
          }
          return activity;
        });
      });

      // Update on server
      await fetchWithAuth(`/activities/${activityId}/toggle-reminders`, {
        method: 'PATCH',
        body: JSON.stringify({ allow_participant_reminders: !currentValue })
      });

      toast({ 
        title: "Success!", 
        description: `Participant reminders ${!currentValue ? 'enabled' : 'disabled'}`, 
        variant: "success" 
      });
    } catch (err) {
      console.error('Failed to toggle reminders:', err);
      // Revert the optimistic update on error
      setActivities(prevActivities => 
        prevActivities.map(activity => 
          activity.id.toString() === activityId 
            ? { ...activity, allow_participant_reminders: currentValue }
            : activity
        )
      );
      toast({ title: "Error", description: "Failed to toggle reminders", variant: "error" });
    }
  };

  const activities_display = useMemo(() => activities.map(a => {
    const participants = a.participants_count || 0;
    const authenticatedParticipants = a.authenticated_participants_count || 0;
    const guestParticipants = a.guest_participants_count || 0;
    const responses = a.responses_count || 0;
    const authenticatedResponses = a.authenticated_responses_count || 0;
    const guestResponses = a.guest_responses_count || 0;
    const participantsResponded = a.participants_responded_count || 0;
    // Progress = (participants who responded / total participants) * 100, capped at 100%
    const rawProgress = participants > 0 ? Math.round((participantsResponded / participants) * 100) : 0;
    const progress = Math.min(rawProgress, 100);
    
    return {
      id: a.id,
      title: a.name || "",
      code: a.id ? String(a.id).substring(0, 8) : "",
      type: a.type || "",
      program: a.program?.name || "N/A",
      programId: a.program_id || null,
      questionnaires: a.questionnaire_id ? 1 : 0,
      participants,
      authenticatedParticipants,
      guestParticipants,
      responses,
      authenticatedResponses,
      guestResponses,
      status: a.status || "",
      startDate: a.start_date ? new Date(a.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A",
      endDate: a.end_date ? new Date(a.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A",
      progress,
      languages: a.languages && a.languages.length > 0 ? a.languages : ["EN"],
      allowGuests: a.allow_guests || false,
      allow_participant_reminders: a.allow_participant_reminders || false,
      enable_generated_links: a.enable_generated_links || false,
      isApprovalRequest: false,
      approvalId: null as string | null,
    };
  }), [activities]);

  // Add pending approval requests as virtual "activities" with status "pending-approval"
  const pendingApprovalDisplay = useMemo(() => pendingApprovals.map(pa => ({
    id: pa.id,
    title: pa.name || "",
    code: pa.id ? String(pa.id).substring(0, 8) : "",
    type: pa.type || "",
    program: pa.program?.name || "N/A",
    programId: pa.program_id || null,
    questionnaires: pa.questionnaire_id ? 1 : 0,
    participants: 0,
    authenticatedParticipants: 0,
    guestParticipants: 0,
    responses: 0,
    authenticatedResponses: 0,
    guestResponses: 0,
    status: "pending-approval",
    startDate: pa.start_date ? new Date(pa.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A",
    endDate: pa.end_date ? new Date(pa.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A",
    progress: 0,
    languages: pa.languages && pa.languages.length > 0 ? pa.languages : ["EN"],
    allowGuests: pa.allow_guests || false,
    allow_participant_reminders: false,
    enable_generated_links: false,
    isApprovalRequest: true,
    approvalId: pa.id,
  })), [pendingApprovals]);

  // Add rejected approval requests as virtual "activities" with status "rejected"
  const rejectedApprovalDisplay = useMemo(() => rejectedApprovals.map(ra => ({
    id: ra.id,
    title: ra.name || "",
    code: ra.id ? String(ra.id).substring(0, 8) : "",
    type: ra.type || "",
    program: ra.program?.name || "N/A",
    programId: ra.program_id || null,
    questionnaires: ra.questionnaire_id ? 1 : 0,
    participants: 0,
    authenticatedParticipants: 0,
    guestParticipants: 0,
    responses: 0,
    authenticatedResponses: 0,
    guestResponses: 0,
    status: "rejected",
    startDate: ra.start_date ? new Date(ra.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A",
    endDate: ra.end_date ? new Date(ra.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A",
    progress: 0,
    languages: ra.languages && ra.languages.length > 0 ? ra.languages : ["EN"],
    allowGuests: ra.allow_guests || false,
    allow_participant_reminders: false,
    enable_generated_links: false,
    isApprovalRequest: true,
    approvalId: ra.id,
    remarks: ra.remarks || ra.review_message || "No remarks provided",
    reviewedBy: ra.reviewed_by_user?.name || ra.reviewed_by?.name || "N/A",
    reviewedAt: ra.reviewed_at ? new Date(ra.reviewed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A",
    hasManagerReview: !!ra.manager_review_status,
  })), [rejectedApprovals]);

  // Combine activities with pending and rejected approvals (pending first, then rejected, then activities)
  const allActivitiesDisplay = useMemo(() => 
    [...pendingApprovalDisplay, ...rejectedApprovalDisplay, ...activities_display],
    [pendingApprovalDisplay, rejectedApprovalDisplay, activities_display]
  );

  const totalActivities = activities.length + pendingApprovals.length;
  const activeActivities = activities.filter(a => a.status === 'live').length;
  const scheduledActivities = activities.filter(a => a.status === 'upcoming').length;
  const completedActivities = activities.filter(a => a.status === 'closed' || a.status === 'archived').length;
  const pendingApprovalCount = pendingApprovals.length;
  const rejectedApprovalCount = rejectedApprovals.length;

  // Calculate participant counts across all activities
  const totalEventParticipants = activities.reduce((sum, a) => sum + (a.responses_count || 0), 0);
  const authenticatedEventParticipants = activities.reduce((sum, a) => sum + (a.authenticated_responses_count || 0), 0);
  const anonymousEventParticipants = activities.reduce((sum, a) => sum + (a.guest_responses_count || 0), 0);

  // Memoize stats to prevent recalculation on every render
  const stats = useMemo(() => [
    {
      title: "Total Events",
      value: totalActivities.toString(),
      subtitle: `${activeActivities} active`,
      icon: FileText,
      variant: 'blue' as const,
    },
    {
      title: "Active",
      value: activeActivities.toString(),
      subtitle: totalActivities > 0 ? `${Math.round((activeActivities/totalActivities)*100)}% of total` : "0% of total",
      icon: CheckCircle,
      variant: 'green' as const,
    },
    {
      title: "Total Responses",
      value: `${totalEventParticipants} (${authenticatedEventParticipants}/${anonymousEventParticipants})`,
      subtitle: "(Participant/Anonymous)",
      icon: Users,
      variant: 'yellow' as const,
    },
    {
      title: "Completed",
      value: completedActivities.toString(),
      subtitle: totalActivities > 0 ? `${Math.round((completedActivities/totalActivities)*100)}% completion` : "0% completion",
      icon: TrendingUp,
      variant: 'purple' as const,
    },
  ], [totalActivities, activeActivities, completedActivities, totalEventParticipants, authenticatedEventParticipants, anonymousEventParticipants]);

  // Mock data removed - using only real API data

  const filteredActivities = useMemo(() => {
    return allActivitiesDisplay.filter((activity) => {
      const matchesTab =
        selectedTab === "all" ||
        activity.type.toLowerCase() === selectedTab;
      // Fix: Map "active" filter to "live" status
      const statusToMatch = selectedStatus === "active" ? "live" : selectedStatus;
      const matchesStatus =
        selectedStatus === "all" || activity.status === statusToMatch;
      const matchesSearch =
        searchQuery === "" ||
        activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.program.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesStatus && matchesSearch;
    });
  }, [allActivitiesDisplay, selectedTab, selectedStatus, searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTab, selectedStatus, searchQuery]);

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  
  const currentActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredActivities.slice(startIndex, endIndex);
  }, [filteredActivities, currentPage, itemsPerPage]);

  // Memoize tabs to prevent recalculation
  const tabs = useMemo(() => [
    { id: "all", label: "All Events", count: allActivitiesDisplay.length },
    { id: "survey", label: "Surveys", count: allActivitiesDisplay.filter(a => a.type === 'survey').length },
    { id: "poll", label: "Polls", count: allActivitiesDisplay.filter(a => a.type === 'poll').length },
    { id: "assessment", label: "Assessments", count: allActivitiesDisplay.filter(a => a.type === 'assessment').length },
  ], [allActivitiesDisplay]);

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-semibold">{error}</p>
            <button 
              onClick={loadActivities}
              className="mt-4 px-4 py-2 bg-qsights-cyan text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const getStatusChip = (status: string) => {
    switch (status) {
      case "live":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
            <CheckCircle className="w-3 h-3" />
            Live
          </span>
        );
      case "pending-approval":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            Pending Approval
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-full">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case "upcoming":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-50 text-yellow-700 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            Upcoming
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full">
            <XCircle className="w-3 h-3" />
            Expired
          </span>
        );
      case "closed":
      case "archived":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-qsights-light text-purple-700 text-xs font-medium rounded-full">
            <CheckCircle className="w-3 h-3" />
            Closed
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-700 text-xs font-medium rounded-full">
            <FileText className="w-3 h-3" />
            Draft
          </span>
        );
      case "paused":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full">
            <XCircle className="w-3 h-3" />
            Paused
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: { [key: string]: string } = {
      Survey: "bg-blue-100 text-blue-700",
      Poll: "bg-green-100 text-green-700",
      Assessment: "bg-cyan-50 text-purple-700",
    };

    return (
      <span
        className={`px-2.5 py-1 ${
          colors[type] || "bg-gray-100 text-gray-700"
        } text-xs font-medium rounded-full`}
      >
        {type}
      </span>
    );
  };

  const getLanguageBadge = (lang: string) => {
    const colors: { [key: string]: string } = {
      EN: "bg-blue-100 text-blue-700",
      ES: "bg-red-100 text-red-700",
      FR: "bg-cyan-50 text-purple-700",
      DE: "bg-yellow-100 text-yellow-700",
      IT: "bg-green-100 text-green-700",
      PT: "bg-orange-100 text-orange-700",
      ZH: "bg-pink-100 text-pink-700",
      JA: "bg-cyan-50 text-indigo-700",
    };

    return (
      <span
        key={lang}
        className={`px-2 py-0.5 ${
          colors[lang] || "bg-gray-100 text-gray-700"
        } text-xs font-medium rounded`}
      >
        {lang}
      </span>
    );
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 25) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Events</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage surveys, polls, and assessments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {currentUser?.role !== 'program-moderator' && (
              <a
                href="/activities/create"
                className="flex items-center gap-2 px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Event
              </a>
            )}
          </div>
        </div>

        {/* Stats Grid - Always render to prevent layout shift */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Tabs */}
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-gray-200">
              <div className="flex items-center overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={`px-6 py-4 font-medium text-sm border-b-2 whitespace-nowrap ${
                      selectedTab === tab.id
                        ? "border-qsights-blue text-qsights-blue"
                        : "border-transparent text-gray-600"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                        selectedTab === tab.id
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filters and Search */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Search */}
                <div className="relative flex-1 w-full sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="draft">Draft</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activities Table */}
        <Card>
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
                      Responses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timeline
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentActivities.length === 0 && loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-qsights-blue mx-auto mb-2"></div>
                        Loading...
                      </td>
                    </tr>
                  ) : currentActivities.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        No events found
                      </td>
                    </tr>
                  ) : currentActivities.map((activity) => (
                    <tr
                      key={activity.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Activity */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            {activity.code}
                          </p>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {activity.languages.map((lang) =>
                              getLanguageBadge(lang)
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4">
                        {getTypeBadge(activity.type)}
                      </td>

                      {/* Program */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900 max-w-xs truncate">
                          {activity.program}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {activity.questionnaires}{" "}
                          {activity.questionnaires === 1
                            ? "questionnaire"
                            : "questionnaires"}
                        </p>
                      </td>

                      {/* Participants */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <Tooltip
                            content={
                              <div className="text-xs">
                                <div>Authenticated: {activity.authenticatedParticipants.toLocaleString()}</div>
                                <div>Anonymous: {activity.guestParticipants.toLocaleString()}</div>
                              </div>
                            }
                          >
                            <span className="text-sm font-medium text-gray-900 cursor-help">
                              {activity.participants.toLocaleString()}
                            </span>
                          </Tooltip>
                        </div>
                      </td>

                      {/* Responses */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-gray-400" />
                          <Tooltip
                            content={
                              <div className="text-xs">
                                <div>Authenticated: {activity.authenticatedResponses.toLocaleString()}</div>
                                <div>Anonymous: {activity.guestResponses.toLocaleString()}</div>
                              </div>
                            }
                          >
                            <span className="text-sm font-medium text-gray-900 cursor-help">
                              {activity.responses.toLocaleString()}
                            </span>
                          </Tooltip>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {getStatusChip(activity.status)}
                      </td>

                      {/* Timeline */}
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-1 text-xs text-gray-600">
                          <Calendar className="w-3 h-3 text-gray-400 mt-0.5" />
                          <div>
                            <p>{activity.startDate}</p>
                            <p className="text-gray-400">to</p>
                            <p>{activity.endDate}</p>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {/* Special handling for pending approval requests */}
                          {(activity as any).isApprovalRequest ? (
                            <>
                              {activity.status === 'rejected' && (currentUser?.role === 'program-admin' || currentUser?.role === 'program-manager') ? (
                                <>
                                  {/* Resend for Approval Button */}
                                  <button
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      handleResendApproval(activity.id, activity.title, (activity as any).hasManagerReview || false);
                                    }}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium flex items-center gap-1"
                                    title="Resend for Approval"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Resend for Approval
                                  </button>
                                  {/* View Details Button */}
                                  <button
                                    onClick={() => router.push(`/activities/approvals/${activity.id}`)}
                                    className="p-1.5 rounded transition-colors text-red-600 hover:bg-red-50"
                                    title="View Rejection Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => router.push(`/activities/approvals/${activity.id}`)}
                                    className={`p-1.5 rounded transition-colors ${
                                      activity.status === 'rejected'
                                        ? 'text-red-600 hover:bg-red-50'
                                        : currentUser?.role === 'super-admin' || currentUser?.role === 'admin'
                                        ? 'text-green-600 hover:bg-green-50'
                                        : 'text-amber-600 hover:bg-amber-50'
                                    }`}
                                    title={
                                      activity.status === 'rejected'
                                        ? 'View Rejection Details'
                                        : currentUser?.role === 'super-admin' || currentUser?.role === 'admin' 
                                        ? 'Review Approval Request' 
                                        : 'View Approval Request'
                                    }
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <span className={`text-xs px-2 ${
                                    activity.status === 'rejected'
                                      ? 'text-red-600 font-medium'
                                      : currentUser?.role === 'super-admin' || currentUser?.role === 'admin'
                                      ? 'text-green-600 font-medium'
                                      : 'text-gray-400'
                                  }`}>
                                    {activity.status === 'rejected'
                                      ? 'View Rejection Details'
                                      : currentUser?.role === 'super-admin' || currentUser?.role === 'admin'
                                      ? 'Click to Review'
                                      : 'Awaiting Super Admin Approval'}
                                  </span>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                          {/* Links Dropdown */}
                          <div className="relative links-dropdown-container">
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (activity.status !== 'draft' && activity.status !== 'pending-approval') {
                                  handleShowLinks(activity.id.toString()); 
                                }
                              }}
                              className={`p-1.5 rounded transition-colors ${
                                activity.status === 'draft' || activity.status === 'pending-approval'
                                  ? 'text-gray-300 cursor-not-allowed' 
                                  : linksDropdown.activityId === activity.id.toString() 
                                    ? 'bg-green-100 text-green-600' 
                                    : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={activity.status === 'draft' ? 'Get Links (Not available for draft events)' : 'Get Links'}
                              disabled={activity.status === 'draft' || activity.status === 'pending-approval'}
                            >
                              <Link2 className="w-4 h-4" />
                            </button>
                            {linksDropdown.activityId === activity.id.toString() && (
                              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]" onClick={(e) => { e.stopPropagation(); setLinksDropdown({ activityId: null, links: null, loading: false }); }}>
                                <div className="bg-white rounded-xl shadow-2xl w-[420px] max-w-[90vw] links-dropdown-container" onClick={(e) => e.stopPropagation()}>
                                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Link2 className="w-5 h-5 text-qsights-blue" />
                                      <p className="text-base font-semibold text-gray-900">Copy Event Links</p>
                                    </div>
                                    <button onClick={() => setLinksDropdown({ activityId: null, links: null, loading: false })} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                      <XCircle className="w-5 h-5 text-gray-400" />
                                    </button>
                                  </div>
                                {linksDropdown.loading ? (
                                  <div className="p-8 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-qsights-blue mx-auto"></div>
                                    <p className="mt-2 text-sm text-gray-500">Loading links...</p>
                                  </div>
                                ) : linksDropdown.links ? (
                                  <div className="p-4 space-y-3">
                                    {/* Registration Link */}
                                    <div className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50/50 transition-all">
                                      <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                          <UserPlus className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-gray-900">Registration Link</p>
                                          <p className="text-xs text-gray-500 mt-0.5">Participants must register before taking survey</p>
                                          <div className="mt-2 flex items-center gap-2">
                                            <input 
                                              type="text" 
                                              readOnly 
                                              value={linksDropdown.links.registration.url} 
                                              className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-gray-600 truncate"
                                            />
                                            <button
                                              onClick={() => setQrModal({ isOpen: true, url: linksDropdown.links.registration.url, title: 'Registration QR', subtitle: 'Scan to register & take survey', color: 'blue' })}
                                              className="p-1.5 rounded text-blue-600 hover:bg-blue-100 transition-colors"
                                              title="View QR Code"
                                            >
                                              <QrCode className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => copyToClipboard(linksDropdown.links.registration.url, 'Registration Link')}
                                              className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                                                copiedLink === 'Registration Link' 
                                                  ? 'bg-green-500 text-white' 
                                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                                              }`}
                                            >
                                              {copiedLink === 'Registration Link' ? (
                                                <><CheckCircle className="w-3.5 h-3.5" /> Copied!</>
                                              ) : (
                                                <><Copy className="w-3.5 h-3.5" /> Copy</>
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {/* Preview Link */}
                                    <div className="border border-gray-200 rounded-lg p-3 hover:border-purple-300 hover:bg-qsights-light/50 transition-all">
                                      <div className="flex items-start gap-3">
                                        <div className="p-2 bg-cyan-50 rounded-lg">
                                          <Eye className="w-5 h-5 text-qsights-cyan" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-gray-900">Preview Link</p>
                                          <p className="text-xs text-gray-500 mt-0.5">For testing only - responses not saved</p>
                                          <div className="mt-2 flex items-center gap-2">
                                            <input 
                                              type="text" 
                                              readOnly 
                                              value={linksDropdown.links.preview.url} 
                                              className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-gray-600 truncate"
                                            />
                                            <button
                                              onClick={() => setQrModal({ isOpen: true, url: linksDropdown.links.preview.url, title: 'Preview QR', subtitle: 'For testing only - responses not saved', color: 'purple' })}
                                              className="p-1.5 rounded text-qsights-cyan hover:bg-cyan-50 transition-colors"
                                              title="View QR Code"
                                            >
                                              <QrCode className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => copyToClipboard(linksDropdown.links.preview.url, 'Preview Link')}
                                              className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                                                copiedLink === 'Preview Link' 
                                                  ? 'bg-green-500 text-white' 
                                                  : 'bg-qsights-dark text-white hover:bg-qsights-dark/90'
                                              }`}
                                            >
                                              {copiedLink === 'Preview Link' ? (
                                                <><CheckCircle className="w-3.5 h-3.5" /> Copied!</>
                                              ) : (
                                                <><Copy className="w-3.5 h-3.5" /> Copy</>
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {/* Anonymous Link - Only show if Allow Anonymous Access is enabled */}
                                    {activity.allowGuests && (
                                      <div className="border border-gray-200 rounded-lg p-3 hover:border-orange-300 hover:bg-orange-50/50 transition-all">
                                        <div className="flex items-start gap-3">
                                          <div className="p-2 bg-orange-100 rounded-lg">
                                            <Users className="w-5 h-5 text-orange-600" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900">Anonymous Link</p>
                                            <p className="text-xs text-gray-500 mt-0.5">No registration required - anonymous responses</p>
                                            <div className="mt-2 flex items-center gap-2">
                                              <input 
                                                type="text" 
                                                readOnly 
                                                value={linksDropdown.links.anonymous.url} 
                                                className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-gray-600 truncate"
                                              />
                                              <button
                                                onClick={() => setQrModal({ isOpen: true, url: linksDropdown.links.anonymous.url, title: 'Anonymous QR', subtitle: 'No registration required', color: 'orange' })}
                                                className="p-1.5 rounded text-orange-600 hover:bg-orange-100 transition-colors"
                                                title="View QR Code"
                                              >
                                                <QrCode className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={() => copyToClipboard(linksDropdown.links.anonymous.url, 'Anonymous Link')}
                                                className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                                                  copiedLink === 'Anonymous Link' 
                                                    ? 'bg-green-500 text-white' 
                                                    : 'bg-orange-600 text-white hover:bg-orange-700'
                                                }`}
                                              >
                                                {copiedLink === 'Anonymous Link' ? (
                                                  <><CheckCircle className="w-3.5 h-3.5" /> Copied!</>
                                                ) : (
                                                  <><Copy className="w-3.5 h-3.5" /> Copy</>
                                                )}
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {/* Generated Links Section */}
                                    {activity.enable_generated_links === true && (
                                      <div className="border border-purple-200 rounded-lg p-3 hover:border-purple-400 hover:bg-purple-50/50 transition-all">
                                        <div className="flex items-start gap-3">
                                          <div className="p-2 bg-purple-100 rounded-lg">
                                            <ExternalLink className="w-5 h-5 text-purple-600" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900">Generated Links</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Manage unique, trackable links for participants</p>
                                            <div className="mt-2">
                                              <button
                                                onClick={() => {
                                                  setLinksDropdown({ activityId: null, links: null, loading: false });
                                                  router.push(`/activities/${activity.id}/generated-links`);
                                                }}
                                                className="px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1 bg-purple-600 text-white hover:bg-purple-700"
                                              >
                                                <ExternalLink className="w-3.5 h-3.5" /> Manage Generated Links
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-8 text-center">
                                    <XCircle className="w-8 h-8 text-red-400 mx-auto" />
                                    <p className="mt-2 text-sm text-red-500">Failed to load links</p>
                                  </div>
                                )}
                                </div>
                              </div>
                            )}
                          </div>
                          {/* Generated Links Button - Always visible: grey=disabled, purple=enabled */}
                          <button
                            onClick={() => {
                              const isEnabled = activity.enable_generated_links === true || activity.enable_generated_links === 'true' || activity.enable_generated_links === 1;
                              if (isEnabled) {
                                router.push(`/activities/${activity.id}/generated-links`);
                              }
                            }}
                            className={`p-1.5 rounded transition-colors ${
                              (activity.enable_generated_links === true || activity.enable_generated_links === 'true' || activity.enable_generated_links === 1)
                                ? 'text-purple-600 hover:bg-purple-50 cursor-pointer'
                                : 'text-gray-300 cursor-not-allowed'
                            }`}
                            title={(activity.enable_generated_links === true || activity.enable_generated_links === 'true' || activity.enable_generated_links === 1) ? 'Manage Generated Links' : 'Generated Links (Not Enabled)'}
                            data-egl={String(activity.enable_generated_links)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          {currentUser?.role !== 'program-moderator' && (
                            <>
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation();
                                  toggleParticipantReminders(activity.id.toString(), activity.allow_participant_reminders || false); 
                                }}
                                className={`p-1.5 rounded transition-colors ${
                                  activity.allow_participant_reminders
                                    ? 'bg-cyan-50 text-qsights-cyan' 
                                    : 'text-gray-400 hover:bg-gray-100'
                                }`}
                                title={activity.allow_participant_reminders ? 'Participant Reminders Enabled' : 'Participant Reminders Disabled'}
                              >
                                {activity.allow_participant_reminders ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleSendNotification(activity.id.toString())}
                                className="p-1.5 text-qsights-cyan hover:bg-qsights-light rounded transition-colors"
                                title="Send Notification"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleViewResults(activity.id.toString())}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Results"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          {/* Live Poll Questions Control - Only for Poll type events */}
                          {activity.type === 'poll' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuestionActivationPanel({ isOpen: true, activityId: activity.id.toString(), activityName: activity.title });
                              }}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                              title="Live Poll Questions"
                            >
                              <Zap className="w-4 h-4" />
                            </button>
                          )}
                          {currentUser?.role !== 'program-moderator' && (
                            <>
                              <button
                                onClick={() => handleLandingConfig(activity.id.toString())}
                                className="p-1.5 text-pink-600 hover:bg-pink-50 rounded transition-colors"
                                title="Landing Page Configuration"
                              >
                                <Palette className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(activity.id.toString())}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDuplicate(activity.id.toString(), activity.title)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Duplicate"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              {/* Hide delete for program-manager - they cannot delete events */}
                              {currentUser?.role !== 'program-manager' && (
                                <button
                                  onClick={() => handleDelete(activity.id.toString(), activity.title)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Showing {filteredActivities.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
                    {Math.min(currentPage * itemsPerPage, filteredActivities.length)} of{" "}
                    {filteredActivities.length} events
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
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
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    title="First page"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  {(() => {
                    const pages: (number | string)[] = [];
                    const maxVisible = 5;
                    if (totalPages <= maxVisible + 2) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      let start = Math.max(2, currentPage - Math.floor(maxVisible / 2));
                      let end = Math.min(totalPages - 1, start + maxVisible - 1);
                      if (end === totalPages - 1) start = Math.max(2, end - maxVisible + 1);
                      if (start > 2) pages.push('...');
                      for (let i = start; i <= end; i++) pages.push(i);
                      if (end < totalPages - 1) pages.push('...');
                      if (totalPages > 1) pages.push(totalPages);
                    }
                    return pages.map((page, idx) => (
                      page === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 text-sm">...</span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page as number)}
                          className={`min-w-[36px] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
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
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    title="Last page"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, activityId: null, activityName: null })}
        onConfirm={confirmDelete}
        title="Delete Event?"
        itemName={deleteModal.activityName || undefined}
        itemType="event"
      />

      <DuplicateConfirmationModal
        isOpen={duplicateModal.isOpen}
        onClose={() => setDuplicateModal({ isOpen: false, activityId: null, activityName: null })}
        onConfirm={confirmDuplicate}
        itemName={duplicateModal.activityName || undefined}
      />

      <ResendApprovalModal
        isOpen={resendModal.isOpen}
        onClose={() => setResendModal({ isOpen: false, approvalId: null, activityName: null, hasManagerReview: false })}
        onConfirm={confirmResendApproval}
        itemName={resendModal.activityName || undefined}
        hasManagerReview={resendModal.hasManagerReview}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal({ isOpen: false, url: '', title: '', subtitle: '', color: 'blue' })}
        url={qrModal.url}
        title={qrModal.title}
        subtitle={qrModal.subtitle}
        color={qrModal.color}
      />

      {/* Question Activation Panel for Live Polls */}
      <QuestionActivationPanel
        isOpen={questionActivationPanel.isOpen}
        onClose={() => setQuestionActivationPanel({ isOpen: false, activityId: '', activityName: '' })}
        activityId={questionActivationPanel.activityId}
        activityName={questionActivationPanel.activityName}
      />
    </AppLayout>
  );
}
