"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent } from "@/components/ui/card";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Download,
  Filter,
  Users,
  ArrowLeft,
  CheckSquare,
} from "lucide-react";
import { questionnairesApi, type Questionnaire } from "@/lib/api";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { toast } from "@/components/ui/toast";
import { canCreateResource, canEditResource, canDeleteResource, UserRole } from "@/lib/permissions";

function QuestionnairesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectionMode = searchParams.get('mode') === 'select-for-evaluation';
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; questionnaireId: string | null; questionnaireName: string | null }>({ isOpen: false, questionnaireId: null, questionnaireName: null });
  const [currentUser, setCurrentUser] = useState<{ role: UserRole } | null>(null);

  // Handle selecting a questionnaire for evaluation
  const handleSelectForEvaluation = (questionnaireId: string, questionnaireName: string) => {
    router.push(`/evaluation-new?tab=trigger&questionnaire_id=${questionnaireId}&questionnaire_name=${encodeURIComponent(questionnaireName)}`);
  };

  // Handle canceling selection mode
  const handleCancelSelection = () => {
    // Use window.location for full page navigation to ensure tab state is properly set
    window.location.href = '/evaluation-new?tab=trigger';
  };

  useEffect(() => {
    loadQuestionnaires();

    // Listen for global search events
    const handleGlobalSearch = (e: CustomEvent) => {
      if (e.detail.pathname === '/questionnaires') {
        setSearchQuery(e.detail.query);
        setCurrentPage(1);
      }
    };

    const handleGlobalSearchClear = () => {
      setSearchQuery("");
      setCurrentPage(1);
    };

    window.addEventListener('global-search' as any, handleGlobalSearch);
    window.addEventListener('global-search-clear' as any, handleGlobalSearchClear);

    return () => {
      window.removeEventListener('global-search' as any, handleGlobalSearch);
      window.removeEventListener('global-search-clear' as any, handleGlobalSearchClear);
    };
  }, []);

  async function loadQuestionnaires() {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user to check role and programId
      const userResponse = await fetch('/api/auth/me');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        const user = userData.user;
        setCurrentUser(user); // Store user for permission checks
        
        // If user is program-admin, program-manager, or program-moderator, filter by their program
        if (user && user.programId && ['program-admin', 'program-manager', 'program-moderator'].includes(user.role)) {
          const data = await questionnairesApi.getAll({ program_id: user.programId });
          setQuestionnaires(Array.isArray(data) ? data : []);
        } else {
          // Super-admin, admin, or other roles see all questionnaires
          const data = await questionnairesApi.getAll();
          setQuestionnaires(Array.isArray(data) ? data : []);
        }
      } else {
        // Fallback: load all questionnaires
        const data = await questionnairesApi.getAll();
        setQuestionnaires(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questionnaires');
      console.error('Error loading questionnaires:', err);
      setQuestionnaires([]); // Ensure we set to empty array on error
    } finally {
      setLoading(false);
    }
  }

  const handlePreview = (questionnaireId: string) => {
    // Navigate to builder in preview mode
    const returnParam = selectionMode ? '&return=evaluation' : '';
    window.location.href = `/questionnaires/${questionnaireId}?mode=preview${returnParam}`;
  };

  const handleEdit = (questionnaireId: string) => {
    // Navigate to builder in edit mode
    const returnParam = selectionMode ? '&return=evaluation' : '';
    window.location.href = `/questionnaires/${questionnaireId}?mode=edit${returnParam}`;
  };

  const handleDuplicate = async (questionnaireId: string) => {
    if (!confirm('Are you sure you want to duplicate this questionnaire?')) {
      return;
    }
    try {
      await questionnairesApi.duplicate(questionnaireId);
      await loadQuestionnaires();
      toast({ title: "Success!", description: "Questionnaire duplicated successfully!", variant: "success" });
    } catch (err) {
      console.error('Failed to duplicate questionnaire:', err);
      toast({ title: "Error", description: "Failed to duplicate questionnaire", variant: "error" });
    }
  };

  const handleDelete = (questionnaireId: string, questionnaireName: string) => {
    setDeleteModal({ isOpen: true, questionnaireId, questionnaireName });
  };

  const confirmDelete = async () => {
    if (!deleteModal.questionnaireId) return;
    
    try {
      await questionnairesApi.delete(deleteModal.questionnaireId);
      await loadQuestionnaires();
      toast({ title: "Success!", description: "Questionnaire deleted successfully!", variant: "success" });
    } catch (err) {
      console.error('Failed to delete questionnaire:', err);
      toast({ title: "Error", description: "Failed to delete questionnaire", variant: "error" });
    }
  };

  const handleExport = () => {
    const csvContent = [
      'QUESTIONNAIRES REPORT',
      `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`,
      'SUMMARY STATISTICS',
      `Total Questionnaires,${displayQuestionnaires.length}`,
      `Active,${displayQuestionnaires.filter((q) => q.status === "published").length}`,
      `Draft,${displayQuestionnaires.filter((q) => q.status === "draft").length}`,
      `Archived,${displayQuestionnaires.filter((q) => q.status === "archived").length}\n`,
      'QUESTIONNAIRE DETAILS',
      'Title,Code,Type,Questions,Programs,Responses,Status,Languages,Created Date,Last Modified',
      ...displayQuestionnaires.map(q => 
        `"${q.title}",${q.code},${q.type},${q.questions},"${q.programs.join('; ')}",${q.responses},${q.status},"${q.languages.join('; ')}",${q.createdDate},${q.lastModified}`
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questionnaires-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const questionnaires_display = questionnaires.map(q => {
    // Calculate total questions from all sections
    const totalQuestions = q.sections?.reduce((total, section) => {
      return total + (section.questions?.length || 0);
    }, 0) || 0;

    // Capitalize first letter of type
    const displayType = q.type ? q.type.charAt(0).toUpperCase() + q.type.slice(1) : "Survey";

    return {
      id: q.id,
      title: q.title,
      code: String(q.id).padStart(8, '0'),
      type: displayType,
      questions: totalQuestions,
      programs: q.program ? [q.program.name] : [],
      responses: q.responses_count || 0,
      authenticatedResponses: q.authenticated_responses_count || 0,
      guestResponses: q.guest_responses_count || 0,
      status: q.status,
      createdDate: new Date(q.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      lastModified: new Date(q.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      languages: (q as any).languages || ["EN"],
    };
  });

  // Mock data removed - using only real API data

  const displayQuestionnaires = questionnaires_display;
  const publishedCount = displayQuestionnaires.filter((q) => q.status === "published").length;
  const draftCount = displayQuestionnaires.filter((q) => q.status === "draft").length;
  const archivedCount = displayQuestionnaires.filter((q) => q.status === "archived").length;
  
  // Calculate total responses across all questionnaires
  const totalResponses = displayQuestionnaires.reduce((sum, q) => sum + (q.responses || 0), 0);
  const authenticatedResponses = displayQuestionnaires.reduce((sum, q) => sum + (q.authenticatedResponses || 0), 0);
  const guestResponses = displayQuestionnaires.reduce((sum, q) => sum + (q.guestResponses || 0), 0);

  // Role-based stats - evaluation-admin sees Staff Responses, others see Total Responses
  const isEvaluationAdmin = currentUser?.role === 'evaluation-admin';

  const stats = [
    {
      title: "Total Questionnaires",
      value: displayQuestionnaires.length,
      subtitle: `${publishedCount} active`,
      icon: FileText,
      variant: 'blue' as const,
    },
    {
      title: "Active",
      value: publishedCount,
      subtitle: displayQuestionnaires.length > 0 ? `${Math.round((publishedCount/displayQuestionnaires.length)*100)}% of total` : "0% of total",
      icon: CheckCircle,
      variant: 'green' as const,
    },
    isEvaluationAdmin ? {
      title: "Total Staff Responses",
      value: authenticatedResponses,
      subtitle: "Responses from staff",
      icon: Users,
      variant: 'amber' as const,
    } : {
      title: "Total Responses",
      value: `${totalResponses} (${authenticatedResponses}/${guestResponses})`,
      subtitle: "(Participant/Anonymous)",
      icon: Users,
      variant: 'amber' as const,
    },
    {
      title: "Archived",
      value: archivedCount,
      subtitle: displayQuestionnaires.length > 0 ? `${Math.round((archivedCount/displayQuestionnaires.length)*100)}% of total` : "0% of total",
      icon: XCircle,
      variant: 'teal' as const,
    },
  ];

  const filteredQuestionnaires = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return displayQuestionnaires.filter((questionnaire) => {
      const matchesSearch =
        questionnaire.title.toLowerCase().includes(searchLower) ||
        questionnaire.code.toLowerCase().includes(searchLower);
      const matchesStatus =
        selectedStatus === "all" || questionnaire.status === selectedStatus;
      const matchesType =
        selectedType === "all" || questionnaire.type === selectedType;
      return matchesSearch && matchesStatus && matchesType;
    }).sort((a, b) => {
      // Sort by latest first (createdDate)
      const dateA = new Date(a.createdDate || 0).getTime();
      const dateB = new Date(b.createdDate || 0).getTime();
      return dateB - dateA;
    });
  }, [displayQuestionnaires, searchQuery, selectedStatus, selectedType]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedType]);

  const totalPages = Math.ceil(filteredQuestionnaires.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentQuestionnaires = useMemo(() => 
    filteredQuestionnaires.slice(startIndex, endIndex),
    [filteredQuestionnaires, startIndex, endIndex]
  );

  if (loading) {
    return (
      <RoleBasedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading questionnaires...</p>
          </div>
        </div>
      </RoleBasedLayout>
    );
  }

  if (error) {
    return (
      <RoleBasedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-semibold">{error}</p>
            <button 
              onClick={loadQuestionnaires}
              className="mt-4 px-4 py-2 bg-qsights-cyan text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </RoleBasedLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
            <CheckCircle className="w-3 h-3" />
            Published
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-50 text-yellow-700 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            Draft
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-700 text-xs font-medium rounded-full">
            <XCircle className="w-3 h-3" />
            Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            {status || 'Draft'}
          </span>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: { [key: string]: string } = {
      Survey: "bg-blue-100 text-blue-700",
      Feedback: "bg-cyan-50 text-purple-700",
      Assessment: "bg-orange-100 text-orange-700",
      Review: "bg-pink-100 text-pink-700",
      Evaluation: "bg-cyan-50 text-indigo-700",
      Checklist: "bg-teal-100 text-teal-700",
      Audit: "bg-cyan-100 text-cyan-700",
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

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Selection Mode Banner */}
        {selectionMode && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-6 w-6" />
                <div>
                  <h3 className="text-lg font-semibold">Select a Questionnaire for Evaluation</h3>
                  <p className="text-green-100 text-sm">Choose an existing questionnaire or create a new one to use for staff evaluation</p>
                </div>
              </div>
              <button
                onClick={handleCancelSelection}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Evaluation
              </button>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Questionnaires</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {selectionMode 
                ? "Click 'Select' on a questionnaire to use it for evaluation, or create a new one"
                : "Manage surveys, assessments, and feedback forms"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!selectionMode && (
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
            {currentUser && canCreateResource(currentUser.role, 'questionnaires') && (
              <a
                href={selectionMode ? "/questionnaires/create?mode=select-for-evaluation&type=evaluation" : "/questionnaires/create"}
                className="flex items-center gap-2 px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Questionnaire
              </a>
            )}
          </div>
        </div>

        {/* Stats Grid */}
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

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search questionnaires..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="survey">Survey</option>
                  <option value="feedback">Feedback</option>
                  <option value="assessment">Assessment</option>
                  <option value="review">Review</option>
                  <option value="evaluation">Evaluation</option>
                  <option value="checklist">Checklist</option>
                  <option value="audit">Audit</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questionnaires Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Questionnaire
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Questions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Programs
                    </th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Languages
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Modified
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentQuestionnaires.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium mb-2">No questionnaires found</p>
                        <p className="text-sm text-gray-500">
                          {searchQuery || selectedStatus !== "all" || selectedType !== "all"
                            ? "Try adjusting your filters"
                            : "Create your first questionnaire to get started"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    currentQuestionnaires.map((questionnaire) => (
                      <tr
                        key={questionnaire.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                      {/* Questionnaire */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {questionnaire.title}
                          </p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            {questionnaire.code}
                          </p>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4">
                        {getTypeBadge(questionnaire.type)}
                      </td>

                      {/* Questions */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">
                          {questionnaire.questions}
                        </p>
                      </td>

                      {/* Programs */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 flex-wrap max-w-xs">
                          {questionnaire.programs.slice(0, 2).map((program, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded"
                            >
                              {program}
                            </span>
                          ))}
                          {questionnaire.programs.length > 2 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              +{questionnaire.programs.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Responses */}
                      <td className="hidden px-6 py-4">
                        <Tooltip
                          content={
                            <div className="text-xs">
                              <div>Authenticated: {questionnaire.authenticatedResponses.toLocaleString()}</div>
                              <div>Anonymous: {questionnaire.guestResponses.toLocaleString()}</div>
                            </div>
                          }
                        >
                          <p className="text-sm font-medium text-gray-900 cursor-help">
                            {questionnaire.responses.toLocaleString()}
                          </p>
                        </Tooltip>
                      </td>

                      {/* Languages */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {questionnaire.languages.map((lang) =>
                            getLanguageBadge(lang)
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {getStatusBadge(questionnaire.status)}
                      </td>

                      {/* Last Modified */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">
                          {questionnaire.lastModified}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {selectionMode ? (
                            // Selection mode - show Select button prominently
                            <>
                              <button
                                onClick={() => handlePreview(questionnaire.id.toString())}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Preview"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSelectForEvaluation(questionnaire.id.toString(), questionnaire.title)}
                                className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                                title="Select for Evaluation"
                              >
                                <CheckSquare className="w-4 h-4" />
                                Select
                              </button>
                            </>
                          ) : (
                            // Normal mode - show all action buttons
                            <>
                              <button
                                onClick={() => handlePreview(questionnaire.id.toString())}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Preview"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {currentUser && canEditResource(currentUser.role, 'questionnaires') && (
                                <button
                                  onClick={() => handleEdit(questionnaire.id.toString())}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {currentUser && canCreateResource(currentUser.role, 'questionnaires') && (
                                <button
                                  onClick={() => handleDuplicate(questionnaire.id.toString())}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                  title="Duplicate"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              )}
                              {currentUser && canDeleteResource(currentUser.role, 'questionnaires') && (
                                <button
                                  onClick={() => handleDelete(questionnaire.id.toString(), questionnaire.title)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Showing {filteredQuestionnaires.length > 0 ? startIndex + 1 : 0} to{" "}
                    {Math.min(endIndex, filteredQuestionnaires.length)} of{" "}
                    {filteredQuestionnaires.length} questionnaires
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
        onClose={() => setDeleteModal({ isOpen: false, questionnaireId: null, questionnaireName: null })}
        onConfirm={confirmDelete}
        title="Delete Questionnaire?"
        itemName={deleteModal.questionnaireName || undefined}
        itemType="questionnaire"
      />
    </RoleBasedLayout>
  );
}

export default function QuestionnairesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading questionnaires...</p>
        </div>
      </div>
    }>
      <QuestionnairesPageContent />
    </Suspense>
  );
}
