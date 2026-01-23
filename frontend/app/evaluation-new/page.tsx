'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, Users, Network, Play, History, Plus, Edit2, Trash2, 
  Search, ChevronRight, ChevronDown, Send, CheckCircle, Clock,
  Star, TrendingUp, MessageSquare, UserCheck, Smile, List, X,
  Mail, AlertCircle, Loader2
} from 'lucide-react';
import AppLayout from '@/components/app-layout';
import { fetchWithAuth } from '@/lib/api';
import { toast } from 'react-hot-toast';

// Types
interface Department {
  id: string;
  name: string;
  roles_count?: number;
}

interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  category?: string; // This acts as department
  organization_id: string;
  hierarchy_level: number;
  is_active: boolean;
  staff_count?: number;
}

interface Staff {
  id: string;
  name: string;
  email: string;
  employee_id?: string;
  role_id: string;
  role_name?: string;
  department?: string;
  organization_id: string;
  is_available_for_evaluation: boolean;
}

interface Mapping {
  id: string;
  evaluator_id: string;
  evaluator_name: string;
  evaluator_role: string;
  evaluator_dept: string;
  subordinates: {
    id: string;
    staff_id: string;
    name: string;
    role: string;
  }[];
}

interface EvaluationTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  questions: {
    question: string;
    type: 'rating' | 'mcq' | 'text';
    options?: string[];
    scale?: number;
    description?: string;
  }[];
}

interface TriggeredEvaluation {
  id: string;
  template_name: string;
  evaluator_name: string;
  subordinates_count: number;
  status: 'pending' | 'in_progress' | 'completed';
  triggered_at: string;
  completed_at?: string;
}

type TabType = 'setup' | 'trigger' | 'history';

// Predefined Evaluation Templates
const evaluationTemplates: EvaluationTemplate[] = [
  {
    id: 'competency',
    name: 'Competency Rating',
    description: 'Rate skills like Communication, Leadership, Technical',
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    questions: [
      { question: 'Communication Skills', type: 'rating', scale: 5, description: 'Ability to communicate clearly' },
      { question: 'Leadership & Initiative', type: 'rating', scale: 5, description: 'Demonstrates leadership' },
      { question: 'Technical Proficiency', type: 'rating', scale: 5, description: 'Knowledge in their area' },
      { question: 'Teamwork & Collaboration', type: 'rating', scale: 5, description: 'Works effectively with team' },
      { question: 'Problem Solving', type: 'rating', scale: 5, description: 'Ability to solve problems' },
      { question: 'Time Management', type: 'rating', scale: 5, description: 'Manages time effectively' },
    ]
  },
  {
    id: 'performance',
    name: 'Performance Scale',
    description: 'Overall performance assessment with MCQ options',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    questions: [
      { 
        question: 'Overall Performance Rating', 
        type: 'mcq', 
        options: ['Exceptional', 'Exceeds Expectations', 'Meets Expectations', 'Needs Improvement', 'Unsatisfactory'],
        description: 'Rate overall performance'
      },
      {
        question: 'Goal Achievement',
        type: 'mcq',
        options: ['Exceeded all goals', 'Met all goals', 'Met most goals', 'Met some goals', 'Did not meet goals'],
        description: 'How well goals were achieved'
      }
    ]
  },
  {
    id: 'feedback',
    name: 'Open Feedback',
    description: 'Qualitative feedback with text responses',
    icon: MessageSquare,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    questions: [
      { question: 'Key Strengths', type: 'text', description: 'What are their strongest attributes?' },
      { question: 'Areas for Improvement', type: 'text', description: 'Suggest areas for growth' },
      { question: 'Additional Comments', type: 'text', description: 'Any other observations' },
    ]
  },
  {
    id: '360_manager',
    name: '360° Manager View',
    description: 'Complete manager evaluation set',
    icon: UserCheck,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    questions: [
      { question: 'Quality of Work', type: 'rating', scale: 5, description: 'Accuracy and reliability' },
      { question: 'Productivity', type: 'rating', scale: 5, description: 'Volume and deadlines' },
      { question: 'Job Knowledge', type: 'rating', scale: 5, description: 'Understanding of job' },
      { question: 'Dependability', type: 'rating', scale: 5, description: 'Reliability and commitment' },
      { question: 'Attitude', type: 'rating', scale: 5, description: 'Cooperation and professionalism' },
      { question: 'Key Accomplishments', type: 'text', description: '' },
      { question: 'Development Goals', type: 'text', description: '' },
    ]
  },
  {
    id: 'peer_review',
    name: 'Peer Review',
    description: 'Colleague feedback questions',
    icon: Users,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    questions: [
      { question: 'Collaboration with team', type: 'rating', scale: 5, description: '' },
      { question: 'Reliability in commitments', type: 'rating', scale: 5, description: '' },
      { question: 'Communication with colleagues', type: 'rating', scale: 5, description: '' },
      { question: 'What do they do best?', type: 'text', description: 'Highlight their strengths' },
      { question: 'What could they improve?', type: 'text', description: 'Constructive suggestions' },
    ]
  },
];

