"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  UserCheck,
  Users,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
  Mail,
  FolderOpen,
} from "lucide-react";
import { participantsApi, type Participant } from "@/lib/api";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { toast } from "@/components/ui/toast";
import { canCreateResource, canEditResource, canDeleteResource, UserRole } from "@/lib/permissions";

export default function ParticipantsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedProgram, setSelectedProgram] = useState("all");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ message: string; successCount: number; skippedCount: number; skippedRows: Array<{ rowNumber: number; reason: string }> } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; participantId: string | null; participantName: string | null }>({ isOpen: false, participantId: null, participantName: null });
  const [currentUser, setCurrentUser] = useState<{ role: UserRole } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    selectedPrograms: [] as string[],
    status: 'active' as 'active' | 'inactive',
  });
  const [programs, setPrograms] = useState<any[]>([]);
  const [showProgramsModal, setShowProgramsModal] = useState(false);
  const [selectedParticipantPrograms, setSelectedParticipantPrograms] = useState<any[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);

  useEffect(() => {
    loadParticipants();
    loadPrograms();

    // Listen for global search events
    const handleGlobalSearch = (e: CustomEvent) => {
      if (e.detail.pathname === '/participants') {
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

  async function loadPrograms() {
    try {
      const { programsApi } = await import('@/lib/api');
      const data = await programsApi.getAll();
      setPrograms(data.filter(p => p.status === 'active'));
    } catch (err) {
      console.error('Error loading programs:', err);
    }
  }

  async function loadParticipants() {
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
          const data = await participantsApi.getAll({ program_id: user.programId });
          setParticipants(data);
        } else {
          // Super-admin, admin, or other roles see all participants
          const data = await participantsApi.getAll();
          setParticipants(data);
        }
      } else {
        // Fallback: load all participants
        const data = await participantsApi.getAll();
        setParticipants(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load participants');
      console.error('Error loading participants:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (participantId: string) => {
    const participant = participants.find(p => String(p.id) === participantId);
    if (!participant) {
      console.error('Participant not found:', participantId);
      return;
    }
    
    const nameParts = participant.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    setSelectedParticipant(participant);
    setEditFormData({
      firstName,
      lastName,
      email: participant.email,
      phone: participant.phone || '',
      selectedPrograms: participant.programs?.map(p => String(p.id)) || [],
      status: participant.status,
    });
    setShowEditModal(true);
  };

  const handleViewPrograms = (participantId: string) => {
    const participant = participants.find(p => String(p.id) === participantId);
    if (!participant) {
      console.error('Participant not found:', participantId);
      return;
    }
    
    setSelectedParticipant(participant);
    setSelectedParticipantPrograms(participant.programs || []);
    setShowProgramsModal(true);
  };

  async function handleSaveEdit() {
    if (!selectedParticipant) return;
    
    if (!editFormData.firstName.trim() || !editFormData.lastName.trim() || !editFormData.email.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "error"
      });
      return;
    }
    
    try {
      await participantsApi.update(selectedParticipant.id, {
        name: `${editFormData.firstName} ${editFormData.lastName}`,
        email: editFormData.email,
        phone: editFormData.phone,
        status: editFormData.status,
        program_ids: editFormData.selectedPrograms,
      });
      
      await loadParticipants();
      setShowEditModal(false);
      setSelectedParticipant(null);
      
      toast({
        title: "Success!",
        description: "Participant updated successfully!",
        variant: "success"
      });
    } catch (err) {
      console.error('Failed to update participant:', err);
      toast({
        title: "Error",
        description: "Failed to update participant: " + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error"
      });
    }
  }

  const handleToggleStatus = async (participantId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await participantsApi.update(participantId, { status: newStatus });
      await loadParticipants();
      toast({
        title: "Success!",
        description: `Participant ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`,
        variant: "success"
      });
    } catch (err) {
      console.error('Failed to update participant status:', err);
      toast({
        title: "Error",
        description: "Failed to update participant status",
        variant: "error"
      });
    }
  };

  const handleDelete = (participantId: string, participantName: string) => {
    setDeleteModal({ isOpen: true, participantId, participantName });
  };

  const confirmDelete = async () => {
    if (!deleteModal.participantId) return;
    
    try {
      await participantsApi.delete(deleteModal.participantId);
      await loadParticipants();
      setSelectedParticipantIds([]);
      toast({
        title: "Deleted!",
        description: "Participant deleted successfully!",
        variant: "success"
      });
    } catch (err) {
      console.error('Failed to delete participant:', err);
      toast({
        title: "Error",
        description: "Failed to delete participant",
        variant: "error"
      });
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedParticipantIds.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select participants to delete",
        variant: "warning"
      });
      return;
    }
    setBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedParticipantIds.length === 0) return;
    
    try {
      // Ensure IDs are strings for API validation
      const stringIds = selectedParticipantIds.map(id => String(id));
      const result = await participantsApi.bulkDelete(stringIds);
      await loadParticipants();
      setSelectedParticipantIds([]);
      setBulkDeleteModal(false);
      toast({
        title: "Deleted!",
        description: result.message || `${result.deleted_count} participant(s) deleted successfully!`,
        variant: "success"
      });
    } catch (err) {
      console.error('Failed to delete participants:', err);
      toast({
        title: "Error",
        description: "Failed to delete participants: " + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error"
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedParticipantIds.length === currentParticipants.length) {
      setSelectedParticipantIds([]);
    } else {
      // Ensure IDs are strings
      setSelectedParticipantIds(currentParticipants.map(p => String(p.id)));
    }
  };

  const handleSelectParticipant = (participantId: string) => {
    setSelectedParticipantIds(prev => {
      if (prev.includes(participantId)) {
        return prev.filter(id => id !== participantId);
      } else {
        return [...prev, participantId];
      }
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await participantsApi.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'participants_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download template:', err);
      toast({
        title: "Error",
        description: "Failed to download template",
        variant: "error"
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      toast({
        title: "Validation Error",
        description: "Please select a file to upload",
        variant: "warning"
      });
      return;
    }

    try {
      setUploading(true);
      const result = await participantsApi.bulkImport(uploadFile);
      setUploadResult(result);
      await loadParticipants();
      setUploadFile(null);
    } catch (err) {
      console.error('Failed to upload file:', err);
      toast({
        title: "Upload Failed",
        description: 'Failed to upload file: ' + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error"
      });
    } finally {
      setUploading(false);
    }
  };

  const closeBulkUploadModal = () => {
    setShowBulkUploadModal(false);
    setUploadFile(null);
    setUploadResult(null);
  };

  const participants_display = participants.map(p => ({
    id: p.id,
    name: p.name,
    email: p.email,
    organization: p.organization?.name || 'N/A',
    organizationCode: p.organization?.code || 'N/A',
    programs: p.programs?.map(prog => prog.name) || [],
    activitiesCompleted: 0,
    activitiesTotal: p.activities_count || 0,
    status: p.status,
    isGuest: p.is_guest || false,
    guestCode: p.guest_code,
    joinedDate: new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    lastActive: new Date(p.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
  }));

  const displayParticipants = participants_display;

  // Calculate participant and anonymous counts (include all statuses for total count)
  const authenticatedCount = displayParticipants.filter(p => !p.isGuest).length;
  const anonymousCount = displayParticipants.filter(p => p.isGuest).length;
  const totalActiveParticipants = authenticatedCount + anonymousCount;
  const activeParticipantsCount = displayParticipants.filter((p) => p.status === "active").length;
  const inactiveParticipantsCount = displayParticipants.filter((p) => p.status === "inactive").length;
  
  // Total Enrollment = Number of participants registered (Participants + Anonymous) in this program
  // For program roles: displayParticipants is already filtered by program_id
  // For super admin: displayParticipants shows all participants
  const totalEnrollment = totalActiveParticipants;
  
  // Calculate enrollment percentage
  // For program roles: % of participants enrolled in their program
  // For super admin: % of total active participants with program assignments
  const participantsWithPrograms = displayParticipants.filter(p => p.programs && p.programs.length > 0).length;
  const enrollmentPercentage = totalActiveParticipants > 0 
    ? Math.round((participantsWithPrograms / totalActiveParticipants) * 100)
    : 0;

  const stats = [
    {
      title: "Total Participants",
      value: `${totalActiveParticipants} (${authenticatedCount}/${anonymousCount})`,
      subtitle: "(Participant/Anonymous)",
      icon: Users,
      variant: 'blue' as const,
    },
    {
      title: "Active",
      value: activeParticipantsCount,
      subtitle: totalActiveParticipants > 0 ? `${Math.round((activeParticipantsCount/totalActiveParticipants)*100)}% of total` : "0% of total",
      icon: CheckCircle,
      variant: 'green' as const,
    },
    {
      title: "Inactive",
      value: inactiveParticipantsCount,
      subtitle: totalActiveParticipants > 0 ? `${Math.round((inactiveParticipantsCount/totalActiveParticipants)*100)}% of total` : "0% of total",
      icon: XCircle,
      variant: 'red' as const,
    },
    {
      title: "Total Enrollment",
      value: totalEnrollment,
      subtitle: `${enrollmentPercentage}% enrolled`,
      icon: FolderOpen,
      variant: 'purple' as const,
    },
  ];

  const programNames = Array.from(
    new Set(displayParticipants.flatMap((p) => p.programs))
  );

  const filteredParticipants = displayParticipants.filter((participant) => {
    const matchesSearch =
      participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      participant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      participant.organization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || participant.status === selectedStatus;
    const matchesProgram =
      selectedProgram === "all" ||
      participant.programs.includes(selectedProgram);
    return matchesSearch && matchesStatus && matchesProgram;
  }).sort((a, b) => {
    // Sort by latest first (joinedDate)
    const dateA = new Date(a.joinedDate || 0).getTime();
    const dateB = new Date(b.joinedDate || 0).getTime();
    return dateB - dateA;
  });

  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentParticipants = filteredParticipants.slice(startIndex, endIndex);

  if (loading) {
    return (
      <RoleBasedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading participants...</p>
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
              onClick={loadParticipants}
              className="mt-4 px-4 py-2 bg-qsights-cyan text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </RoleBasedLayout>
    );
  }

  const getStatusColor = (status: string) => {
    return status === "active"
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700";
  };

  const getCompletionPercentage = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Participants</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and monitor all participants
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentUser && canCreateResource(currentUser.role, 'participants') && (
              <>
                <button 
                  onClick={() => setShowBulkUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Bulk Upload
                </button>
                <a
                  href="/participants/create"
                  className="flex items-center gap-2 px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Participant
                </a>
              </>
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

        {/* Participants Table */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg font-bold">Participant List</CardTitle>
                {selectedParticipantIds.length > 0 && (
                  <button
                    onClick={handleBulkDeleteClick}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete ({selectedParticipantIds.length})
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {/* Search */}
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg flex-1 sm:flex-initial sm:w-64">
                  <Search className="w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search participants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-none outline-none text-sm w-full bg-transparent"
                  />
                </div>
                {/* Program Filter */}
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="all">All Programs</option>
                  {programNames.map((prog) => (
                    <option key={prog} value={prog}>
                      {prog}
                    </option>
                  ))}
                </select>
                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {/* Export Button */}
                <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedParticipantIds.length === currentParticipants.length && currentParticipants.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Participant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Programs
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentParticipants.map((participant) => (
                      <tr
                        key={participant.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedParticipantIds.includes(participant.id)}
                            onChange={() => handleSelectParticipant(participant.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {participant.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <div className="ml-3">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">
                                  {participant.name}
                                </p>
                                {participant.isGuest && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-50 text-purple-800">
                                    Anonymous
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {participant.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {participant.programs.length === 0 ? (
                              <span className="text-xs text-gray-400 italic">No programs assigned</span>
                            ) : (
                              <>
                                {participant.programs.slice(0, 2).map((program, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded inline-block mr-1"
                                  >
                                    {program}
                                  </div>
                                ))}
                                {participant.programs.length > 2 && (
                                  <div className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded inline-block">
                                    +{participant.programs.length - 2} more
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                              participant.status
                            )}`}
                          >
                            {participant.status.charAt(0).toUpperCase() +
                              participant.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {participant.lastActive}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewPrograms(participant.id.toString())}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="View Programs"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {currentUser && canEditResource(currentUser.role, 'participants') && (
                              <button
                                onClick={() => handleEdit(participant.id.toString())}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {currentUser && canDeleteResource(currentUser.role, 'participants') && (
                              <button
                                onClick={() => handleDelete(participant.id.toString(), participant.name)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
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

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(endIndex, filteredParticipants.length)} of{" "}
                  {filteredParticipants.length} participants
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? "bg-qsights-dark text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Upload Modal */}
        {showBulkUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Bulk Upload Participants</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Upload an Excel file to add multiple participants at once
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Download Template */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Download className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-blue-900">Download Template</h3>
                      <p className="text-xs text-blue-700 mt-1">
                        Download the Excel template to see the required format
                      </p>
                      <button
                        onClick={handleDownloadTemplate}
                        className="mt-2 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                      >
                        Download Template
                      </button>
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                  />
                  {uploadFile && (
                    <p className="text-xs text-gray-600 mt-2">
                      Selected: {uploadFile.name}
                    </p>
                  )}
                </div>

                {/* Upload Result */}
                {uploadResult && (
                  <div className={`border rounded-lg p-4 ${uploadResult.skippedCount > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                    <h3 className="text-sm font-semibold mb-2">Upload Results</h3>
                    <p className="text-sm">
                      <span className="font-medium text-green-700">{uploadResult.successCount} participants imported successfully</span>
                      {uploadResult.skippedCount > 0 && (
                        <span className="text-yellow-700"> • {uploadResult.skippedCount} skipped</span>
                      )}
                    </p>
                    {uploadResult.skippedRows.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">Skipped Rows:</p>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {uploadResult.skippedRows.map((row, idx) => (
                            <p key={idx} className="text-xs text-gray-600">
                              Row {row.rowNumber}: {row.reason}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={closeBulkUploadModal}
                  disabled={uploading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploadResult ? 'Close' : 'Cancel'}
                </button>
                {!uploadResult && (
                  <button
                    onClick={handleBulkUpload}
                    disabled={!uploadFile || uploading}
                    className="px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Participant Modal */}
      {showEditModal && selectedParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Edit Participant</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Personal Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-qsights-blue" />
                  Personal Information
                </h4>
                <div className="space-y-4 pl-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editFormData.firstName}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                        placeholder="Enter first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editFormData.lastName}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Communication Email ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      placeholder="participant@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Program Assignment */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-qsights-blue" />
                  Program Assignment
                </h4>
                <div className="space-y-2 pl-6">
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    {programs.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">No active programs available</div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {programs.map((program) => (
                          <label
                            key={program.id}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={editFormData.selectedPrograms.includes(program.id)}
                              onChange={() => {
                                setEditFormData(prev => ({
                                  ...prev,
                                  selectedPrograms: prev.selectedPrograms.includes(program.id)
                                    ? prev.selectedPrograms.filter(p => p !== program.id)
                                    : [...prev.selectedPrograms, program.id]
                                }));
                              }}
                              className="w-4 h-4 text-qsights-blue border-gray-300 rounded focus:ring-qsights-blue"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{program.name}</div>
                              <div className="text-xs text-gray-500">{program.organization?.name || 'N/A'}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">Status</h4>
                <div className="space-y-2 pl-6">
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editFormData.firstName || !editFormData.lastName || !editFormData.email}
                className="px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Programs Modal */}
      {showProgramsModal && selectedParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowProgramsModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Participant Programs</h3>
                <p className="text-sm text-gray-500 mt-1">{selectedParticipant.name}</p>
              </div>
              <button
                onClick={() => setShowProgramsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {selectedParticipantPrograms.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No programs assigned</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedParticipantPrograms.map((program) => (
                    <div key={program.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900">{program.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">Code: {program.code}</p>
                        </div>
                        <button
                          onClick={() => router.push(`/programs?highlight=${program.id}`)}
                          className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                        >
                          View Program
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, participantId: null, participantName: null })}
        onConfirm={confirmDelete}
        title="Delete Participant?"
        itemName={deleteModal.participantName || undefined}
        itemType="participant"
      />

      <DeleteConfirmationModal
        isOpen={bulkDeleteModal}
        onClose={() => setBulkDeleteModal(false)}
        onConfirm={confirmBulkDelete}
        title={`Delete ${selectedParticipantIds.length} Participant(s)?`}
        itemName={`${selectedParticipantIds.length} selected participant(s) will be permanently deleted`}
        itemType="participants"
      />
    </RoleBasedLayout>
  );
}
