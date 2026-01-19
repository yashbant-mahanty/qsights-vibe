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
  Building2,
  Users,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { organizationsApi, type Organization } from "@/lib/api";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { toast } from "@/components/ui/toast";

export default function OrganizationsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    description: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    status: 'active' as 'active' | 'inactive',
    logoUrl: '',
    code: '',
  });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; orgId: string | null; orgName: string | null }>({ isOpen: false, orgId: null, orgName: null });

  // Check if user has access to this page
  useEffect(() => {
    async function checkAccess() {
      try {
        const response = await fetch('/api/auth/me');
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
    loadOrganizations();

    // Listen for global search events
    const handleGlobalSearch = (e: CustomEvent) => {
      if (e.detail.pathname === '/organizations') {
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

  async function loadOrganizations() {
    try {
      setLoading(true);
      setError(null);
      const data = await organizationsApi.getAll();
      console.log('Loaded organizations from API:', data);
      console.log('First org logo:', data[0]?.logo);
      console.log('Second org logo:', data[1]?.logo);
      setOrganizations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
      console.error('Error loading organizations:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(org: Organization) {
    setSelectedOrg(org);
    setEditFormData({
      name: org.name,
      email: org.email || '',
      description: org.description || '',
      phone: org.phone || '',
      website: org.website || '',
      address: org.address || '',
      city: org.city || '',
      state: org.state || '',
      postal_code: org.postal_code || '',
      country: org.country || '',
      status: org.status,
      logoUrl: org.logo || '',
      code: '',
    });
    setShowEditModal(true);
  }

  async function handleSaveEdit() {
    if (!selectedOrg) return;
    try {
      const { logoUrl, code, ...orgData } = editFormData;
      console.log('logoUrl from form:', logoUrl);
      const updateData: Partial<Organization> = {
        ...orgData,
        ...(logoUrl && { logo: logoUrl }),
      };
      console.log('Saving organization with data:', updateData);
      console.log('Logo property in updateData:', updateData.logo);
      const response = await organizationsApi.update(selectedOrg.id, updateData);
      console.log('Organization update response:', response);
      console.log('Logo in response:', response.logo);
      await loadOrganizations();
      setShowEditModal(false);
      setSelectedOrg(null);
      toast({
        title: "Success",
        description: 'Organization updated successfully',
        variant: "success"
      });
    } catch (err) {
      console.error('Error updating organization:', err);
      toast({
        title: "Error",
        description: 'Failed to update organization: ' + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error"
      });
    }
  }

  async function handleToggleStatus(org: Organization) {
    try {
      if (org.status === 'active') {
        await organizationsApi.deactivate(org.id);
      } else {
        await organizationsApi.activate(org.id);
      }
      await loadOrganizations();
    } catch (err) {
      toast({
        title: "Error",
        description: 'Failed to update status: ' + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error"
      });
    }
  }

  function handleDelete(org: Organization) {
    setDeleteModal({ isOpen: true, orgId: org.id, orgName: org.name });
  }

  async function confirmDelete() {
    if (!deleteModal.orgId) return;
    
    try {
      await organizationsApi.delete(deleteModal.orgId);
      await loadOrganizations();
    } catch (err) {
      toast({
        title: "Error",
        description: 'Failed to delete organization: ' + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error"
      });
    }
  }

  const organizations_display = organizations.map(org => {
    // Use total_authenticated_count if available, otherwise fall back to active + inactive
    const authenticatedParticipants = org.total_authenticated_count !== undefined 
      ? org.total_authenticated_count 
      : (org.active_participants_count || 0) + (org.inactive_participants_count || 0);
    const guestParticipants = org.guest_participants_count || 0;
    const totalParticipants = authenticatedParticipants + guestParticipants;
    
    return {
      id: org.id,
      name: org.name,
      code: String(org.id).padStart(8, '0'),
      industry: 'N/A',
      activeParticipants: org.active_participants_count || 0,
      inactiveParticipants: org.inactive_participants_count || 0,
      authenticatedParticipants,
      guestParticipants,
      totalParticipants,
      groupHeads: (org.group_heads_count || 0),
      programs: (org.programs_count || 0),
      status: org.status,
      logo: org.logo,
      createdDate: new Date(org.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      lastActive: new Date(org.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    };
  });  const totalAuthenticated = organizations_display.reduce((sum, o) => sum + o.authenticatedParticipants, 0);
  const totalGuest = organizations_display.reduce((sum, o) => sum + o.guestParticipants, 0);
  const grandTotal = totalAuthenticated + totalGuest;
  const activeOrgsCount = organizations_display.filter((o) => o.status === "active").length;
  const inactiveOrgsCount = organizations_display.filter((o) => o.status === "inactive").length;

  const stats = [
    {
      title: "Total Organizations",
      value: organizations_display.length,
      subtitle: `${activeOrgsCount} active`,
      icon: Building2,
      variant: 'blue' as const,
    },
    {
      title: "Active",
      value: activeOrgsCount,
      subtitle: organizations_display.length > 0 ? `${Math.round((activeOrgsCount/organizations_display.length)*100)}% of total` : "0% of total",
      icon: CheckCircle,
      variant: 'green' as const,
    },
    {
      title: "Inactive",
      value: inactiveOrgsCount,
      subtitle: organizations_display.length > 0 ? `${Math.round((inactiveOrgsCount/organizations_display.length)*100)}% of total` : "0% of total",
      icon: XCircle,
      variant: 'red' as const,
    },
    {
      title: "Total Participants",
      value: `${grandTotal.toLocaleString()} (${totalAuthenticated.toLocaleString()}/${totalGuest.toLocaleString()})`,
      subtitle: "(Participant/Anonymous)",
      icon: Users,
      variant: 'purple' as const,
    },
  ];

  const filteredOrganizations = organizations_display.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.industry.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || org.status === selectedStatus;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // Sort by latest first (updated_at or created_at)
    const dateA = new Date(a.lastActive || 0).getTime();
    const dateB = new Date(b.lastActive || 0).getTime();
    return dateB - dateA;
  });

  const totalPages = Math.ceil(filteredOrganizations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrganizations = filteredOrganizations.slice(startIndex, endIndex);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading organizations...</p>
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
              onClick={loadOrganizations}
              className="mt-4 px-4 py-2 bg-qsights-blue text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const getStatusColor = (status: string) => {
    return status === "active"
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and monitor all organizations
            </p>
          </div>
          <a
            href="/organizations/create"
            className="flex items-center gap-2 px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Organization
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

        {/* Organizations Table */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="text-lg font-bold">
                Organization List
              </CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Search */}
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg flex-1 sm:flex-initial sm:w-64">
                  <Search className="w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search organizations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-none outline-none text-sm w-full bg-transparent"
                  />
                </div>
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
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Code
                    </th>
                    {/* <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Industry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Employees
                    </th> */}
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Group Heads
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
                  {currentOrganizations.map((org) => (
                    <tr
                      key={org.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-qsights-blue rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                            {org.logo ? (
                              <img src={org.logo} alt={org.name} className="w-full h-full object-cover" />
                            ) : (
                              org.code.slice(0, 2)
                            )}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-semibold text-gray-900">
                              {org.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Created: {org.createdDate}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {org.code}
                        </span>
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {org.industry}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {org.employees.toLocaleString()}
                        </span>
                      </td> */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {org.groupHeads}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {org.programs}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            org.status
                          )}`}
                        >
                          {org.status.charAt(0).toUpperCase() +
                            org.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {org.lastActive}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/organizations/${org.id}`)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(organizations.find(o => o.id === org.id)!)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(organizations.find(o => o.id === org.id)!)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title={org.status === "active" ? "Deactivate" : "Activate"}
                          >
                            {org.status === "active" ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(organizations.find(o => o.id === org.id)!)}
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
                  {Math.min(endIndex, filteredOrganizations.length)} of{" "}
                  {filteredOrganizations.length} organizations
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

      {/* Edit Organization Modal */}
      {showEditModal && selectedOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Edit Organization</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Basic Information</h4>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Organization Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                    placeholder="Enter organization name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Organization Code
                  </label>
                  <input
                    type="text"
                    value={editFormData.code || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                    placeholder="e.g., TS001"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={editFormData.description || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                    rows={3}
                    placeholder="Organization description"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Contact Information</h4>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                    placeholder="contact@organization.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <input
                    type="url"
                    value={editFormData.website || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                    placeholder="https://organization.com"
                  />
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Address</h4>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={editFormData.address || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">City</label>
                    <input
                      type="text"
                      value={editFormData.city || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">State</label>
                    <input
                      type="text"
                      value={editFormData.state || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      placeholder="State"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Postal Code</label>
                    <input
                      type="text"
                      value={editFormData.postal_code || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      placeholder="12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Country</label>
                    <input
                      type="text"
                      value={editFormData.country || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Logo URL */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Organization Logo</h4>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
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
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editFormData.name || !editFormData.email}
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
        onClose={() => setDeleteModal({ isOpen: false, orgId: null, orgName: null })}
        onConfirm={confirmDelete}
        title="Delete Organization?"
        itemName={deleteModal.orgName || undefined}
        itemType="organization"
      />
    </AppLayout>
  );
}