export default function EvaluationNewPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('setup');
  const [loading, setLoading] = useState(false);
  
  // Setup state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  
  // Selected state for cascading
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  
  // Modal states
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  
  // Form states
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });
  const [roleForm, setRoleForm] = useState({ name: '', code: '', description: '', hierarchy_level: 0 });
  const [staffForm, setStaffForm] = useState({ name: '', email: '', employee_id: '', role_id: '' });
  
  // Trigger state
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedEvaluators, setSelectedEvaluators] = useState<string[]>([]);
  const [triggering, setTriggering] = useState(false);
  
  // History state
  const [triggeredEvaluations, setTriggeredEvaluations] = useState<TriggeredEvaluation[]>([]);
  
  // Organization ID (would come from auth context in real app)
  const [organizationId, setOrganizationId] = useState<string>('');

  // Fetch organization from user
  useEffect(() => {
    const fetchOrgId = async () => {
      try {
        const response = await fetchWithAuth('/auth/me');
        if (response.success && response.user) {
          setOrganizationId(response.user.organization_id);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchOrgId();
  }, []);

  // Fetch data - Derive departments from roles categories
  const fetchDepartments = useCallback(async () => {
    if (!organizationId) return;
    try {
      const response = await fetchWithAuth(`/evaluation/departments?organization_id=${organizationId}`);
      if (response.success) {
        setDepartments(response.departments || []);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  }, [organizationId]);

  const fetchRoles = useCallback(async () => {
    if (!organizationId) return;
    try {
      const response = await fetchWithAuth(`/evaluation/roles?organization_id=${organizationId}`);
      if (response.success) {
        setRoles(response.roles || []);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  }, [organizationId]);

  const fetchStaff = useCallback(async () => {
    if (!organizationId) return;
    try {
      const response = await fetchWithAuth(`/evaluation/staff?organization_id=${organizationId}`);
      if (response.success) {
        setStaff(response.staff || []);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  }, [organizationId]);

  const fetchMappings = useCallback(async () => {
    if (!organizationId) return;
    try {
      const response = await fetchWithAuth(`/evaluation/hierarchy?organization_id=${organizationId}`);
      if (response.success) {
        // Transform hierarchy data into mapping format
        const hierarchyData = response.hierarchies || response.hierarchy || [];
        const mappedData: Mapping[] = [];
        
        // Group by evaluator (reports_to_id = manager_id)
        const grouped: { [key: string]: any[] } = {};
        hierarchyData.forEach((h: any) => {
          const managerId = h.reports_to_id;
          if (!grouped[managerId]) {
            grouped[managerId] = [];
          }
          grouped[managerId].push(h);
        });
        
        // Create mapping objects - use hierarchy data directly since it includes names
        Object.keys(grouped).forEach(managerId => {
          const firstItem = grouped[managerId][0];
          mappedData.push({
            id: managerId,
            evaluator_id: managerId,
            evaluator_name: firstItem.manager_name || 'Unknown',
            evaluator_role: firstItem.manager_role_name || '',
            evaluator_dept: '',
            subordinates: grouped[managerId].map((h: any) => ({
              id: h.id,
              staff_id: h.staff_id,
              name: h.staff_name || 'Unknown',
              role: h.staff_role_name || ''
            }))
          });
        });
        
        setMappings(mappedData);
      }
    } catch (error) {
      console.error('Failed to fetch mappings:', error);
    }
  }, [organizationId]);

  const fetchTriggeredEvaluations = useCallback(async () => {
    if (!organizationId) return;
    try {
      const response = await fetchWithAuth(`/evaluation/triggered?organization_id=${organizationId}`);
      if (response.success) {
        setTriggeredEvaluations(response.evaluations || []);
      }
    } catch (error) {
      console.error('Failed to fetch triggered evaluations:', error);
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) {
      fetchDepartments();
      fetchRoles();
      fetchStaff();
    }
  }, [organizationId, fetchDepartments, fetchRoles, fetchStaff]);

  useEffect(() => {
    if (organizationId) {
      fetchMappings();
    }
  }, [organizationId, fetchMappings]);

  useEffect(() => {
    if (organizationId && activeTab === 'history') {
      fetchTriggeredEvaluations();
    }
  }, [organizationId, activeTab, fetchTriggeredEvaluations]);

  // CRUD handlers for Department
  const handleAddDepartment = async () => {
    if (!deptForm.name.trim()) {
      toast.error('Department name is required');
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetchWithAuth('/evaluation/departments', {
        method: 'POST',
        body: JSON.stringify({
          name: deptForm.name,
          code: deptForm.code || deptForm.name.substring(0, 3).toUpperCase(),
          description: deptForm.description,
          organization_id: organizationId
        })
      });
      
      if (response.success) {
        toast.success('Department added successfully');
        setShowDeptModal(false);
        setDeptForm({ name: '', code: '', description: '' });
        fetchDepartments();
      } else {
        toast.error(response.message || 'Failed to add department');
      }
    } catch (error) {
      toast.error('Failed to add department');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    
    try {
      const response = await fetchWithAuth(`/evaluation/departments/${id}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        toast.success('Department deleted');
        fetchDepartments();
        if (selectedDepartment === id) {
          setSelectedDepartment(null);
          setSelectedRole(null);
        }
      } else {
        toast.error(response.message || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete department');
    }
  };

  // CRUD handlers for Role
  const handleAddRole = async () => {
    if (!roleForm.name.trim()) {
      toast.error('Role name is required');
      return;
    }
    
    if (!selectedDepartment) {
      toast.error('Please select a department first');
      return;
    }
    
    const selectedDept = departments.find(d => d.id === selectedDepartment);
    
    try {
      setLoading(true);
      const response = await fetchWithAuth('/evaluation/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: roleForm.name,
          code: roleForm.code || roleForm.name.substring(0, 3).toUpperCase(),
          description: roleForm.description,
          hierarchy_level: roleForm.hierarchy_level,
          category: selectedDept?.name || '', // Use department name as category
          organization_id: organizationId
        })
      });
      
      if (response.success) {
        toast.success('Role added successfully');
        setShowRoleModal(false);
        setRoleForm({ name: '', code: '', description: '', hierarchy_level: 0 });
        fetchRoles();
      } else {
        toast.error(response.message || 'Failed to add role');
      }
    } catch (error) {
      toast.error('Failed to add role');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    
    try {
      const response = await fetchWithAuth(`/evaluation/roles/${id}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        toast.success('Role deleted');
        fetchRoles();
      } else {
        toast.error(response.message || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete role');
    }
  };

  // CRUD handlers for Staff
  const handleAddStaff = async () => {
    if (!staffForm.name.trim() || !staffForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    
    const roleId = staffForm.role_id || selectedRole;
    if (!roleId) {
      toast.error('Please select a role first');
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetchWithAuth('/evaluation/staff', {
        method: 'POST',
        body: JSON.stringify({
          name: staffForm.name,
          email: staffForm.email,
          employee_id: staffForm.employee_id,
          role_id: roleId,
          department: selectedDepartment || '',
          organization_id: organizationId,
          is_available_for_evaluation: true
        })
      });
      
      if (response.success) {
        toast.success('Staff added successfully');
        setShowStaffModal(false);
        setStaffForm({ name: '', email: '', employee_id: '', role_id: '' });
        fetchStaff();
      } else {
        toast.error(response.message || 'Failed to add staff');
      }
    } catch (error) {
      toast.error('Failed to add staff');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
      const response = await fetchWithAuth(`/evaluation/staff/${id}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        toast.success('Staff deleted');
        fetchStaff();
      } else {
        toast.error(response.message || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete staff');
    }
  };

  // Mapping handlers
  const [mappingEvaluator, setMappingEvaluator] = useState<string>('');
  const [mappingSubordinates, setMappingSubordinates] = useState<string[]>([]);

  const handleAddMapping = async () => {
    if (!mappingEvaluator || mappingSubordinates.length === 0) {
      toast.error('Select evaluator and at least one subordinate');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create hierarchy entries for each subordinate
      for (const subId of mappingSubordinates) {
        await fetchWithAuth('/evaluation/hierarchy', {
          method: 'POST',
          body: JSON.stringify({
            staff_id: subId,
            reports_to_id: mappingEvaluator,
            organization_id: organizationId,
            relationship_type: 'direct',
            is_active: true,
            is_primary: true
          })
        });
      }
      
      toast.success('Mapping created successfully');
      setShowMappingModal(false);
      setMappingEvaluator('');
      setMappingSubordinates([]);
      fetchMappings();
    } catch (error) {
      toast.error('Failed to create mapping');
    } finally {
      setLoading(false);
    }
  };

  // Trigger evaluation
  const handleTriggerEvaluation = async () => {
    if (!selectedTemplate) {
      toast.error('Please select an evaluation form');
      return;
    }
    
    if (selectedEvaluators.length === 0) {
      toast.error('Please select at least one evaluator');
      return;
    }
    
    try {
      setTriggering(true);
      
      const template = evaluationTemplates.find(t => t.id === selectedTemplate);
      
      const response = await fetchWithAuth('/evaluation/trigger', {
        method: 'POST',
        body: JSON.stringify({
          template_id: selectedTemplate,
          template_name: template?.name,
          template_questions: template?.questions,
          evaluator_ids: selectedEvaluators,
          organization_id: organizationId
        })
      });
      
      if (response.success) {
        toast.success(`Evaluation triggered! Emails sent to ${selectedEvaluators.length} evaluator(s)`);
        setSelectedTemplate(null);
        setSelectedEvaluators([]);
        setActiveTab('history');
        fetchTriggeredEvaluations();
      } else {
        toast.error(response.message || 'Failed to trigger evaluation');
      }
    } catch (error) {
      toast.error('Failed to trigger evaluation');
    } finally {
      setTriggering(false);
    }
  };

  // Filter roles by selected department
  const selectedDeptObj = departments.find(d => d.id === selectedDepartment);
  const filteredRoles = selectedDepartment 
    ? roles.filter(r => r.category === selectedDeptObj?.name)
    : roles;

  // Filter staff by selected role
  const filteredStaff = selectedRole
    ? staff.filter(s => s.role_id === selectedRole)
    : staff;

  // Get evaluators with subordinates (for trigger tab)
  const evaluatorsWithSubordinates = mappings.filter(m => m.subordinates.length > 0);

  const tabs = [
    { id: 'setup' as TabType, label: 'Setup', icon: Building2, description: 'Departments, Roles, Staff & Mapping' },
    { id: 'trigger' as TabType, label: 'Trigger', icon: Play, description: 'Send evaluation forms' },
    { id: 'history' as TabType, label: 'History', icon: History, description: 'View status & results' },
  ];

  return (
    <AppLayout>
      <div className="bg-gray-50 min-h-screen">
        {/* Header with Tabs */}
        <div className="bg-white border-b shadow-sm">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Evaluation System</h1>
            <p className="text-sm text-gray-500 mt-1">
              Setup, trigger, and manage staff performance evaluations
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 font-medium bg-blue-50/50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* SETUP TAB */}
          {activeTab === 'setup' && (
            <div className="space-y-6">
              {/* Four Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Column 1: Departments */}
                <div className="bg-white rounded-xl shadow-sm border">
                  <div className="p-4 border-b bg-gray-50 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-900">Departments</h3>
                      </div>
                      <button
                        onClick={() => setShowDeptModal(true)}
                        className="p-1.5 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-2 max-h-80 overflow-y-auto">
                    {departments.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No departments yet</p>
                    ) : (
                      departments.map((dept) => (
                        <div
                          key={dept.id}
                          onClick={() => {
                            setSelectedDepartment(dept.id === selectedDepartment ? null : dept.id);
                            setSelectedRole(null);
                          }}
                          className={`p-3 rounded-lg cursor-pointer transition flex items-center justify-between group ${
                            selectedDepartment === dept.id
                              ? 'bg-purple-100 border-2 border-purple-400'
                              : 'hover:bg-gray-50 border-2 border-transparent'
                          }`}
                        >
                          <div>
                            <p className="font-medium text-gray-900">{dept.name}</p>
                            <p className="text-xs text-gray-500">{dept.code}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteDepartment(dept.id); }}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 2: Roles */}
                <div className="bg-white rounded-xl shadow-sm border">
                  <div className="p-4 border-b bg-gray-50 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Network className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">Roles</h3>
                      </div>
                      <button
                        onClick={() => setShowRoleModal(true)}
                        className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                        disabled={!selectedDepartment}
                        title={!selectedDepartment ? 'Select a department first' : 'Add role'}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {selectedDepartment && (
                      <p className="text-xs text-gray-500 mt-1">
                        Under: {departments.find(d => d.id === selectedDepartment)?.name}
                      </p>
                    )}
                  </div>
                  <div className="p-2 max-h-80 overflow-y-auto">
                    {!selectedDepartment ? (
                      <p className="text-sm text-gray-500 text-center py-4">Select a department</p>
                    ) : filteredRoles.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No roles yet</p>
                    ) : (
                      filteredRoles.map((role) => (
                        <div
                          key={role.id}
                          onClick={() => setSelectedRole(role.id === selectedRole ? null : role.id)}
                          className={`p-3 rounded-lg cursor-pointer transition flex items-center justify-between group ${
                            selectedRole === role.id
                              ? 'bg-blue-100 border-2 border-blue-400'
                              : 'hover:bg-gray-50 border-2 border-transparent'
                          }`}
                        >
                          <div>
                            <p className="font-medium text-gray-900">{role.name}</p>
                            <p className="text-xs text-gray-500">Level: {role.hierarchy_level}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 3: Staff */}
                <div className="bg-white rounded-xl shadow-sm border">
                  <div className="p-4 border-b bg-gray-50 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-gray-900">Staff</h3>
                      </div>
                      <button
                        onClick={() => setShowStaffModal(true)}
                        className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                        disabled={!selectedRole}
                        title={!selectedRole ? 'Select a role first' : 'Add staff'}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {selectedRole && (
                      <p className="text-xs text-gray-500 mt-1">
                        Role: {roles.find(r => r.id === selectedRole)?.name}
                      </p>
                    )}
                  </div>
                  <div className="p-2 max-h-80 overflow-y-auto">
                    {!selectedRole ? (
                      <p className="text-sm text-gray-500 text-center py-4">Select a role</p>
                    ) : filteredStaff.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No staff yet</p>
                    ) : (
                      filteredStaff.map((member) => (
                        <div
                          key={member.id}
                          className="p-3 rounded-lg hover:bg-gray-50 transition flex items-center justify-between group"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => handleDeleteStaff(member.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 4: Mapping */}
                <div className="bg-white rounded-xl shadow-sm border">
                  <div className="p-4 border-b bg-gray-50 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Network className="h-5 w-5 text-orange-600" />
                        <h3 className="font-semibold text-gray-900">Mapping</h3>
                      </div>
                      <button
                        onClick={() => setShowMappingModal(true)}
                        className="p-1.5 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Who evaluates whom</p>
                  </div>
                  <div className="p-2 max-h-80 overflow-y-auto">
                    {mappings.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No mappings yet</p>
                    ) : (
                      mappings.map((mapping) => (
                        <div key={mapping.id} className="p-3 rounded-lg bg-orange-50 mb-2">
                          <div className="flex items-center gap-2 mb-2">
                            <UserCheck className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-gray-900">{mapping.evaluator_name}</span>
                          </div>
                          <div className="pl-6 space-y-1">
                            {mapping.subordinates.map((sub) => (
                              <div key={sub.id} className="flex items-center gap-2 text-sm text-gray-600">
                                <ChevronRight className="h-3 w-3" />
                                {sub.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-700">{departments.length}</p>
                  <p className="text-sm text-purple-600">Departments</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{roles.length}</p>
                  <p className="text-sm text-blue-600">Roles</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{staff.length}</p>
                  <p className="text-sm text-green-600">Staff Members</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-orange-700">{mappings.length}</p>
                  <p className="text-sm text-orange-600">Evaluators</p>
                </div>
              </div>
            </div>
          )}

          {/* TRIGGER TAB */}
          {activeTab === 'trigger' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Step 1: Select Form */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">1</span>
                  Select Evaluation Form
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {evaluationTemplates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id === selectedTemplate ? null : template.id)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          selectedTemplate === template.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className={`w-10 h-10 ${template.bgColor} rounded-lg flex items-center justify-center mb-3`}>
                          <Icon className={`h-5 w-5 ${template.color}`} />
                        </div>
                        <h4 className="font-semibold text-gray-900">{template.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                        <p className="text-xs text-blue-600 mt-2">{template.questions.length} questions</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Select Evaluators */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">2</span>
                  Select Evaluators
                </h3>
                
                {evaluatorsWithSubordinates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No evaluators with subordinates found.</p>
                    <p className="text-sm">Create mappings in the Setup tab first.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        checked={selectedEvaluators.length === evaluatorsWithSubordinates.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEvaluators(evaluatorsWithSubordinates.map(m => m.evaluator_id));
                          } else {
                            setSelectedEvaluators([]);
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="font-medium">Select All Evaluators</span>
                    </label>
                    
                    {evaluatorsWithSubordinates.map((mapping) => (
                      <label
                        key={mapping.evaluator_id}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                          selectedEvaluators.includes(mapping.evaluator_id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEvaluators.includes(mapping.evaluator_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEvaluators([...selectedEvaluators, mapping.evaluator_id]);
                            } else {
                              setSelectedEvaluators(selectedEvaluators.filter(id => id !== mapping.evaluator_id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{mapping.evaluator_name}</p>
                          <p className="text-sm text-gray-500">{mapping.evaluator_dept} • {mapping.evaluator_role}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">{mapping.subordinates.length}</p>
                          <p className="text-xs text-gray-500">subordinates</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 3: Trigger Button */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Ready to send?</h3>
                    <p className="text-blue-100 text-sm mt-1">
                      {selectedTemplate ? evaluationTemplates.find(t => t.id === selectedTemplate)?.name : 'No form selected'}
                      {' • '}
                      {selectedEvaluators.length} evaluator(s) selected
                    </p>
                  </div>
                  <button
                    onClick={handleTriggerEvaluation}
                    disabled={!selectedTemplate || selectedEvaluators.length === 0 || triggering}
                    className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {triggering ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Trigger Evaluation
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-gray-900">Triggered Evaluations</h3>
                </div>
                <div className="p-4">
                  {triggeredEvaluations.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No evaluations triggered yet</p>
                      <p className="text-sm">Go to the Trigger tab to send evaluations</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-sm text-gray-500 border-b">
                            <th className="pb-3 font-medium">Form</th>
                            <th className="pb-3 font-medium">Evaluator</th>
                            <th className="pb-3 font-medium">Subordinates</th>
                            <th className="pb-3 font-medium">Status</th>
                            <th className="pb-3 font-medium">Triggered</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {triggeredEvaluations.map((evaluation) => (
                            <tr key={evaluation.id} className="text-sm">
                              <td className="py-4 font-medium text-gray-900">{evaluation.template_name}</td>
                              <td className="py-4 text-gray-600">{evaluation.evaluator_name}</td>
                              <td className="py-4 text-gray-600">{evaluation.subordinates_count}</td>
                              <td className="py-4">
                                {evaluation.status === 'completed' ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                    Completed
                                  </span>
                                ) : evaluation.status === 'in_progress' ? (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                    In Progress
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="py-4 text-gray-500">
                                {new Date(evaluation.triggered_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODALS */}
        
        {/* Department Modal */}
        {showDeptModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Department</h3>
                <button onClick={() => setShowDeptModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Human Resources"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., HR"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={deptForm.description}
                    onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDepartment}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Department'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Role Modal */}
        {showRoleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Role</h3>
                <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Adding to: <span className="font-medium">{departments.find(d => d.id === selectedDepartment)?.name}</span>
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Manager"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hierarchy Level</label>
                  <select
                    value={roleForm.hierarchy_level}
                    onChange={(e) => setRoleForm({ ...roleForm, hierarchy_level: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>1 - Group Head (Top)</option>
                    <option value={2}>2 - Manager</option>
                    <option value={3}>3 - Lead</option>
                    <option value={4}>4 - Employee</option>
                    <option value={5}>5 - Junior</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRole}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Role'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Staff Modal */}
        {showStaffModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Staff</h3>
                <button onClick={() => setShowStaffModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Role: <span className="font-medium">{roles.find(r => r.id === selectedRole)?.name}</span>
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={staffForm.employee_id}
                    onChange={(e) => setStaffForm({ ...staffForm, employee_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStaff}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Staff'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mapping Modal */}
        {showMappingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Create Mapping</h3>
                <button onClick={() => setShowMappingModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Evaluator (Manager)</label>
                  <select
                    value={mappingEvaluator}
                    onChange={(e) => setMappingEvaluator(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select evaluator...</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.department} - {roles.find(r => r.id === s.role_id)?.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subordinates (Select multiple)</label>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {staff
                      .filter(s => s.id !== mappingEvaluator)
                      .map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={mappingSubordinates.includes(s.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setMappingSubordinates([...mappingSubordinates, s.id]);
                              } else {
                                setMappingSubordinates(mappingSubordinates.filter(id => id !== s.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{s.name}</p>
                            <p className="text-xs text-gray-500">{s.department} - {roles.find(r => r.id === s.role_id)?.name}</p>
                          </div>
                        </label>
                      ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowMappingModal(false);
                    setMappingEvaluator('');
                    setMappingSubordinates([]);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMapping}
                  disabled={loading || !mappingEvaluator || mappingSubordinates.length === 0}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Mapping'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
