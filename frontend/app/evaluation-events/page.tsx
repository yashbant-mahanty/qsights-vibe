"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Play,
  Pause,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  Send,
  FileText,
} from "lucide-react";
import { evaluationEventsApi, type EvaluationEvent } from "@/lib/api";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { toast } from "@/components/ui/toast";

export default function EvaluationEventsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [events, setEvents] = useState<EvaluationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; eventId: string | null; eventName: string | null }>({ isOpen: false, eventId: null, eventName: null });

  useEffect(() => {
    loadEvents();

    // Listen for global search events
    const handleGlobalSearch = (e: CustomEvent) => {
      if (e.detail.pathname === '/evaluation-events') {
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

  async function loadEvents() {
    try {
      setLoading(true);
      setError(null);
      const data = await evaluationEventsApi.getAll();
      // Backend already sorts by updated_at DESC, created_at DESC
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evaluation events');
      console.error('Error loading evaluation events:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleView = (eventId: string) => {
    router.push(`/evaluation-events/${eventId}`);
  };

  const handleEdit = (eventId: string) => {
    router.push(`/evaluation-events/${eventId}/edit`);
  };

  const handleTrigger = (eventId: string) => {
    router.push(`/evaluation-events/${eventId}/trigger`);
  };

  const handleReports = (eventId: string) => {
    router.push(`/evaluation-events/${eventId}/reports`);
  };

  const handleActivate = async (eventId: string) => {
    try {
      await evaluationEventsApi.activate(eventId);
      await loadEvents();
      toast({ title: "Success!", description: "Evaluation event activated!", variant: "success" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : 'Failed to activate', variant: "error" });
    }
  };

  const handlePause = async (eventId: string) => {
    try {
      await evaluationEventsApi.pause(eventId);
      await loadEvents();
      toast({ title: "Success!", description: "Evaluation event paused!", variant: "success" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : 'Failed to pause', variant: "error" });
    }
  };

  const handleComplete = async (eventId: string) => {
    if (!confirm('Are you sure you want to mark this evaluation event as complete? This action cannot be undone.')) {
      return;
    }
    try {
      await evaluationEventsApi.complete(eventId);
      await loadEvents();
      toast({ title: "Success!", description: "Evaluation event completed!", variant: "success" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : 'Failed to complete', variant: "error" });
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.eventId) return;
    try {
      await evaluationEventsApi.delete(deleteModal.eventId);
      await loadEvents();
      toast({ title: "Success!", description: "Evaluation event deleted!", variant: "success" });
      setDeleteModal({ isOpen: false, eventId: null, eventName: null });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : 'Failed to delete', variant: "error" });
    }
  };

  // Filter events
  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = selectedStatus === "all" || event.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistics
  const stats = {
    total: events.length,
    active: events.filter(e => e.status === 'active').length,
    draft: events.filter(e => e.status === 'draft').length,
    completed: events.filter(e => e.status === 'completed').length,
    paused: events.filter(e => e.status === 'paused').length,
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      draft: { color: "bg-gray-100 text-gray-700", icon: <FileText className="w-3 h-3" /> },
      active: { color: "bg-green-100 text-green-700", icon: <Play className="w-3 h-3" /> },
      paused: { color: "bg-yellow-100 text-yellow-700", icon: <Pause className="w-3 h-3" /> },
      completed: { color: "bg-blue-100 text-blue-700", icon: <CheckCircle className="w-3 h-3" /> },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Evaluation Events</h1>
            <p className="text-gray-500 text-sm mt-1">
              Create and manage hierarchy-based staff evaluations
            </p>
          </div>
          <button
            onClick={() => router.push('/evaluation-events/create')}
            className="flex items-center gap-2 px-4 py-2 bg-qsights-cyan text-white rounded-lg hover:bg-qsights-dark/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Evaluation
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <GradientStatCard
            title="Total Events"
            value={stats.total}
            icon={ClipboardCheck}
            gradient="from-indigo-500 to-purple-600"
          />
          <GradientStatCard
            title="Active"
            value={stats.active}
            icon={Play}
            gradient="from-green-500 to-emerald-600"
          />
          <GradientStatCard
            title="Draft"
            value={stats.draft}
            icon={FileText}
            gradient="from-gray-400 to-gray-600"
          />
          <GradientStatCard
            title="Paused"
            value={stats.paused}
            icon={Pause}
            gradient="from-yellow-500 to-orange-600"
          />
          <GradientStatCard
            title="Completed"
            value={stats.completed}
            icon={CheckCircle}
            gradient="from-blue-500 to-cyan-600"
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search evaluation events..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-indigo-500"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-qsights-cyan mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading evaluation events...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">{error}</div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <ClipboardCheck className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p>No evaluation events found</p>
                <button
                  onClick={() => router.push('/evaluation-events/create')}
                  className="mt-4 text-qsights-cyan hover:text-indigo-700"
                >
                  Create your first evaluation event
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Questionnaire</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{event.name}</p>
                            {event.description && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">{event.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(event.status)}
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {event.questionnaire?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-600">
                            {event.start_date && (
                              <span>{new Date(event.start_date).toLocaleDateString()}</span>
                            )}
                            {event.start_date && event.end_date && <span> - </span>}
                            {event.end_date && (
                              <span>{new Date(event.end_date).toLocaleDateString()}</span>
                            )}
                            {!event.start_date && !event.end_date && <span className="text-gray-400">No dates set</span>}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {event.completed_count || 0} / {event.assignments_count || 0}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleView(event.id)}
                              className="p-2 text-gray-500 hover:text-qsights-cyan hover:bg-qsights-light rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            {event.status !== 'completed' && (
                              <button
                                onClick={() => handleEdit(event.id)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}

                            {event.status === 'active' && (
                              <button
                                onClick={() => handleTrigger(event.id)}
                                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Trigger for Team"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}

                            {event.status === 'draft' && (
                              <button
                                onClick={() => handleActivate(event.id)}
                                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Activate"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}

                            {event.status === 'active' && (
                              <button
                                onClick={() => handlePause(event.id)}
                                className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                title="Pause"
                              >
                                <Pause className="w-4 h-4" />
                              </button>
                            )}

                            {(event.status === 'active' || event.status === 'paused') && (
                              <button
                                onClick={() => handleComplete(event.id)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Mark Complete"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleReports(event.id)}
                              className="p-2 text-gray-500 hover:text-qsights-cyan hover:bg-qsights-light rounded-lg transition-colors"
                              title="View Reports"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </button>

                            {event.status === 'draft' && (
                              <button
                                onClick={() => setDeleteModal({ isOpen: true, eventId: event.id, eventName: event.name })}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredEvents.length)} of{" "}
              {filteredEvents.length} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, eventId: null, eventName: null })}
        onConfirm={handleDelete}
        title="Delete Evaluation Event"
        message={`Are you sure you want to delete "${deleteModal.eventName}"? This action cannot be undone.`}
      />
    </AppLayout>
  );
}
