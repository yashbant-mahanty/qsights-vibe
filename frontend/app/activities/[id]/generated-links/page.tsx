"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      const activityData = await activitiesApi.get(activityId);
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
      
      // Convert to CSV
      const csv = [
        Object.keys(exportData.data[0]).join(","),
        ...exportData.data.map((row: any) => Object.values(row).join(",")),
      ].join("\\n");
      
      // Download
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportData.filename;
      a.click();
      
      toast({ title: "Success!", description: "Links exported successfully", variant: "success" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export links", variant: "error" });
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      unused: { color: "bg-blue-100 text-blue-700", icon: <Clock className="w-3 h-3" /> },
      used: { color: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3 h-3" /> },
      expired: { color: "bg-gray-100 text-gray-700", icon: <XCircle className="w-3 h-3" /> },
      disabled: { color: "bg-red-100 text-red-700", icon: <Ban className="w-3 h-3" /> },
    };

    const { color, icon } = config[status] || config.unused;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredLinks = links.filter((link) => {
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

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Activities
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Generated Links</h1>
              <p className="text-gray-600 mt-1">{activity?.name}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => setShowGenerateForm(!showGenerateForm)}
                className="px-4 py-2 bg-qsights-cyan text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Generate Links
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Links</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
                  </div>
                  <Link2 className="w-8 h-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Unused</p>
                    <p className="text-2xl font-bold text-blue-600">{statistics.unused}</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Used</p>
                    <p className="text-2xl font-bold text-green-600">{statistics.used}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Expired</p>
                    <p className="text-2xl font-bold text-gray-600">{statistics.expired}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Usage</p>
                    <p className="text-2xl font-bold text-qsights-cyan">{statistics.usage_percentage}%</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-qsights-cyan" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Generate Form Modal */}
        {showGenerateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Generate New Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prefix</label>
                  <input
                    type="text"
                    value={generateForm.prefix}
                    onChange={(e) => setGenerateForm({ ...generateForm, prefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min={1}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Count</label>
                  <input
                    type="number"
                    value={generateForm.count}
                    onChange={(e) => setGenerateForm({ ...generateForm, count: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min={1}
                    max={1000}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Group (Optional)</label>
                  <select
                    value={generateForm.group_id}
                    onChange={(e) => setGenerateForm({ ...generateForm, group_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Group 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Link Type</label>
                  <select
                    value={generateForm.link_type}
                    onChange={(e) => setGenerateForm({ ...generateForm, link_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="registration">Registration</option>
                    <option value="anonymous">Anonymous</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowGenerateForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-4 py-2 bg-qsights-cyan text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate"}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by tag or participant..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
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
                className="px-3 py-2 border border-gray-300 rounded-lg"
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
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-qsights-cyan"></div>
                <p className="text-gray-600 mt-4">Loading links...</p>
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="text-center py-12">
                <Link2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No generated links found</p>
                <button
                  onClick={() => setShowGenerateForm(true)}
                  className="mt-4 text-qsights-cyan hover:text-indigo-700"
                >
                  Generate your first batch
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Tag</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Group</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Participant</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Used At</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLinks.map((link) => (
                      <tr key={link.id} className="hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <span className="font-mono font-medium text-gray-900">{link.tag}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">{link.group?.name || "—"}</span>
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
                              {new Date(link.used_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleCopyLink(link.full_url!, link.tag)}
                              className="p-2 text-gray-600 hover:text-qsights-cyan hover:bg-blue-50 rounded-lg"
                              title="Copy Link"
                            >
                              {copiedLink === link.tag ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
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
    </AppLayout>
  );
}
