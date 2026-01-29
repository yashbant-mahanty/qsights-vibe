"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";
import {
  ArrowLeft,
  Plus,
  Copy,
  Check,
  Download,
  Filter,
  BarChart3,
  Link2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Search,
  QrCode,
  Mail,
  CheckSquare,
  Square,
  X,
  Trash2,
  TrendingUp,
  Tag,
  RefreshCw,
} from "lucide-react";
import { generatedLinksApi, type GeneratedEventLink, type GeneratedLinkGroup, activitiesApi } from "@/lib/api";
import { toast } from "@/components/ui/toast";

export default function GeneratedLinksPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;

  const [activity, setActivity] = useState<any>(null);
  const [links, setLinks] = useState<GeneratedEventLink[]>([]);
  const [groups, setGroups] = useState<GeneratedLinkGroup[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selection for email
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk'; linkId?: string; tag?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Generate form
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    prefix: "TAG",
    start_number: 1,
    count: 10,
    group_id: "",
    group_name: "",
    group_description: "",
    link_type: "registration" as "registration" | "anonymous",
  });

  useEffect(() => {
    loadData();
  }, [activityId, statusFilter, groupFilter]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load activity
      const activityData = await activitiesApi.getById(activityId);
      setActivity(activityData);

      // Load links with filters
      const params: any = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (groupFilter !== "all") params.group_id = groupFilter;
      
      const linksData = await generatedLinksApi.getAll(activityId, params);
      setLinks(linksData.data.data || []);
      setStatistics(linksData.statistics);

      // Load groups
      const groupsData = await generatedLinksApi.getGroups(activityId);
      setGroups(groupsData.data || []);
      
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({ title: "Error", description: "Failed to load generated links", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      
      const result = await generatedLinksApi.generate(activityId, generateForm);
      
      toast({
        title: "Success!",
        description: `Generated ${result.data.success_count} links successfully`,
        variant: "success",
      });
      
      setShowGenerateForm(false);
      setGenerateForm({
        prefix: "TAG",
        start_number: 1,
        count: 10,
        group_id: "",
        group_name: "",
        group_description: "",
        link_type: "registration",
      });
      
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate links",
        variant: "error",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = (url: string, tag: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(tag);
    toast({ title: "Copied!", description: `Link ${tag} copied to clipboard`, variant: "success" });
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleExport = async () => {
    try {
      const params: any = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (groupFilter !== "all") params.group_id = groupFilter;
      
      const exportData = await generatedLinksApi.export(activityId, params);
      
      if (!exportData.data || exportData.data.length === 0) {
        toast({ title: "Info", description: "No links to export", variant: "default" });
        return;
      }

      // Get headers from first item
      const headers = Object.keys(exportData.data[0]);
      
      // Convert to CSV with proper row-wise format
      const csvRows = [
        headers.join(","), // Header row
        ...exportData.data.map((row: any) => 
          headers.map(header => {
            const value = row[header] || "";
            // Escape quotes and wrap in quotes if contains comma or newline
            const escaped = String(value).replace(/"/g, '""');
            return escaped.includes(",") || escaped.includes("\n") || escaped.includes('"') 
              ? `"${escaped}"` 
              : escaped;
          }).join(",")
        )
      ];
      
      const csv = csvRows.join("\n");
      
      // Download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({ title: "Success!", description: "Links exported successfully", variant: "success" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export links", variant: "error" });
    }
  };

  // Toggle single link selection
  const toggleLinkSelection = (linkId: string) => {
    const newSelected = new Set(selectedLinks);
    if (newSelected.has(linkId)) {
      newSelected.delete(linkId);
    } else {
      newSelected.add(linkId);
    }
    setSelectedLinks(newSelected);
  };

  // Toggle all links selection
  const toggleAllSelection = () => {
    if (selectedLinks.size === filteredLinks.length) {
      setSelectedLinks(new Set());
    } else {
      setSelectedLinks(new Set(filteredLinks.map(l => l.id)));
    }
  };

  // Handle email sending
  const handleSendEmail = async () => {
    if (!emailAddress.trim()) {
      toast({ title: "Error", description: "Please enter an email address", variant: "error" });
      return;
    }

    if (selectedLinks.size === 0) {
      toast({ title: "Error", description: "Please select at least one link", variant: "error" });
      return;
    }

    try {
      setSendingEmail(true);
      
      const selectedLinkData = filteredLinks.filter(l => selectedLinks.has(l.id));
      
      await generatedLinksApi.emailLinks(activityId, {
        email: emailAddress,
        link_ids: Array.from(selectedLinks),
        activity_name: activity?.name,
      });
      
      toast({ 
        title: "Success!", 
        description: `${selectedLinks.size} link(s) sent to ${emailAddress}`, 
        variant: "success" 
      });
      
      setShowEmailModal(false);
      setEmailAddress("");
      setSelectedLinks(new Set());
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send email", 
        variant: "error" 
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle delete single link
  const handleDeleteClick = (linkId: string, tag: string) => {
    setDeleteTarget({ type: 'single', linkId, tag });
    setShowDeleteModal(true);
  };

  // Handle bulk delete
  const handleBulkDeleteClick = () => {
    setDeleteTarget({ type: 'bulk' });
    setShowDeleteModal(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      
      if (deleteTarget?.type === 'single' && deleteTarget.linkId) {
        await generatedLinksApi.delete(activityId, deleteTarget.linkId);
        toast({ 
          title: "Deleted!", 
          description: `Link ${deleteTarget.tag} has been deleted`, 
          variant: "success" 
        });
      } else if (deleteTarget?.type === 'bulk') {
        // Delete selected links one by one
        const linkIds = Array.from(selectedLinks);
        let successCount = 0;
        let failCount = 0;
        
        for (const linkId of linkIds) {
          try {
            await generatedLinksApi.delete(activityId, linkId);
            successCount++;
          } catch {
            failCount++;
          }
        }
        
        if (failCount > 0) {
          toast({ 
            title: "Partial Delete", 
            description: `Deleted ${successCount} links, ${failCount} failed`, 
            variant: "default" 
          });
        } else {
          toast({ 
            title: "Deleted!", 
            description: `${successCount} link(s) have been deleted`, 
            variant: "success" 
          });
        }
        setSelectedLinks(new Set());
      }
      
      setShowDeleteModal(false);
      setDeleteTarget(null);
      await loadData();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete link(s)", 
        variant: "error" 
      });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      unused: { 
        color: "bg-blue-50 text-blue-700 border border-blue-200", 
        icon: <Clock className="w-3.5 h-3.5" />,
        label: "Unused"
      },
      used: { 
        color: "bg-emerald-50 text-emerald-700 border border-emerald-200", 
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        label: "Used"
      },
      expired: { 
        color: "bg-gray-50 text-gray-600 border border-gray-200", 
        icon: <XCircle className="w-3.5 h-3.5" />,
        label: "Expired"
      },
      disabled: { 
        color: "bg-red-50 text-red-700 border border-red-200", 
        icon: <Ban className="w-3.5 h-3.5" />,
        label: "Disabled"
      },
    };

    const { color, icon, label } = config[status] || config.unused;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
        {icon}
        {label}
      </span>
    );
  };

  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        return (
          link.tag.toLowerCase().includes(search) ||
          link.participant?.name?.toLowerCase().includes(search) ||
          link.participant?.email?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [links, searchQuery]);

  const statsCards = useMemo(() => {
    if (!statistics) return [];
    return [
      {
        title: "Total Links",
        value: statistics.total?.toString() || "0",
        subtitle: `${groups.length} group${groups.length !== 1 ? 's' : ''}`,
        icon: Link2,
        variant: 'purple' as const,
      },
      {
        title: "Unused",
        value: statistics.unused?.toString() || "0",
        subtitle: "Available for use",
        icon: Clock,
        variant: 'blue' as const,
      },
      {
        title: "Used",
        value: statistics.used?.toString() || "0",
        subtitle: "Completed",
        icon: CheckCircle,
        variant: 'green' as const,
      },
      {
        title: "Usage Rate",
        value: `${statistics.usage_percentage || 0}%`,
        subtitle: "Conversion rate",
        icon: TrendingUp,
        variant: 'indigo' as const,
      },
    ];
  }, [statistics, groups]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Generated Links</h1>
              <p className="text-sm text-gray-500 mt-0.5">{activity?.name || "Loading..."}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData()}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => setShowGenerateForm(!showGenerateForm)}
              className="flex items-center gap-2 px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Generate Links
            </button>
          </div>
        </div>

        {/* Statistics Cards - Using GradientStatCard like other pages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl p-5 bg-gray-100 h-32" />
            ))
          ) : (
            statsCards.map((stat, index) => (
              <GradientStatCard
                key={index}
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
                icon={stat.icon}
                variant={stat.variant}
              />
            ))
          )}
        </div>

        {/* Generate Form Modal */}
        {showGenerateForm && (
          <Card className="border-2 border-qsights-cyan/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-qsights-cyan/10 rounded-lg">
                  <Plus className="w-5 h-5 text-qsights-cyan" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Generate New Links</h3>
                  <p className="text-sm text-gray-500">Create unique links for participants</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prefix</label>
                  <input
                    type="text"
                    value={generateForm.prefix}
                    onChange={(e) => setGenerateForm({ ...generateForm, prefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-transparent transition-shadow"
                    placeholder="BQ"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Number</label>
                  <input
                    type="number"
                    value={generateForm.start_number}
                    onChange={(e) => setGenerateForm({ ...generateForm, start_number: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-transparent transition-shadow"
                    min={1}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Count</label>
                  <input
                    type="number"
                    value={generateForm.count}
                    onChange={(e) => setGenerateForm({ ...generateForm, count: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-transparent transition-shadow"
                    min={1}
                    max={1000}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Group (Optional)</label>
                  <select
                    value={generateForm.group_id}
                    onChange={(e) => setGenerateForm({ ...generateForm, group_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-transparent transition-shadow"
                  >
                    <option value="">No Group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Or New Group Name</label>
                  <input
                    type="text"
                    value={generateForm.group_name}
                    onChange={(e) => setGenerateForm({ ...generateForm, group_name: e.target.value, group_id: "" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-transparent transition-shadow"
                    placeholder="Group 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Link Type</label>
                  <select
                    value={generateForm.link_type}
                    onChange={(e) => setGenerateForm({ ...generateForm, link_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-transparent transition-shadow"
                  >
                    <option value="registration">Registration</option>
                    <option value="anonymous">Anonymous</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowGenerateForm(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 bg-qsights-cyan text-white rounded-lg hover:bg-qsights-cyan/90 disabled:opacity-50 transition-colors"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters & Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by tag or participant..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-transparent transition-shadow"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-transparent transition-shadow text-gray-700"
              >
                <option value="all">All Status</option>
                <option value="unused">Unused</option>
                <option value="used">Used</option>
                <option value="expired">Expired</option>
                <option value="disabled">Disabled</option>
              </select>

              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-transparent transition-shadow text-gray-700"
              >
                <option value="all">All Groups</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Links Table */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 text-qsights-cyan animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading links...</p>
                </div>
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  <Link2 className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No generated links found</h3>
                <p className="text-gray-500 mb-4">Get started by generating your first batch of links</p>
                <button
                  onClick={() => setShowGenerateForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-qsights-cyan text-white rounded-lg hover:bg-qsights-cyan/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Generate Links
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Selection actions bar */}
                {selectedLinks.size > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-5 h-5 text-qsights-cyan" />
                      <span className="text-sm font-medium text-gray-700">
                        {selectedLinks.size} link{selectedLinks.size !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowEmailModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        Email Selected
                      </button>
                      <button
                        onClick={handleBulkDeleteClick}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Selected
                      </button>
                      <button
                        onClick={() => setSelectedLinks(new Set())}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
                
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 px-4 w-12">
                        <button
                          onClick={toggleAllSelection}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          title={selectedLinks.size === filteredLinks.length ? "Deselect all" : "Select all"}
                        >
                          {selectedLinks.size === filteredLinks.length && filteredLinks.length > 0 ? (
                            <CheckSquare className="w-5 h-5 text-qsights-cyan" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tag</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Group</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Participant</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Used At</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLinks.map((link) => (
                      <tr 
                        key={link.id} 
                        className={`hover:bg-gray-50 transition-colors ${selectedLinks.has(link.id) ? 'bg-blue-50/50' : ''}`}
                      >
                        <td className="py-4 px-4">
                          <button
                            onClick={() => toggleLinkSelection(link.id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            {selectedLinks.has(link.id) ? (
                              <CheckSquare className="w-5 h-5 text-qsights-cyan" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-gray-400" />
                            <span className="font-mono font-semibold text-gray-900">{link.tag}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {link.group?.name ? (
                            <span className="inline-flex items-center px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                              {link.group.name}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4">{getStatusBadge(link.status)}</td>
                        <td className="py-4 px-4">
                          {link.participant ? (
                            <div>
                              <p className="text-sm font-medium text-gray-900">{link.participant.name}</p>
                              <p className="text-xs text-gray-500">{link.participant.email}</p>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {link.used_at ? (
                            <span className="text-sm text-gray-600">
                              {new Date(link.used_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleCopyLink(link.full_url!, link.tag)}
                              className="p-2 text-gray-500 hover:text-qsights-cyan hover:bg-blue-50 rounded-lg transition-colors"
                              title="Copy Link"
                            >
                              {copiedLink === link.tag ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteClick(link.id, link.tag)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Link"
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-qsights-cyan/5 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-qsights-cyan/10 rounded-lg">
                    <Mail className="w-5 h-5 text-qsights-cyan" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Email Selected Links</h2>
                </div>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-qsights-cyan focus:border-transparent transition-shadow"
                />
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Sending <span className="font-semibold text-gray-900">{selectedLinks.size}</span> link{selectedLinks.size !== 1 ? 's' : ''}:
                </p>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Tag</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Group</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLinks.filter(l => selectedLinks.has(l.id)).map((link) => (
                        <tr key={link.id}>
                          <td className="py-3 px-4 font-mono font-medium text-gray-900">{link.tag}</td>
                          <td className="py-3 px-4 text-gray-600">{link.group?.name || '—'}</td>
                          <td className="py-3 px-4">{getStatusBadge(link.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-5 py-2.5 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailAddress.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-qsights-cyan text-white rounded-xl hover:bg-qsights-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {sendingEmail ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Confirm Delete</h2>
                </div>
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {deleteTarget?.type === 'single' ? (
                <p className="text-gray-600">
                  Are you sure you want to delete link <span className="font-mono font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{deleteTarget.tag}</span>? 
                  This action cannot be undone.
                </p>
              ) : (
                <div>
                  <p className="text-gray-600 mb-4">
                    Are you sure you want to delete <span className="font-semibold text-gray-900">{selectedLinks.size}</span> selected link{selectedLinks.size !== 1 ? 's' : ''}? 
                    This action cannot be undone.
                  </p>
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-xl p-3">
                    <div className="flex flex-wrap gap-2">
                      {filteredLinks.filter(l => selectedLinks.has(l.id)).map((link) => (
                        <span key={link.id} className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-mono text-gray-700">
                          {link.tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                className="px-5 py-2.5 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
