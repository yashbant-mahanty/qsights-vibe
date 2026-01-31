"use client";
// Version: 2.0 - Fixed UUID routing for default users vs custom roles

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProgramAdminLayout from "@/components/program-admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Eye, EyeOff, RefreshCw, Filter, Users, UserCog, Network, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_URL } from "@/lib/api";
import ManagerAssignmentModal from "@/components/manager-assignment-modal";
import HierarchyTreeModal from "@/components/hierarchy-tree-modal";
import HierarchyMappingModal from "@/components/hierarchy-mapping-modal";

// Predefined list of services
const AVAILABLE_SERVICES = [
  { id: "dashboard", name: "Dashboard", category: "Overview" },
  { id: "list_organization", name: "List Organizations", category: "Organizations" },
  { id: "add_organization", name: "Add Organization", category: "Organizations" },
  { id: "edit_organization", name: "Edit Organization", category: "Organizations" },
  { id: "list_programs", name: "List Programs", category: "Programs" },
  { id: "add_programs", name: "Add Programs", category: "Programs" },
  { id: "edit_programs", name: "Edit Programs", category: "Programs" },
  { id: "list_activity", name: "List Events", category: "Events" },
  { id: "activity_add", name: "Add Event", category: "Events" },
  { id: "add_participants", name: "Add Participants", category: "Participants" },
  { id: "list_participants", name: "List Participants", category: "Participants" },
  { id: "view_report", name: "View Reports", category: "Reports" },
];

interface Role {
  id: string;
  role_name: string;
  username: string;
  email: string;
  program_id: string;
  created_at: string;
  is_default_user?: boolean; // true if from /users endpoint (integer ID), false if from /roles endpoint (UUID)
  program?: {
    id: string;
    name: string;
  };
}

interface ProgramOption {
  id: string;
  name: string;
}

function RolesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"program-users" | "system-roles" | "hierarchy-mapping">("program-users");
  const [showForm, setShowForm] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [editSelectedServices, setEditSelectedServices] = useState<string[]>([]);
  const [programId, setProgramId] = useState<string>("");
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>("all");
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [createFormProgramId, setCreateFormProgramId] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Hierarchy modal states
  const [managerAssignmentModal, setManagerAssignmentModal] = useState(false);
  const [hierarchyTreeModal, setHierarchyTreeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string; programId: string; programName: string } | null>(null);
  const [treeViewProgramId, setTreeViewProgramId] = useState<string>("");
  const [treeViewProgramName, setTreeViewProgramName] = useState<string>("");

  // Hierarchy Mapping states
  const [mappingStep, setMappingStep] = useState<number>(1);
  const [mappingProgramId, setMappingProgramId] = useState<string>("");
  const [mappingParentRoleId, setMappingParentRoleId] = useState<string>("");
  const [mappingParentUserId, setMappingParentUserId] = useState<string>("");
  const [mappingChildRoleId, setMappingChildRoleId] = useState<string>("");
  const [mappingChildUserIds, setMappingChildUserIds] = useState<string[]>([]);
  const [availableParentUsers, setAvailableParentUsers] = useState<Role[]>([]);
  const [availableChildUsers, setAvailableChildUsers] = useState<Role[]>([]);
  const [hierarchyMappings, setHierarchyMappings] = useState<any[]>([]);

  // Fetch roles on mount and when tab changes
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Fetch user data first
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
          console.log('🔍 User loaded for roles page:', { role: data.user.role, programId: data.user.programId });
          
          // CRITICAL: Only program-admin and super-admin can access Roles & Services
          if (!['super-admin', 'program-admin'].includes(data.user.role)) {
            console.warn('⚠️ Unauthorized access attempt to Roles page by:', data.user.role);
            window.location.href = data.user.role === 'program-manager' ? '/program-manager' : '/dashboard';
            return;
          }
          
          // If not super-admin and trying to access system-roles, redirect to program-users
          if (data.user.role !== 'super-admin' && activeTab === 'system-roles') {
            setActiveTab('program-users');
            return;
          }
          
          // Now load data with user context available
          await loadProgramsWithUser(data.user);
          await loadRolesWithUser(data.user);
        }
      } catch (error) {
        console.error('Error initializing roles page:', error);
      }
    };
    
    initializeData();
    
    // Load hierarchy mappings when on hierarchy-mapping tab
    if (activeTab === 'hierarchy-mapping') {
      loadHierarchyMappings();
    }
  }, [activeTab]);

  const checkUserRole = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        
        // If not super-admin and trying to access system-roles, redirect to program-users
        if (data.user.role !== 'super-admin' && activeTab === 'system-roles') {
          setActiveTab('program-users');
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  // Handle query parameters
  useEffect(() => {
    const programIdFromQuery = searchParams.get('programId');
    if (programIdFromQuery) {
      setSelectedProgramFilter(programIdFromQuery);
    }
  }, [searchParams]);

  // Filter roles when program filter changes
  useEffect(() => {
    if (selectedProgramFilter === "all") {
      setRoles(allRoles);
    } else {
      setRoles(allRoles.filter(role => role.program_id === selectedProgramFilter));
    }
    setCurrentPage(1); // Reset to first page when filter changes
  }, [selectedProgramFilter, allRoles]);

  // Pagination calculations
  const totalPages = Math.ceil(roles.length / itemsPerPage);
  const paginatedRoles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return roles.slice(startIndex, startIndex + itemsPerPage);
  }, [roles, currentPage, itemsPerPage]);

  const getAuthHeaders = () => {
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(c => c.trim().startsWith('backendToken='));
    if (!tokenCookie) {
      throw new Error('Not authenticated');
    }
    const token = decodeURIComponent(tokenCookie.split('=')[1]);
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  };

  const getProgramId = () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    return user?.programId || 'a0a77496-0fc0-4627-ba5b-9a1ea026623f';
  };

  const loadProgramsWithUser = async (user: any) => {
    try {
      const headers = getAuthHeaders();
      
      // Check user role and programId
      let url = `${API_URL}/programs`;
      if (user && user.programId && ['program-admin', 'program-manager', 'program-moderator'].includes(user.role)) {
        url = `${API_URL}/programs?program_id=${user.programId}`;
        console.log('🔍 Fetching programs with filter:', url);
      }
      
      const response = await fetch(url, {
        headers,
        credentials: 'include',
      });

      console.log('Programs response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Programs data:', data);
        // Handle both array and object with programs property
        const programsList = Array.isArray(data) ? data : (data.programs || data.data || []);
        console.log('✅ Programs list loaded:', programsList.length, 'programs');
        setPrograms(programsList);
      } else {
        console.error('Failed to load programs:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  const loadPrograms = async () => {
    try {
      const headers = getAuthHeaders();
      
      // Check user role and programId
      let url = `${API_URL}/programs`;
      if (currentUser && currentUser.programId && ['program-admin', 'program-manager', 'program-moderator'].includes(currentUser.role)) {
        url = `${API_URL}/programs?program_id=${currentUser.programId}`;
      }
      
      const response = await fetch(url, {
        headers,
        credentials: 'include',
      });

      console.log('Programs response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Programs data:', data);
        // Handle both array and object with programs property
        const programsList = Array.isArray(data) ? data : (data.programs || data.data || []);
        console.log('Programs list:', programsList);
        setPrograms(programsList);
      } else {
        console.error('Failed to load programs:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  const loadRolesWithUser = async (user: any) => {
    try {
      setLoadingRoles(true);
      const headers = getAuthHeaders();
      
      // Fetch programs (filtered by user's program for program roles)
      let programsUrl = `${API_URL}/programs`;
      if (user && user.programId && ['program-admin', 'program-manager', 'program-moderator'].includes(user.role)) {
        programsUrl = `${API_URL}/programs?program_id=${user.programId}`;
        console.log('🔍 Fetching programs for roles with filter:', programsUrl);
      }
      
      const programsResponse = await fetch(programsUrl, {
        headers,
        credentials: 'include',
      });

      console.log('Programs response for roles:', programsResponse.status);

      if (!programsResponse.ok) {
        throw new Error('Failed to fetch programs');
      }

      const programsData = await programsResponse.json();
      console.log('Programs data for roles:', programsData);
      
      // Handle both array and object with programs property
      const allPrograms = Array.isArray(programsData) ? programsData : (programsData.programs || programsData.data || []);
      console.log('✅ Programs for roles loaded:', allPrograms.length, 'programs');

      // Fetch roles based on active tab
      let allRoles: Role[] = [];
      
      if (activeTab === 'system-roles') {
        // For system roles, fetch from /system-roles endpoint (no program association)
        try {
          const systemRolesResponse = await fetch(`${API_URL}/system-roles`, {
            headers,
            credentials: 'include',
          });

          if (systemRolesResponse.ok) {
            const systemRolesData = await systemRolesResponse.json();
            const rolesList = Array.isArray(systemRolesData) ? systemRolesData : (systemRolesData.roles || systemRolesData.data || []);
            allRoles = rolesList.map((role: any) => ({
              id: role.id,
              role_name: role.role || role.role_name || 'System Role',
              username: role.username || role.name,
              email: role.email,
              program_id: role.program_id || null,
              created_at: role.created_at,
              program: role.program || null
            }));
          }
        } catch (error) {
          console.error('Error loading system roles:', error);
        }
      } else {
        // For program users, fetch from each program
        const rolesPromises = allPrograms.map(async (prog: ProgramOption) => {
          try {
            console.log(`Fetching users and roles for program: ${prog.id}`);
            
            // Fetch both default users AND custom roles
            const [usersResponse, rolesResponse] = await Promise.all([
              fetch(`${API_URL}/programs/${prog.id}/users`, {
                headers,
                credentials: 'include',
              }),
              fetch(`${API_URL}/programs/${prog.id}/roles`, {
                headers,
                credentials: 'include',
              })
            ]);

            console.log(`users response for ${prog.id}:`, usersResponse.status);
            console.log(`roles response for ${prog.id}:`, rolesResponse.status);

            const allProgramRoles = [];

            // Process default users
            if (usersResponse.ok) {
              const usersData = await usersResponse.json();
              console.log(`users data for ${prog.id}:`, usersData);
              const usersList = Array.isArray(usersData) ? usersData : (usersData.users || usersData.data || []);
              const mappedUsers = usersList.map((user: any) => ({
                id: String(user.id),
                role_name: user.role || user.role_name || 'User',
                username: user.username || user.name,
                email: user.email,
                program_id: prog.id,
                created_at: user.created_at,
                is_default_user: true,
                program: { id: prog.id, name: prog.name }
              }));
              allProgramRoles.push(...mappedUsers);
            }

            // Process custom roles
            if (rolesResponse.ok) {
              const rolesData = await rolesResponse.json();
              console.log(`roles data for ${prog.id}:`, rolesData);
              const rolesList = Array.isArray(rolesData) ? rolesData : (rolesData.roles || rolesData.data || []);
              const mappedRoles = rolesList.map((role: any) => ({
                id: role.id,
                role_name: role.role || role.role_name || 'Role',
                username: role.username || role.name,
                email: role.email,
                program_id: prog.id,
                created_at: role.created_at,
                is_default_user: false,
                program: { id: prog.id, name: prog.name }
              }));
              allProgramRoles.push(...mappedRoles);
            }

            return allProgramRoles;
          } catch (error) {
            console.error(`Error loading users/roles for program ${prog.id}:`, error);
            return [];
          }
        });

        const rolesArrays = await Promise.all(rolesPromises);
        allRoles = rolesArrays.flat();
      }

      console.log('✅ All roles loaded:', allRoles.length, 'roles');

      // Apply program filter
      setAllRoles(allRoles);
      setRoles(allRoles);
    } catch (error: any) {
      console.error('Error loading roles:', error);
      if (error.message === 'Not authenticated') {
        window.location.href = '/';
      }
    } finally {
      setLoadingRoles(false);
    }
  };


  const loadRoles = async () => {
    try {
      setLoadingRoles(true);
      const headers = getAuthHeaders();
      
      // Fetch programs (filtered by user's program for program roles)
      let programsUrl = `${API_URL}/programs`;
      if (currentUser && currentUser.programId && ['program-admin', 'program-manager', 'program-moderator'].includes(currentUser.role)) {
        programsUrl = `${API_URL}/programs?program_id=${currentUser.programId}`;
      }
      
      const programsResponse = await fetch(programsUrl, {
        headers,
        credentials: 'include',
      });

      console.log('Programs response for roles:', programsResponse.status);

      if (!programsResponse.ok) {
        throw new Error('Failed to fetch programs');
      }

      const programsData = await programsResponse.json();
      console.log('Programs data for roles:', programsData);
      
      // Handle both array and object with programs property
      const allPrograms = Array.isArray(programsData) ? programsData : (programsData.programs || programsData.data || []);
      console.log('All programs:', allPrograms);

      // Fetch roles based on active tab
      let allRoles: Role[] = [];
      
      if (activeTab === 'system-roles') {
        // For system roles, fetch from /system-roles endpoint (no program association)
        try {
          const systemRolesResponse = await fetch(`${API_URL}/system-roles`, {
            headers,
            credentials: 'include',
          });

          if (systemRolesResponse.ok) {
            const systemRolesData = await systemRolesResponse.json();
            const rolesList = Array.isArray(systemRolesData) ? systemRolesData : (systemRolesData.roles || systemRolesData.data || []);
            allRoles = rolesList.map((role: any) => ({
              id: role.id,
              role_name: role.role || role.role_name || 'System Role',
              username: role.username || role.name,
              email: role.email,
              program_id: role.program_id || null,
              created_at: role.created_at,
              program: role.program || null
            }));
          }
        } catch (error) {
          console.error('Error loading system roles:', error);
        }
      } else {
        // For program users, fetch from each program
        const rolesPromises = allPrograms.map(async (prog: ProgramOption) => {
          try {
            console.log(`Fetching users and roles for program: ${prog.id}`);
            
            // Fetch both default users AND custom roles
            const [usersResponse, rolesResponse] = await Promise.all([
              fetch(`${API_URL}/programs/${prog.id}/users`, {
                headers,
                credentials: 'include',
              }),
              fetch(`${API_URL}/programs/${prog.id}/roles`, {
                headers,
                credentials: 'include',
              })
            ]);

            console.log(`users response for ${prog.id}:`, usersResponse.status);
            console.log(`roles response for ${prog.id}:`, rolesResponse.status);

            const allProgramRoles = [];

            // Process default users
            if (usersResponse.ok) {
              const usersData = await usersResponse.json();
              console.log(`users data for ${prog.id}:`, usersData);
              const usersList = Array.isArray(usersData) ? usersData : (usersData.users || usersData.data || []);
              console.log(`Sample user from /users endpoint:`, usersList[0]);
              const mappedUsers = usersList.map((user: any) => ({
                id: String(user.id), // Convert to string for consistency
                role_name: user.role || user.role_name || 'User',
                username: user.username || user.name,
                email: user.email,
                program_id: prog.id,
                created_at: user.created_at,
                is_default_user: true, // Flag: this is from /users endpoint with integer ID
                program: { id: prog.id, name: prog.name }
              }));
              console.log(`Sample mapped user:`, mappedUsers[0]);
              allProgramRoles.push(...mappedUsers);
            }

            // Process custom roles
            if (rolesResponse.ok) {
              const rolesData = await rolesResponse.json();
              console.log(`roles data for ${prog.id}:`, rolesData);
              const rolesList = Array.isArray(rolesData) ? rolesData : (rolesData.roles || rolesData.data || []);
              console.log(`Sample role from /roles endpoint:`, rolesList[0]);
              const mappedRoles = rolesList.map((role: any) => ({
                id: role.id,
                role_name: role.role || role.role_name || 'Role',
                username: role.username || role.name,
                email: role.email,
                program_id: prog.id,
                created_at: role.created_at,
                is_default_user: false, // Flag: this is from /roles endpoint with UUID
                program: { id: prog.id, name: prog.name }
              }));
              console.log(`Sample mapped role:`, mappedRoles[0]);
              allProgramRoles.push(...mappedRoles);
            }

            return allProgramRoles;
          } catch (error) {
            console.error(`Error loading users/roles for program ${prog.id}:`, error);
            return [];
          }
        });

        const rolesArrays = await Promise.all(rolesPromises);
        allRoles = rolesArrays.flat();
      }

      console.log('All roles loaded:', allRoles);

      // Apply program filter
      setAllRoles(allRoles);
      setRoles(allRoles);
    } catch (error: any) {
      console.error('Error loading roles:', error);
      if (error.message === 'Not authenticated') {
        window.location.href = '/';
      }
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadHierarchyMappings = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_URL}/hierarchy-mappings`, {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch hierarchy mappings');
      }

      const data = await response.json();
      const mappings = Array.isArray(data) ? data : (data.mappings || data.data || []);
      setHierarchyMappings(mappings);
    } catch (error) {
      console.error('Error loading hierarchy mappings:', error);
      toast({
        title: "Error",
        description: "Failed to load hierarchy mappings",
        variant: "error"
      });
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to remove this hierarchy mapping?')) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_URL}/hierarchy-mappings/${mappingId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete mapping');
      }

      toast({
        title: "Success",
        description: "Hierarchy mapping removed successfully",
        variant: "success"
      });

      loadHierarchyMappings();
    } catch (error: any) {
      console.error('Error deleting mapping:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete mapping",
        variant: "error"
      });
    }
  };

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleAutoGeneratePassword = (isEdit = false) => {
    const newPassword = generatePassword();
    if (isEdit) {
      setEditPassword(newPassword);
    } else {
      setPassword(newPassword);
    }
  };

  const handleEdit = async (role: Role) => {
    console.log('=== handleEdit called ===');
    console.log('Role object:', role);
    console.log('Role ID:', role.id, 'Type:', typeof role.id);
    console.log('Program ID:', role.program_id, 'Type:', typeof role.program_id);
    console.log('Is default user:', role.is_default_user);
    
    setEditingRole(role);
    setEditUsername(role.username);
    setEditEmail(role.email);
    setEditPassword(""); // Don't show actual password
    setShowPassword(false);
    setEditSelectedServices([]); // Reset services
    
    // Fetch role details including services
    try {
      const headers = getAuthHeaders();
      let url: string;
      if (activeTab === 'system-roles') {
        url = `${API_URL}/system-roles/${role.id}`;
      } else if (role.is_default_user) {
        // Default program users: use /users endpoint
        url = `${API_URL}/programs/${role.program_id}/users/${role.id}`;
      } else {
        // Custom roles: use /roles endpoint
        url = `${API_URL}/programs/${role.program_id}/roles/${role.id}`;
      }
      console.log('Fetching role from URL:', url);
      
      const response = await fetch(url, {
        headers,
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        const roleData = data.role || data;
        // Set services if available
        if (roleData.services && Array.isArray(roleData.services)) {
          setEditSelectedServices(roleData.services);
        }
      }
    } catch (error) {
      console.error('Error fetching role details:', error);
    }
    
    setShowEditModal(true);
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;

    console.log('=== handleUpdateRole called ===');
    console.log('Editing role:', editingRole);
    console.log('Editing role ID:', editingRole.id, 'Type:', typeof editingRole.id);
    console.log('Program ID:', editingRole.program_id, 'Type:', typeof editingRole.program_id);
    console.log('Is default user:', editingRole.is_default_user);

    try {
      setLoading(true);
      const headers = getAuthHeaders();

      const updateData: any = {
        username: editUsername,
        email: editEmail,
      };

      // Only include password if it's been changed
      if (editPassword) {
        updateData.password = editPassword;
      }
      
      // Include services if any are selected
      if (editSelectedServices.length > 0) {
        updateData.service_ids = editSelectedServices;
      }

      // Determine the correct endpoint based on active tab and user type
      let url: string;
      if (activeTab === 'system-roles') {
        url = `${API_URL}/system-roles/${editingRole.id}`;
      } else if (editingRole.is_default_user) {
        // Default program users: use /users endpoint
        url = `${API_URL}/programs/${editingRole.program_id}/users/${editingRole.id}`;
      } else {
        // Custom roles: use /roles endpoint
        url = `${API_URL}/programs/${editingRole.program_id}/roles/${editingRole.id}`;
      }
      console.log('Update URL:', url);

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update role' }));
        
        // Handle validation errors with specific field messages
        if (error.errors) {
          const errorMessages = Object.entries(error.errors)
            .map(([field, messages]: [string, any]) => {
              const messageArray = Array.isArray(messages) ? messages : [messages];
              return `${field}: ${messageArray.join(', ')}`;
            })
            .join('\n');
          
          toast({
            title: "Validation Error",
            description: errorMessages,
            variant: "error"
          });
          setLoading(false);
          return;
        }
        
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      toast({
        title: "Success",
        description: "Role updated successfully!",
        variant: "success"
      });
      setShowEditModal(false);
      setEditingRole(null);
      loadRoles();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: `Failed to update role: ${error.message}`,
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (role: Role) => {
    setRoleToDelete(role);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;

    try {
      setLoading(true);
      const headers = getAuthHeaders();

      // Determine the correct endpoint based on active tab and user type
      let url: string;
      if (activeTab === 'system-roles') {
        url = `${API_URL}/system-roles/${roleToDelete.id}`;
      } else if (roleToDelete.is_default_user) {
        // Default program users: use /users endpoint
        url = `${API_URL}/programs/${roleToDelete.program_id}/users/${roleToDelete.id}`;
      } else {
        // Custom roles: use /roles endpoint
        url = `${API_URL}/programs/${roleToDelete.program_id}/roles/${roleToDelete.id}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete role' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      toast({
        title: "Success",
        description: "Role deleted successfully!",
        variant: "success"
      });
      setDeleteModalOpen(false);
      setRoleToDelete(null);
      loadRoles();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast({
        title: "Error",
        description: `Failed to delete role: ${error.message}`,
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedRoleIds.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select roles to delete",
        variant: "warning"
      });
      return;
    }
    setBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedRoleIds.length === 0) return;
    
    try {
      setLoading(true);
      const headers = getAuthHeaders();

      // Delete each role individually
      const deletePromises = selectedRoleIds.map(async (roleId) => {
        const role = roles.find(r => r.id === roleId);
        if (!role) return;
        
        // Determine the correct endpoint based on active tab
        let url: string;
        if (activeTab === 'system-roles') {
          url = `${API_URL}/system-roles/${roleId}`;
        } else {
          // Program users tab always uses /roles endpoint
          url = `${API_URL}/programs/${role.program_id}/roles/${roleId}`;
        }

        const response = await fetch(url, {
          method: 'DELETE',
          headers,
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete role ${role.role_name}`);
        }
      });

      await Promise.all(deletePromises);
      
      toast({
        title: "Success",
        description: `${selectedRoleIds.length} role(s) deleted successfully!`,
        variant: "success"
      });
      
      setSelectedRoleIds([]);
      setBulkDeleteModal(false);
      loadRoles();
    } catch (error: any) {
      console.error('Error deleting roles:', error);
      toast({
        title: "Error",
        description: `Failed to delete roles: ${error.message}`,
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedRoleIds.length === roles.length) {
      setSelectedRoleIds([]);
    } else {
      setSelectedRoleIds(roles.map(r => r.id));
    }
  };

  const handleSelectRole = (roleId: string) => {
    setSelectedRoleIds(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setEditUsername(role.username);
    setEditEmail(role.email);
    setEditPassword(""); // Don't show actual password
    setShowPassword(false);
    setShowEditModal(true);
  };

  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
    setDeleteModalOpen(true);
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roleName || !username || !email || !password) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "warning"
      });
      return;
    }

    if (selectedServices.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one service",
        variant: "warning"
      });
      return;
    }

    setLoading(true);

    try {
      const headers = getAuthHeaders();
      
      // Determine endpoint and request data based on tab
      let endpoint;
      let requestBody;
      
      if (activeTab === 'system-roles') {
        // System roles: no program association, use /system-roles endpoint
        endpoint = `${API_URL}/system-roles`;
        requestBody = {
          role_name: roleName,
          username: username,
          email: email,
          password: password,
          service_ids: selectedServices,
          description: `System-wide role with access to all programs`
        };
      } else {
        // Program users: tied to specific program
        const progId = createFormProgramId || getProgramId();
        endpoint = `${API_URL}/programs/${progId}/roles`;
        requestBody = {
          role_name: roleName,
          username: username,
          email: email,
          password: password,
          service_ids: selectedServices,
          event_ids: [],
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create role' }));
        
        // Handle validation errors with specific field messages
        if (error.errors) {
          const errorMessages = Object.entries(error.errors)
            .map(([field, messages]: [string, any]) => {
              const messageArray = Array.isArray(messages) ? messages : [messages];
              return `${field}: ${messageArray.join(', ')}`;
            })
            .join('\n');
          
          toast({
            title: "Validation Error",
            description: errorMessages,
            variant: "error"
          });
          setLoading(false);
          return;
        }
        
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      toast({
        title: "Success!",
        description: `Role created successfully! Login credentials:\nEmail: ${email}\nPassword: ${password}`,
        variant: "success"
      });
      
      // Reset form
      setRoleName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setSelectedServices([]);
      setCreateFormProgramId("");
      setShowForm(false);
      
      // Reload roles list
      loadRoles();
      
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast({
        title: "Error",
        description: `Failed to create role: ${error.message}`,
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // Group services by category
  const servicesByCategory = AVAILABLE_SERVICES.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_SERVICES>);

  return (
    <ProgramAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Roles & Services</h1>
            <p className="text-gray-600 mt-1">
              {searchParams.get('programName') 
                ? `Manage roles for ${decodeURIComponent(searchParams.get('programName')!)}`
                : 'Create and manage custom roles with specific permissions'
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Hierarchy Tree Button - Only show when program filter is set */}
            {!showForm && selectedProgramFilter !== "all" && (
              <Button 
                variant="outline" 
                onClick={() => {
                  const selectedProgram = programs.find(p => p.id === selectedProgramFilter);
                  if (selectedProgram) {
                    setTreeViewProgramId(selectedProgram.id);
                    setTreeViewProgramName(selectedProgram.name);
                    setHierarchyTreeModal(true);
                  }
                }}
                className="flex items-center gap-2"
              >
                <Network className="w-4 h-4" />
                View Hierarchy
              </Button>
            )}
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create New Role
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value as "program-users" | "system-roles");
          setShowForm(false);
        }} className="w-full">
          <TabsList className="inline-flex h-auto items-center justify-start rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 p-1.5 text-gray-600 shadow-inner border border-gray-200 flex-wrap gap-1 mb-6">
            <TabsTrigger 
              value="program-users" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100 hover:text-gray-900"
            >
              <Users className="w-4 h-4 mr-2" />
              Program Users
            </TabsTrigger>
            {currentUser?.role === 'super-admin' && (
              <TabsTrigger 
                value="system-roles" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-qsights-cyan data-[state=active]:shadow-lg data-[state=active]:shadow-purple-100 hover:text-gray-900"
              >
                <UserCog className="w-4 h-4 mr-2" />
                System Roles
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="hierarchy-mapping" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-100 hover:text-gray-900"
            >
              <Network className="w-4 h-4 mr-2" />
              Hierarchy Mapping
            </TabsTrigger>
          </TabsList>

          {/* Program Users Tab Content */}
          <TabsContent value="program-users" className="space-y-6">
            {/* Info Banner */}
            {!showForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">Roles Management</h3>
                    <p className="text-sm text-blue-800">
                      Create custom roles with specific permissions for your organization. Assign program-specific access or create system-wide roles for administrators.
                    </p>
                  </div>
                </div>
              </div>
            )}

        {/* Program Filter - Only show for Program Users tab */}
        {!showForm && activeTab === 'program-users' && (
          <div className="flex items-center gap-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Label className="text-sm font-medium">Filter by Program:</Label>
            </div>
            <select 
              value={selectedProgramFilter} 
              onChange={(e) => setSelectedProgramFilter(e.target.value)}
              className="flex h-10 w-[300px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">All Programs</option>
              {programs.map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.name}
                </option>
              ))}
            </select>
            {selectedProgramFilter !== "all" && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedProgramFilter("all")}
              >
                Clear Filter
              </Button>
            )}
          </div>
        )}

        {/* Roles List Table */}
        {!showForm && (
          <Card>
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>Existing Roles</CardTitle>
                  {selectedRoleIds.length > 0 && (
                    <button
                      onClick={handleBulkDeleteClick}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete ({selectedRoleIds.length})
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRoles ? (
                <div className="text-center py-8 text-gray-500">Loading roles...</div>
              ) : roles.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Roles Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Click "Create New Role" above to create your first custom role
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedRoleIds.length === paginatedRoles.length && paginatedRoles.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </TableHead>
                        <TableHead>Role Title</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Programs</TableHead>
                        <TableHead>Created On</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRoles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedRoleIds.includes(role.id)}
                              onChange={() => handleSelectRole(role.id)}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {role.role_name}
                              {/* Show badge for default/system roles */}
                              {['program-admin', 'program-manager', 'program-moderator', 'Group Head'].includes(role.role_name) && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{role.username}</TableCell>
                          <TableCell>
                            {role.program?.name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {new Date(role.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(role)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(role)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {/* Pagination */}
              {roles.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-600">
                        Showing {roles.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
                        {Math.min(currentPage * itemsPerPage, roles.length)} of{" "}
                        {roles.length} roles
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
              )}
            </CardContent>
          </Card>
        )}
          </TabsContent>

          {/* System Roles Tab Content */}
          {currentUser?.role === 'super-admin' && (
            <TabsContent value="system-roles" className="space-y-6">
              {/* Info Banner */}
              {!showForm && (
                <div className="bg-qsights-light border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-qsights-cyan" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-purple-900 mb-1">System Roles Management</h3>
                      <p className="text-sm text-purple-800">
                        Create system-wide roles for administrators with access to all programs and system settings.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* System Roles List */}
              {!showForm && (
                <Card>
                  <CardHeader className="border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <CardTitle>System Roles</CardTitle>
                      <div className="text-sm text-gray-500">
                        {roles.length} {roles.length === 1 ? "role" : "roles"}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={roles.length > 0 && selectedRoleIds.length === roles.length}
                                onCheckedChange={handleSelectAll}
                              />
                            </TableHead>
                            <TableHead>Role Name</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Program</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loadingRoles ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8">
                                <div className="flex items-center justify-center gap-2">
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Loading roles...</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : roles.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                No system roles found. Create one to get started.
                              </TableCell>
                            </TableRow>
                          ) : (
                            roles.map((role) => (
                              <TableRow key={role.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedRoleIds.includes(role.id)}
                                    onCheckedChange={() => handleSelectRole(role.id)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    {role.role_name}
                                    {/* Show badge for default/system roles */}
                                    {['super-admin', 'admin'].includes(role.role_name) && (
                                      <span className="px-2 py-0.5 text-xs font-medium bg-cyan-50 text-purple-700 rounded">
                                        System
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{role.username}</TableCell>
                                <TableCell>{role.email}</TableCell>
                                <TableCell>
                                  {role.program ? (
                                    <span className="text-sm text-gray-600">{role.program.name}</span>
                                  ) : (
                                    <span className="text-sm text-gray-400">All Programs</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-gray-500">
                                  {new Date(role.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditRole(role)}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteRole(role)}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Hierarchy Mapping Tab Content */}
          <TabsContent value="hierarchy-mapping" className="space-y-6">
            {/* Info Banner */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-green-900 mb-1">Centralized Hierarchy Management</h3>
                  <p className="text-sm text-green-700">
                    Define reporting structures and organizational hierarchy. Map users to managers for streamlined team management and reporting.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold">Hierarchy Mappings</h2>
                <p className="text-gray-600">Manage reporting relationships and organizational structure</p>
              </div>
              <Button 
                onClick={() => {
                  setShowMappingModal(true);
                  setMappingStep(1);
                  setMappingProgramId("");
                  setMappingParentRoleId("");
                  setMappingParentUserId("");
                  setMappingChildRoleId("");
                  setMappingChildUserIds([]);
                }}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Create Mapping
              </Button>
            </div>

            {/* Mappings List */}
            <Card>
              <CardHeader>
                <CardTitle>Active Hierarchies</CardTitle>
                <p className="text-sm text-gray-600 mt-1">View and manage existing reporting structures</p>
              </CardHeader>
              <CardContent>
                {hierarchyMappings.length === 0 ? (
                  <div className="text-center py-12">
                    <Network className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Hierarchies Defined</h3>
                    <p className="text-gray-600 mb-4">
                      Create your first hierarchy mapping to establish reporting relationships
                    </p>
                    <Button 
                      onClick={() => {
                        setShowMappingModal(true);
                        setMappingStep(1);
                      }}
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Mapping
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Program</TableHead>
                          <TableHead>Manager (Parent)</TableHead>
                          <TableHead>Parent Role</TableHead>
                          <TableHead>Team Member (Child)</TableHead>
                          <TableHead>Child Role</TableHead>
                          <TableHead>Mapped On</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hierarchyMappings.map((mapping) => (
                          <TableRow key={mapping.id}>
                            <TableCell className="font-medium">{mapping.program_name}</TableCell>
                            <TableCell>{mapping.parent_user_name}</TableCell>
                            <TableCell><span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">{mapping.parent_role_name}</span></TableCell>
                            <TableCell>{mapping.child_user_name}</TableCell>
                            <TableCell><span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">{mapping.child_role_name}</span></TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {new Date(mapping.mapped_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMapping(mapping.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Form - Shared between both tabs */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Role</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="roleName">Role Name *</Label>
                    <Input
                      id="roleName"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      placeholder="e.g., Program Manager"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g., program.manager"
                      required
                    />
                  </div>
                  {activeTab === 'program-users' && (
                    <div>
                      <Label htmlFor="program">Program (Optional)</Label>
                      <select
                        id="program"
                        value={createFormProgramId}
                        onChange={(e) => setCreateFormProgramId(e.target.value)}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="">All Programs</option>
                        {programs.map((prog) => (
                          <option key={prog.id} value={prog.id}>
                            {prog.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Select a specific program or leave blank for all programs
                      </p>
                    </div>
                  )}
                  {activeTab === 'system-roles' && (
                    <div>
                      <Label>Access Level</Label>
                      <div className="flex h-10 items-center px-3 py-2 rounded-md border border-gray-200 bg-gray-50">
                        <span className="text-sm font-medium text-purple-700">System-wide (All Programs)</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        System roles have access to all programs and administrative features
                      </p>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 8 characters"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleAutoGeneratePassword(false)}
                        className="flex items-center gap-1"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Generate
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Services Selection */}
                <div>
                  <Label className="text-lg font-semibold">
                    Select Services ({selectedServices.length} selected)
                  </Label>
                  <div className="mt-4 space-y-6">
                    {Object.entries(servicesByCategory).map(([category, services]) => (
                      <div key={category} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">{category}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {services.map((service) => (
                            <div key={service.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={service.id}
                                checked={selectedServices.includes(service.id)}
                                onCheckedChange={() => handleServiceToggle(service.id)}
                              />
                              <Label
                                htmlFor={service.id}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {service.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create Role"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Edit Role Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Role: {editingRole?.role_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Communication Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="edit-password">Password</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="edit-password"
                      type={showPassword ? "text" : "password"}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Leave blank to keep current"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAutoGeneratePassword(true)}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Generate
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Leave blank to keep the current password
                </p>
              </div>
              
              {/* Services Selection */}
              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block">
                  Selected Services ({editSelectedServices.length} selected)
                </Label>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(servicesByCategory).map(([category, services]) => (
                    <div key={category} className="border rounded-lg p-3">
                      <h3 className="font-semibold text-sm text-gray-900 mb-2">{category}</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {services.map((service) => (
                          <div key={service.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-${service.id}`}
                              checked={editSelectedServices.includes(service.id)}
                              onCheckedChange={() => {
                                setEditSelectedServices(prev =>
                                  prev.includes(service.id)
                                    ? prev.filter(id => id !== service.id)
                                    : [...prev, service.id]
                                );
                              }}
                            />
                            <Label
                              htmlFor={`edit-${service.id}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {service.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateRole} disabled={loading}>
                {loading ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setRoleToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Role"
          message={`Are you sure you want to delete the role "${roleToDelete?.role_name}"? This action cannot be undone.`}
        />

        {/* Bulk Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={bulkDeleteModal}
          onClose={() => setBulkDeleteModal(false)}
          onConfirm={confirmBulkDelete}
          title="Delete Multiple Roles"
          message={`Are you sure you want to delete ${selectedRoleIds.length} role(s)? This action cannot be undone.`}
        />

        {/* Manager Assignment Modal */}
        {selectedUser && (
          <ManagerAssignmentModal
            isOpen={managerAssignmentModal}
            onClose={() => {
              setManagerAssignmentModal(false);
              setSelectedUser(null);
            }}
            userId={selectedUser.id}
            userName={selectedUser.name}
            programId={selectedUser.programId}
            programName={selectedUser.programName}
            onSuccess={() => {
              loadRoles();
              toast({
                title: "Success!",
                description: "Manager assignment updated successfully",
                variant: "success"
              });
            }}
          />
        )}

        {/* Hierarchy Tree Modal */}
        <HierarchyTreeModal
          isOpen={hierarchyTreeModal}
          onClose={() => setHierarchyTreeModal(false)}
          programId={treeViewProgramId}
          programName={treeViewProgramName}
        />

        {/* Hierarchy Mapping Modal */}
        <HierarchyMappingModal
          isOpen={showMappingModal}
          onClose={() => setShowMappingModal(false)}
          programs={programs}
          allRoles={allRoles}
          onSuccess={() => {
            loadHierarchyMappings();
            toast({
              title: "Success!",
              description: "Hierarchy mapping created successfully",
              variant: "success"
            });
          }}
        />
      </div>
    </ProgramAdminLayout>
  );
}

function RolesPageContent() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="text-lg">Loading...</div></div>}>
      <RolesPage />
    </Suspense>
  );
}

export default RolesPageContent;
