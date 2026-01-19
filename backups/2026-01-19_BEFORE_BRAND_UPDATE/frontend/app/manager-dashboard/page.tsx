"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  UserCheck,
  TrendingUp,
  Activity,
  Calendar,
  Mail,
  Download,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  BarChart3,
  AlertCircle,
  Bell,
  Eye
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_URL } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import HierarchyTreeModal from "@/components/hierarchy-tree-modal";
import TeamMemberProfileModal from "@/components/team-member-profile-modal";
import SendNotificationModal from "@/components/send-notification-modal";

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  hierarchical_role: string;
  program: {
    id: string;
    name: string;
  };
  status: string;
  activities_completed?: number;
  last_activity?: string;
}

interface TeamStatistics {
  direct_reports: number;
  total_subordinates: number;
  active_users: number;
  inactive_users: number;
  managers_count: number;
  staff_count: number;
}

interface ProgramOption {
  id: string;
  name: string;
}

interface ManagerInfo {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  managed_programs: string[];
  total_team_members: number;
}

export default function ManagerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [statistics, setStatistics] = useState<TeamStatistics | null>(null);
  const [managerInfo, setManagerInfo] = useState<ManagerInfo | null>(null);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [selectedTreeProgram, setSelectedTreeProgram] = useState<{ id: string; name: string } | null>(null);
  
  // New modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  const handleViewProfile = (memberId: number) => {
    setSelectedMemberId(memberId);
    setShowProfileModal(true);
  };

  const handleSendNotification = () => {
    setShowNotificationModal(true);
  };

  useEffect(() => {
    checkManagerAccess();
  }, []);

  useEffect(() => {
    if (managerInfo) {
      loadTeamData();
    }
  }, [selectedProgram, managerInfo]);

  const checkManagerAccess = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        router.push('/dashboard');
        return;
      }

      const data = await response.json();
      const userId = data.user.id;

      // Get manager info and check if user has any managed users
      const headers = getAuthHeaders();
      const managerResponse = await fetch(
        `${API_URL}/hierarchy/users/${userId}/info`,
        { headers, credentials: 'include' }
      );

      const managerData = await managerResponse.json();
      
      if (!managerData.success || !managerData.is_manager) {
        toast({
          title: "Access Denied",
          description: "You don't have manager permissions",
          variant: "error"
        });
        router.push('/dashboard');
        return;
      }

      setManagerInfo({
        user: data.user,
        managed_programs: managerData.managed_programs || [],
        total_team_members: managerData.statistics?.direct_reports || 0
      });

      // Load programs
      await loadPrograms();
      
    } catch (error) {
      console.error('Error checking manager access:', error);
      router.push('/dashboard');
    }
  };

  const loadPrograms = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_URL}/programs`, {
        headers,
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPrograms(data.programs || []);
      }
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  const loadTeamData = async () => {
    if (!managerInfo) return;

    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const params = new URLSearchParams();
      
      if (selectedProgram !== "all") {
        params.append('program_id', selectedProgram);
      }

      const response = await fetch(
        `${API_URL}/hierarchy/managers/${managerInfo.user.id}/team?${params.toString()}`,
        { headers, credentials: 'include' }
      );

      const data = await response.json();

      if (data.success) {
        setTeamMembers(data.team_members || []);
        setStatistics(data.statistics || null);
      } else {
        throw new Error(data.message || 'Failed to load team data');
      }
    } catch (error: any) {
      console.error('Error loading team data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load team data",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadTeamData();
    toast({
      title: "Refreshing...",
      description: "Loading latest team data",
      variant: "default"
    });
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Name', 'Email', 'Role', 'Program', 'Status'],
      ...filteredTeamMembers.map(member => [
        member.name,
        member.email,
        member.hierarchical_role || member.role,
        member.program?.name || 'N/A',
        member.status || 'active'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-members-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success!",
      description: "Team data exported to CSV",
      variant: "success"
    });
  };

  const handleViewHierarchy = (programId: string) => {
    const program = programs.find(p => p.id === programId);
    if (program) {
      setSelectedTreeProgram({ id: program.id, name: program.name });
      setShowTreeModal(true);
    }
  };

  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const kpiCards = [
    {
      title: "Direct Reports",
      value: statistics?.direct_reports || 0,
      icon: Users,
      color: "blue",
      description: "Team members reporting to you"
    },
    {
      title: "Total Team Size",
      value: statistics?.total_subordinates || 0,
      icon: UserCheck,
      color: "green",
      description: "Including indirect reports"
    },
    {
      title: "Active Members",
      value: statistics?.active_users || 0,
      icon: TrendingUp,
      color: "purple",
      description: "Currently active users"
    },
    {
      title: "Sub-Managers",
      value: statistics?.managers_count || 0,
      icon: BarChart3,
      color: "orange",
      description: "Managers in your team"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
              <p className="text-gray-600 mt-1">
                {managerInfo?.user.name} • Managing {statistics?.direct_reports || 0} direct reports
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/team-analytics')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
              <Button
                variant="outline"
                onClick={handleSendNotification}
              >
                <Bell className="w-4 h-4 mr-2" />
                Send Notification
              </Button>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((kpi, index) => {
            const Icon = kpi.icon;
            const colorClasses = {
              blue: 'bg-blue-50 text-blue-600 border-blue-200',
              green: 'bg-green-50 text-green-600 border-green-200',
              purple: 'bg-purple-50 text-purple-600 border-purple-200',
              orange: 'bg-orange-50 text-orange-600 border-orange-200'
            };
            
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${colorClasses[kpi.color as keyof typeof colorClasses]}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{kpi.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
                  <p className="text-xs text-gray-500 mt-2">{kpi.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Program Filter */}
              <div>
                <Label htmlFor="program-filter" className="flex items-center gap-2 mb-2">
                  <Filter className="w-4 h-4" />
                  Filter by Program
                </Label>
                <select
                  id="program-filter"
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="all">All Programs</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div>
                <Label htmlFor="search" className="flex items-center gap-2 mb-2">
                  <Search className="w-4 h-4" />
                  Search Team Members
                </Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* View Hierarchy Button */}
              <div className="flex items-end">
                {selectedProgram !== "all" && (
                  <Button
                    variant="outline"
                    onClick={() => handleViewHierarchy(selectedProgram)}
                    className="w-full"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    View Org Hierarchy
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members Table */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle>Team Members</CardTitle>
              <div className="text-sm text-gray-500">
                {filteredTeamMembers.length} {filteredTeamMembers.length === 1 ? "member" : "members"}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-gray-600">Loading team members...</p>
              </div>
            ) : filteredTeamMembers.length === 0 ? (
              <div className="py-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Members Found</h3>
                <p className="text-gray-600">
                  {searchQuery
                    ? "No members match your search criteria"
                    : selectedProgram !== "all"
                    ? "No team members in this program"
                    : "You don't have any direct reports yet"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeamMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{member.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{member.email}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {member.hierarchical_role || member.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {member.program?.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            member.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {member.status || 'active'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewProfile(member.id)}
                              title="View Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMemberId(member.id);
                                handleSendNotification();
                              }}
                              title="Send Message"
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={handleSendNotification}
              >
                <Mail className="w-6 h-6 text-blue-600" />
                <div className="text-center">
                  <p className="font-semibold">Send Team Notification</p>
                  <p className="text-xs text-gray-500">Notify all team members</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => router.push('/team-analytics')}
              >
                <BarChart3 className="w-6 h-6 text-green-600" />
                <div className="text-center">
                  <p className="font-semibold">View Team Reports</p>
                  <p className="text-xs text-gray-500">Performance analytics</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => {
                  toast({
                    title: "Coming Soon",
                    description: "Activity assignment will be added in Phase 5",
                    variant: "default"
                  });
                }}
              >
                <Calendar className="w-6 h-6 text-purple-600" />
                <div className="text-center">
                  <p className="font-semibold">Assign Activities</p>
                  <p className="text-xs text-gray-500">Create team activities</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hierarchy Tree Modal */}
      {selectedTreeProgram && (
        <HierarchyTreeModal
          isOpen={showTreeModal}
          onClose={() => setShowTreeModal(false)}
          programId={selectedTreeProgram.id}
          programName={selectedTreeProgram.name}
        />
      )}

      {showProfileModal && selectedMemberId && (
        <TeamMemberProfileModal
          memberId={selectedMemberId}
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedMemberId(null);
          }}
        />
      )}

      {showNotificationModal && managerInfo && (
        <SendNotificationModal
          managerId={managerInfo.user.id}
          isOpen={showNotificationModal}
          onClose={() => {
            setShowNotificationModal(false);
            setSelectedMemberId(null);
          }}
          onSuccess={() => {
            toast({
              title: "Success",
              description: "Notification sent successfully",
              variant: "success"
            });
            loadTeamData();
          }}
        />
      )}
    </div>
  );
}
