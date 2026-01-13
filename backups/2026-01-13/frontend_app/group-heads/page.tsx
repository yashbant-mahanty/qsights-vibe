"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";
import { hasFullAccess, UserRole } from "@/lib/permissions";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Filter,
  Download,
  UserCog,
  Users,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
  Upload,
  X as XIcon,
} from "lucide-react";
import { groupHeadsApi, type GroupHead } from "@/lib/api";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { toast } from "@/components/ui/toast";

export default function GroupHeadsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedOrganization, setSelectedOrganization] = useState("all");
  const [groupHeads, setGroupHeads] = useState<GroupHead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGroupHead, setSelectedGroupHead] = useState<GroupHead | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization_id: '',
    department: '',
    designation: '',
    status: 'active' as 'active' | 'inactive',
    logo: null as File | null,
  });
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; groupHeadId: string | null; groupHeadName: string | null }>({ isOpen: false, groupHeadId: null, groupHeadName: null });

  // Check if user has access to this page
  useEffect(() => {
    async function checkAccess() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          const userRole = data.user?.role as UserRole;
          if (!hasFullAccess(userRole)) {
            router.push('/dashboard');
          }
        }
      } catch (error) {
        console.error('Error checking access:', error);
      }
    }
    checkAccess();
  }, [router]);

  useEffect(() => {
    loadGroupHeads();
    loadOrganizations();

    // Listen for global search events
    const handleGlobalSearch = (e: CustomEvent) => {
      if (e.detail.pathname === '/group-heads') {
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

  async function loadGroupHeads() {
    try {
      setLoading(true);
      setError(null);
      const data = await groupHeadsApi.getAll();
      setGroupHeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load group heads');
      console.error('Error loading group heads:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadOrganizations() {
    try {
      const { organizationsApi } = await import('@/lib/api');
      const data = await organizationsApi.getAll();
      setOrganizations(data);
    } catch (err) {
      console.error('Error loading organizations:', err);
    }
  }

  function handleEdit(gh: GroupHead) {
    setSelectedGroupHead(gh);
    setEditFormData({
      name: gh.user?.name || '',
      email: gh.user?.email || '',
      phone: gh.phone || '',
      organization_id: gh.organization_id,
      department: gh.department || '',
      designation: gh.designation || '',
      status: gh.status,
      logo: null,
    });
    // Set existing logo preview
    if (gh.logo) {
      setEditLogoPreview(gh.logo.startsWith('http') ? gh.logo : `/storage/${gh.logo}`);
    } else {
      setEditLogoPreview(null);
    }
    setShowEditModal(true);
  }

  const handleEditLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "warning",
        });
        return;
      }
      
      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image must be less than 2MB",
          variant: "warning",
        });
        return;
      }
      
      setEditFormData(prev => ({ ...prev, logo: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeEditLogo = () => {
    setEditFormData(prev => ({ ...prev, logo: null }));
    setEditLogoPreview(null);
  };

  async function handleSaveEdit() {
    if (!selectedGroupHead) return;
    try {
      // Create FormData for multipart upload
      const submitData = new FormData();
      submitData.append('name', editFormData.name);
      submitData.append('email', editFormData.email);
      submitData.append('phone', editFormData.phone);
      submitData.append('organization_id', editFormData.organization_id);
      submitData.append('department', editFormData.department);
      submitData.append('designation', editFormData.designation);
      submitData.append('status', editFormData.status);
      
      if (editFormData.logo) {
        submitData.append('logo', editFormData.logo);
      }

      // Send to API
      const response = await fetch(`/api/group-heads/${selectedGroupHead.id}`, {
        method: 'PUT',
        body: submitData,
      });

      if (!response.ok) {
        throw new Error('Failed to update group head');
      }

      await loadGroupHeads();
      setShowEditModal(false);
      setSelectedGroupHead(null);
      setEditLogoPreview(null);
      toast({
        title: "Success",
        description: "Group Head updated successfully!",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: 'Failed to update group head: ' + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error",
      });
    }
  }

  function handleDelete(gh: GroupHead) {
    setDeleteModal({ isOpen: true, groupHeadId: gh.id, groupHeadName: gh.user?.name || 'this group head' });
  }

  async function confirmDelete() {
    if (!deleteModal.groupHeadId) return;
    
    try {
      await groupHeadsApi.delete(deleteModal.groupHeadId);
      await loadGroupHeads();
    } catch (err) {
      toast({
        title: "Error",
        description: 'Failed to delete group head: ' + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error"
      });
    }
  }

  // Mock data removed - using only real API data

  const groupHeads_display = groupHeads.map(gh => ({
    id: gh.id,
    name: gh.user?.name || 'N/A',
    email: gh.user?.email || 'N/A',
    organization: gh.organization?.name || "N/A",
    organizationCode: gh.organization?.id ? String(gh.organization.id) : (gh.organization_id ? String(gh.organization_id) : "N/A") || "N/A",
    department: gh.department || "N/A",
    programs: gh.programs_count || 0,
    participants: (gh as any).participants_count || 0,
    activeParticipants: (gh as any).active_participants_count || 0,
    inactiveParticipants: (gh as any).inactive_participants_count || 0,
    authenticatedParticipants: ((gh as any).active_participants_count || 0) + ((gh as any).inactive_participants_count || 0),
    guestParticipants: (gh as any).guest_participants_count || 0,
    status: gh.status,
    logo: gh.logo,
    createdDate: new Date(gh.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    lastActive: new Date(gh.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
  }));

  const stats = [
    {
      title: "Total Group Heads",
      value: groupHeads_display.length,
      icon: UserCog,
      variant: 'blue' as const,
    },
    {
      title: "Active",
      value: groupHeads_display.filter((g) => g.status === "active").length,
      icon: CheckCircle,
      variant: 'green' as const,
    },
    {
      title: "Inactive",
      value: groupHeads_display.filter((g) => g.status === "inactive").length,
      icon: XCircle,
      variant: 'red' as const,
    },
    {
      title: "Total Participants",
      value: `${groupHeads_display.reduce((sum, g) => sum + g.authenticatedParticipants + g.guestParticipants, 0)} (${groupHeads_display.reduce((sum, g) => sum + g.authenticatedParticipants, 0)}/${groupHeads_display.reduce((sum, g) => sum + g.guestParticipants, 0)})`,
      subtitle: "(Participant/Anonymous)",
      icon: Users,
      variant: 'purple' as const,
    },
  ];

  const organizationNames = Array.from(
    new Set(groupHeads_display.map((g) => g.organization))
  );

  const filteredGroupHeads = groupHeads_display.filter((groupHead) => {
    const matchesSearch =
      (groupHead.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (groupHead.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (groupHead.organization || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (groupHead.department || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || groupHead.status === selectedStatus;
    const matchesOrganization =
      selectedOrganization === "all" ||
      groupHead.organization === selectedOrganization;
    return matchesSearch && matchesStatus && matchesOrganization;
  });

  const totalPages = Math.ceil(filteredGroupHeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentGroupHeads = filteredGroupHeads.slice(startIndex, endIndex);

  const getStatusColor = (status: string) => {
    return status === "active"
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700";
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading group heads...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-semibold">{error}</p>
            <button 
              onClick={loadGroupHeads}
              className="mt-4 px-4 py-2 bg-qsights-blue text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Group Heads</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage group heads and their programs
            </p>
          </div>
          <a
            href="/group-heads/create"
            className="flex items-center gap-2 px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Group Head
          </a>
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

        {/* Group Heads Table */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="text-lg font-bold">Group Head List</CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {/* Search */}
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg flex-1 sm:flex-initial sm:w-64">
                  <Search className="w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search group heads..."
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Group Head
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Organization
                    </th>
                    {/* <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Department
                    </th> */}
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Programs
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Participants
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
                  {currentGroupHeads.map((groupHead) => (
                    <tr
                      key={groupHead.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600">
                            {groupHead.logo ? (
                              <img
                                src={groupHead.logo.startsWith('http') ? groupHead.logo : `/storage/${groupHead.logo}`}
                                alt={groupHead.name || 'Group Head'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-bold text-sm">
                                {(groupHead.name || 'N')
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-semibold text-gray-900">
                              {groupHead.name || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {groupHead.email || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {groupHead.organization}
                            </p>
                            <p className="text-xs text-gray-500">
                              {groupHead.organizationCode}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {groupHead.department}
                        </span>
                      </td> */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {groupHead.programs}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {groupHead.authenticatedParticipants + groupHead.guestParticipants}
                        </div>
                        <div className="text-xs text-gray-500">
                          ({groupHead.authenticatedParticipants}/{groupHead.guestParticipants})
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            groupHead.status
                          )}`}
                        >
                          {groupHead.status.charAt(0).toUpperCase() +
                            groupHead.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {groupHead.lastActive}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/group-heads/${groupHead.id}`)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(groupHeads.find(g => g.id === groupHead.id)!)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title={groupHead.status === "active" ? "Deactivate" : "Activate"}
                          >
                            {groupHead.status === "active" ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(groupHeads.find(g => g.id === groupHead.id)!)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                  {Math.min(endIndex, filteredGroupHeads.length)} of{" "}
                  {filteredGroupHeads.length} group heads
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
                              ? "bg-qsights-blue text-white"
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

      {/* Edit Group Head Modal */}
      {showEditModal && selectedGroupHead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Edit Group Head</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-qsights-blue" />
                  Personal Information
                </h4>
                <div className="space-y-4 pl-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      placeholder="Enter name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      placeholder="email@example.com"
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

                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Profile Logo
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      {editLogoPreview ? (
                        <div className="flex items-center gap-4">
                          <img
                            src={editLogoPreview}
                            alt="Logo preview"
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">
                              {editFormData.logo?.name || 'Current logo'}
                            </p>
                            {editFormData.logo && (
                              <p className="text-xs text-gray-500">
                                {(editFormData.logo.size / 1024).toFixed(1)} KB
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={removeEditLogo}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <XIcon className="w-5 h-5 text-red-500" />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="edit-logo" className="flex flex-col items-center gap-2 cursor-pointer">
                          <Upload className="w-8 h-8 text-gray-400" />
                          <span className="text-sm text-gray-600">Click to upload logo</span>
                          <span className="text-xs text-gray-500">PNG, JPG, GIF, WEBP up to 2MB</span>
                          <input
                            id="edit-logo"
                            type="file"
                            accept="image/*"
                            onChange={handleEditLogoChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Organization Details Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-qsights-blue" />
                  Organization Details
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
                      Department
                    </label>
                    <input
                      type="text"
                      value={editFormData.department}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      placeholder="e.g., Engineering, Sales, Operations"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={editFormData.designation}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, designation: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      placeholder="e.g., Senior Manager, Director"
                    />
                  </div>
                </div>
              </div>

              {/* Status Section */}
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
                disabled={!editFormData.name || !editFormData.email || !editFormData.organization_id}
                className="px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, groupHeadId: null, groupHeadName: null })}
        onConfirm={confirmDelete}
        title="Delete Group Head?"
        itemName={deleteModal.groupHeadName || undefined}
        itemType="group head"
      />
    </AppLayout>
  );
}
