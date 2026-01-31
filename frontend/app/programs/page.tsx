"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  FolderOpen,
  Users,
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  X,
  Check,
  Copy,
} from "lucide-react";
import { programsApi, type Program, type ProgramUser } from "@/lib/api";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { toast } from "@/components/ui/toast";
import { canCreateResource, canEditResource, canDeleteResource, UserRole } from "@/lib/permissions";

export default function ProgramsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedOrganization, setSelectedOrganization] = useState("all");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    code: '',
    description: '',
    organization_id: '',
    group_head_id: '',
    start_date: '',
    end_date: '',
    status: 'active' as 'active' | 'inactive' | 'completed',
    logoUrl: '',
  });
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [groupHeads, setGroupHeads] = useState<any[]>([]);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [programUsers, setProgramUsers] = useState<ProgramUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showResetCredentialsModal, setShowResetCredentialsModal] = useState(false);
  const [resetCredentials, setResetCredentials] = useState<any>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; programId: string | null; programName: string | null }>({ isOpen: false, programId: null, programName: null });
  const [currentUser, setCurrentUser] = useState<{ role: UserRole } | null>(null);

  useEffect(() => {
    // Fetch user data first, then load programs with filter
    const initializeData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get current user to check role
        const userResponse = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        let userData = null;
        if (userResponse.ok) {
          userData = await userResponse.json();
          setCurrentUser(userData.user);
        }
        
        // Filter by program_id for program roles
        const isProgramRole = userData?.user?.role && ['program-admin', 'program-manager', 'program-moderator'].includes(userData.user.role);
        const programId = userData?.user?.programId;
        
        console.log('🔍 [PROGRAMS PAGE] Loading programs with filter:', { 
          isProgramRole, 
          programId,
          userRole: userData?.user?.role,
          userName: userData?.user?.name
        });
        
        // For Programs page, always request all statuses (active, expired, completed) for super-admin
        // Program-scoped roles will still be filtered by their program_id
        const data = await programsApi.getAll(
          isProgramRole && programId ? { program_id: programId, all_statuses: true } : { all_statuses: true }
        );
        console.log('✅ [PROGRAMS PAGE] Programs loaded:', data.length, 'programs');
        console.log('📋 [PROGRAMS PAGE] Program details:', data.map(p => ({ 
          id: p.id, 
          name: p.name || '(EMPTY NAME)', 
          code: p.code,
          status: p.status 
        })));
        setPrograms(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load programs');
        console.error('Error loading programs:', err);
      } finally {
        setLoading(false);
      }
    };
    
    initializeData();
    loadOrganizationsAndGroupHeads();

    // Listen for global search events
    const handleGlobalSearch = (e: CustomEvent) => {
      if (e.detail.pathname === '/programs') {
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
      setLoading(true);
      setError(null);
      
      // Get current user to check role
      const userResponse = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      let userData = null;
      if (userResponse.ok) {
        userData = await userResponse.json();
        setCurrentUser(userData.user);
      }
      
      // Filter by program_id for program roles
      const isProgramRole = userData?.user?.role && ['program-admin', 'program-manager', 'program-moderator'].includes(userData.user.role);
      const programId = userData?.user?.programId;
      
      const data = await programsApi.getAll(
        isProgramRole && programId ? { program_id: programId } : {}
      );
      setPrograms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load programs');
      console.error('Error loading programs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadOrganizationsAndGroupHeads() {
    try {
      const { organizationsApi, groupHeadsApi } = await import('@/lib/api');
      const [orgsData, ghData] = await Promise.all([
        organizationsApi.getAll(),
        groupHeadsApi.getAll()
      ]);
      setOrganizations(orgsData);
      setGroupHeads(ghData);
    } catch (err) {
      console.error('Error loading organizations/group heads:', err);
    }
  }

  function handleEdit(prog: Program) {
    setSelectedProgram(prog);
    setEditFormData({
      name: prog.name,
      code: prog.code || String(prog.id).padStart(8, '0'),
      description: prog.description || '',
      organization_id: prog.organization_id,
      group_head_id: prog.group_head_id || '',
      start_date: prog.start_date || '',
      end_date: prog.end_date || '',
      status: prog.status,
      logoUrl: prog.logo || '',
    });
    setShowEditModal(true);
  }

  async function handleSaveEdit() {
    if (!selectedProgram) return;
    try {
      const { logoUrl, ...progData } = editFormData;
      const updateData: Partial<Program> = {
        ...progData,
        ...(logoUrl && { logo: logoUrl }),
      };
      console.log('Saving program with data:', updateData);
      await programsApi.update(selectedProgram.id, updateData);
      await loadPrograms();
      setShowEditModal(false);
      setSelectedProgram(null);
      toast({
        title: "Success",
        description: 'Program updated successfully',
        variant: "success"
      });
    } catch (err) {
      console.error('Error updating program:', err);
      toast({
        title: "Error",
        description: 'Failed to update program: ' + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error"
      });
    }
  }

  function handleDelete(prog: Program) {
    setDeleteModal({ isOpen: true, programId: prog.id, programName: prog.name });
  }

  async function confirmDelete() {
    if (!deleteModal.programId) return;
    
    try {
      await programsApi.delete(deleteModal.programId);
      await loadPrograms();
    } catch (err) {
      toast({
        title: "Error",
        description: 'Failed to delete program: ' + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error"
      });
    }
  }

  async function handleViewUsers(prog: Program) {
    router.push(`/program-admin/roles?programId=${prog.id}&programName=${encodeURIComponent(prog.name)}`);
  }

  async function handleResetPassword(userId: string, userName: string) {
    if (!selectedProgram) return;
    
    setResettingPassword(userId);
    try {
      const response = await programsApi.resetProgramUserPassword(selectedProgram.id, userId);
      setResetCredentials(response.credentials);
      setShowResetCredentialsModal(true);
    } catch (err) {
      toast({
        title: "Error",
        description: 'Failed to reset password: ' + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error"
      });
    } finally {
      setResettingPassword(null);
    }
  }

  const programs_display = programs.map(prog => ({
    id: prog.id,
    name: prog.name,
    code: prog.code || String(prog.id).padStart(8, '0'),
    logo: prog.logo,
    organization: prog.organization?.name || "N/A",
    organizationCode: prog.organization?.id ? String(prog.organization.id) : (prog.organization_id ? String(prog.organization_id) : "N/A") || "N/A",
    groupHead: prog.group_head?.user?.name || "N/A",
    participants: prog.participants_count || 0,
    activeParticipants: (prog as any).active_participants_count || 0,
    inactiveParticipants: (prog as any).inactive_participants_count || 0,
    guestParticipants: prog.guest_participants_count || 0,
    authenticatedParticipants: prog.authenticated_participants_count || 0,
    activities: prog.activities_count || 0,
    startDate: prog.start_date ? new Date(prog.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A",
    endDate: prog.end_date ? new Date(prog.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A",
    status: prog.status,
    progress: (prog as any).progress || 0,
    completionRate: (prog as any).completion_rate || 0,
  }));

  // Mock data removed - using only real API data

  const displayPrograms = programs_display;
  const activeProgramsCount = displayPrograms.filter((p) => p.status === "active").length;
  const completedProgramsCount = displayPrograms.filter((p) => p.status === "completed").length;
  const totalProgramParticipants = displayPrograms.reduce((sum, p) => sum + p.activeParticipants + p.inactiveParticipants + p.guestParticipants, 0);
  const totalAuthParticipants = displayPrograms.reduce((sum, p) => sum + p.activeParticipants + p.inactiveParticipants, 0);
  const totalGuestParticipants = displayPrograms.reduce((sum, p) => sum + p.guestParticipants, 0);

  const stats = [
    {
      title: "Total Programs",
      value: displayPrograms.length,
      subtitle: `${activeProgramsCount} active`,
      icon: FolderOpen,
      variant: 'blue' as const,
    },
    {
      title: "Active Programs",
      value: activeProgramsCount,
      subtitle: displayPrograms.length > 0 ? `${Math.round((activeProgramsCount/displayPrograms.length)*100)}% of total` : "0% of total",
      icon: Activity,
      variant: 'green' as const,
    },
    {
      title: "Total Participants",
      value: `${totalProgramParticipants} (${totalAuthParticipants}/${totalGuestParticipants})`,
      subtitle: "(Participant/Anonymous)",
      icon: Users,
      variant: 'purple' as const,
    },
    {
      title: "Completed",
      value: completedProgramsCount,
      subtitle: displayPrograms.length > 0 ? `${Math.round((completedProgramsCount/displayPrograms.length)*100)}% completion` : "0% completion",
      icon: CheckCircle,
      variant: 'teal' as const,
    },
  ];

  const organizationNames = Array.from(
    new Set(displayPrograms.map((p) => p.organization))
  );

  const filteredPrograms = displayPrograms.filter((program) => {
    const matchesSearch =
      program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.groupHead.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || program.status === selectedStatus;
    const matchesOrganization =
      selectedOrganization === "all" ||
      program.organization === selectedOrganization;
    return matchesSearch && matchesStatus && matchesOrganization;
  }).sort((a, b) => {
    // Sort by latest first (startDate as proxy for created/updated)
    const dateA = new Date(a.startDate === "N/A" ? 0 : a.startDate).getTime();
    const dateB = new Date(b.startDate === "N/A" ? 0 : b.startDate).getTime();
    return dateB - dateA;
  });

  const totalPages = Math.ceil(filteredPrograms.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPrograms = filteredPrograms.slice(startIndex, endIndex);

  if (loading) {
    return (
      <RoleBasedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading programs...</p>
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
              onClick={loadPrograms}
              className="mt-4 px-4 py-2 bg-qsights-cyan text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </RoleBasedLayout>
    );
  }

  const getStatusConfig = (status: string) => {
    const configs: { [key: string]: { label: string; color: string } } = {
      active: { label: "Active", color: "bg-green-100 text-green-700" },
      completed: { label: "Completed", color: "bg-blue-100 text-blue-700" },
      draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
      archived: { label: "Archived", color: "bg-orange-100 text-orange-700" },
    };
    return configs[status] || configs.draft;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 25) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Programs</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and monitor all programs
            </p>
          </div>
          {currentUser && canCreateResource(currentUser.role, 'programs') && (
            <a
              href="/programs/create"
              className="flex items-center gap-2 px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Program
            </a>
          )}
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

        {/* Programs Table */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="text-lg font-bold">Program List</CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {/* Search */}
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg flex-1 sm:flex-initial sm:w-64">
                  <Search className="w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search programs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-none outline-none text-sm w-full bg-transparent"
                  />
                </div>
                {/* Organization Filter */}
                <select
                  value={selectedOrganization}
                  onChange={(e) => setSelectedOrganization(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="all">All Organizations</option>
                  {organizationNames.map((org) => (
                    <option key={org} value={org}>
                      {org}
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
                  <option value="completed">Completed</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
                {/* Export Button */}
                <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 relative">
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Group Head
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Participants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Events
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Timeline
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 relative">
                  {currentPrograms.map((program) => {
                    const statusConfig = getStatusConfig(program.status);
                    return (
                      <tr
                        key={program.id}
                        className="hover:bg-gray-50 transition-colors relative"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-qsights-dark rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                              {program.logo ? (
                                <img src={program.logo} alt={program.name} className="w-full h-full object-cover" />
                              ) : (
                                program.code.slice(0, 2)
                              )}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-semibold text-gray-900">
                                {program.name || "(Unnamed Program)"}
                              </p>
                              <p className="text-xs text-gray-500 font-mono">
                                {program.code}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {program.organization}
                              </p>
                              <p className="text-xs text-gray-500">
                                {program.organizationCode}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700">
                            {program.groupHead}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {program.activeParticipants + program.inactiveParticipants + program.guestParticipants}
                              </div>
                              <div className="text-xs text-gray-500">
                                ({program.activeParticipants + program.inactiveParticipants}/{program.guestParticipants})
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Activity className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {program.activities}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap hidden">
                          <div className="w-20">
                            <div className="flex items-center justify-center mb-1">
                              <span className="text-sm font-semibold text-gray-700">
                                {program.progress}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-full ${getProgressColor(
                                  program.progress
                                )} rounded-full transition-all duration-500`}
                                style={{ width: `${program.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${statusConfig.color}`}
                          >
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-start gap-1">
                            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-600">
                                {program.startDate}
                              </p>
                              <p className="text-xs text-gray-600">
                                {program.endDate}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewUsers(programs.find(p => p.id === program.id)!)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="View Program Users"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {currentUser && canEditResource(currentUser.role, 'programs') && (
                              <button
                                onClick={() => handleEdit(programs.find(p => p.id === program.id)!)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {currentUser && canDeleteResource(currentUser.role, 'programs') && (
                              <button
                                onClick={() => handleDelete(programs.find(p => p.id === program.id)!)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(endIndex, filteredPrograms.length)} of{" "}
                  {filteredPrograms.length} programs
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
      </div>

      {/* Edit Program Modal */}
      {showEditModal && selectedProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Edit Program</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-qsights-blue" />
                  Basic Information
                </h4>
                <div className="space-y-4 pl-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Program Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      placeholder="Enter program name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Program Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.code}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, code: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      placeholder="e.g., EEI-2025-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue resize-none"
                      placeholder="Enter description"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Organization & Timeline Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-qsights-blue" />
                  Organization & Timeline
                </h4>
                <div className="space-y-4 pl-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Organization <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editFormData.organization_id}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, organization_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                    >
                      <option value="">Select organization</option>
                      {organizations.map((org: any) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Group Head
                    </label>
                    <select
                      value={editFormData.group_head_id}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, group_head_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                    >
                      <option value="">Select group head</option>
                      {groupHeads.filter((gh: any) => gh.organization_id === editFormData.organization_id).map((gh: any) => (
                        <option key={gh.id} value={gh.id}>
                          {gh.user?.name || 'N/A'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={editFormData.start_date}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={editFormData.end_date}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, end_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">Status</h4>
                <div className="space-y-2 pl-6">
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'completed' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Logo URL Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">Program Logo</h4>
                <div className="space-y-2 pl-6">
                  <label className="text-xs font-medium text-gray-700">
                    Logo URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={editFormData.logoUrl || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      placeholder="https://example.com/logo.png"
                    />
                    {editFormData.logoUrl && (
                      <button
                        onClick={() => setEditFormData(prev => ({ ...prev, logoUrl: '' }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">Example: https://bq-common.s3.ap-south-1.amazonaws.com/logos/logo.png</p>
                  {editFormData.logoUrl && (
                    <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <img src={editFormData.logoUrl} alt="Logo preview" className="h-20 max-w-full object-contain mx-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                  )}
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
                disabled={!editFormData.name || !editFormData.code || !editFormData.organization_id}
                className="px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Program Users Modal */}
      {showUsersModal && selectedProgram && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8 max-h-[calc(100vh-4rem)] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-qsights-light to-cyan-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Program Users
                    </h3>
                    <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      {selectedProgram.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUsersModal(false)}
                  className="p-2 hover:bg-white/50 rounded-lg transition-all"
                >
                  <XCircle className="w-6 h-6 text-gray-500 hover:text-gray-700" />
                </button>
              </div>
              
              {/* Informational Messages */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-white border-l-4 border-blue-500 rounded-lg shadow-sm">
                  <p className="text-xs text-gray-700 flex items-start gap-2">
                    <span className="text-base flex-shrink-0">📋</span>
                    <span>
                      <strong className="text-blue-700">Access Levels:</strong> Users have access only to this program. 
                      Admins manage all aspects, Managers coordinate activities, Moderators monitor progress.
                    </span>
                  </p>
                </div>
                <div className="p-3 bg-white border-l-4 border-yellow-500 rounded-lg shadow-sm">
                  <p className="text-xs text-gray-700 flex items-start gap-2">
                    <span className="text-base flex-shrink-0">🔑</span>
                    <span>
                      <strong className="text-yellow-700">Credentials:</strong> Use "Reset Password" to generate new credentials. 
                      Original credentials were shown only once during creation.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue mx-auto"></div>
                    <p className="mt-4 text-sm text-gray-600">Loading users...</p>
                  </div>
                </div>
              ) : programUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No program users found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    This program doesn't have any assigned users yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Role</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Created</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programUsers.map((user, index) => {
                        return (
                          <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-4">
                              <p className="font-semibold text-gray-900">{user.name}</p>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">{user.email}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                                user.role === 'program-admin' 
                                  ? 'bg-cyan-50 text-purple-700 border border-purple-200'
                                  : user.role === 'program-manager'
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                  : 'bg-green-100 text-green-700 border border-green-200'
                              }`}>
                                {user.role.replace('program-', '').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                                user.status === 'active' 
                                  ? 'bg-green-100 text-green-700 border border-green-200'
                                  : 'bg-gray-100 text-gray-700 border border-gray-200'
                              }`}>
                                {user.status === 'active' ? (
                                  <CheckCircle className="w-3.5 h-3.5" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5" />
                                )}
                                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-gray-600 text-sm">
                              {new Date(user.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <button
                                onClick={() => handleResetPassword(user.id, user.name)}
                                disabled={resettingPassword === user.id}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow-md"
                                title="Reset password and view new credentials"
                              >
                                {resettingPassword === user.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                                    Resetting...
                                  </>
                                ) : (
                                  <>
                                    🔄 Reset Password
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end flex-shrink-0 bg-gray-50">
              <button
                onClick={() => setShowUsersModal(false)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow"
              >
                <Check className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Credentials Modal */}
      {showResetCredentialsModal && resetCredentials && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8 max-h-[calc(100vh-4rem)] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Password Reset Successful!
                  </h3>
                  <p className="text-sm text-gray-600">
                    New credentials generated for {resetCredentials.name}
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                <p className="text-sm text-red-800 font-medium flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">⚠️</span>
                  <span>
                    <strong>Important:</strong> Save these credentials securely. They will not be shown again!
                  </span>
                </p>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-qsights-light to-cyan-50 border-2 border-blue-200 rounded-lg p-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">User Name</label>
                      <p className="mt-1 text-lg font-bold text-gray-900">{resetCredentials.name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email (Username)</label>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-base font-mono text-gray-900 bg-white px-3 py-2 rounded border border-gray-300 flex-1">
                          {resetCredentials.email}
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(resetCredentials.email);
                            toast({ title: "Copied!", description: "Email copied to clipboard!", variant: "success" });
                          }}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 text-sm font-medium transition-colors"
                          title="Copy email"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">New Password</label>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-lg font-mono font-bold text-green-700 bg-green-50 px-3 py-2 rounded border-2 border-green-300 flex-1">
                          {resetCredentials.password}
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(resetCredentials.password);
                            toast({ title: "Copied!", description: "Password copied to clipboard!", variant: "success" });
                          }}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                          title="Copy password"
                        >
                          📋 Copy
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Role</label>
                      <p className="mt-1">
                        <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-bold ${
                          resetCredentials.role === 'program-admin' 
                            ? 'bg-cyan-50 text-purple-800'
                            : resetCredentials.role === 'program-manager'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {resetCredentials.role.replace('program-', '').toUpperCase()}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>💡 Next Steps:</strong> Share these credentials with the user securely. 
                    They can log in immediately with this email and password.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end flex-shrink-0 bg-gray-50">
              <button
                onClick={() => {
                  const text = `Email: ${resetCredentials.email}\\nPassword: ${resetCredentials.password}\\nRole: ${resetCredentials.role}`;
                  navigator.clipboard.writeText(text);
                  toast({ title: "Copied!", description: "All credentials copied to clipboard!", variant: "success" });
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy All
              </button>
              <button
                onClick={() => {
                  setShowResetCredentialsModal(false);
                  setResetCredentials(null);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" />
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, programId: null, programName: null })}
        onConfirm={confirmDelete}
        title="Delete Program?"
        itemName={deleteModal.programName || undefined}
        itemType="program"
      />
    </RoleBasedLayout>
  );
}
