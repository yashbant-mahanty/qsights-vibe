"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Save,
  ClipboardCheck,
  Calendar,
  Settings,
  FileText,
  Info,
  Users,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  UserCheck,
  Network,
} from "lucide-react";
import { evaluationEventsApi, questionnairesApi, organizationsApi, programsApi, type Questionnaire, type Organization, type Program } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { fetchWithAuth } from "@/lib/api";

export default function CreateEvaluationEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    questionnaire_id: "",
    organization_id: "",
    program_id: "",
    start_date: "",
    end_date: "",
    evaluation_type: "manager_to_subordinate", // NEW: evaluation type
    allow_self_evaluation: false,
    allow_peer_evaluation: false,
    allow_manager_evaluation: true,
    allow_subordinate_evaluation: false,
    is_anonymous: true,
    show_individual_responses: false,
    auto_generate_assignments: true, // NEW: auto-generate from hierarchy
    email_subject: "Evaluation Request: {{evaluatee_name}}",
    email_body: "Dear {{evaluator_name}},\n\nYou have been requested to complete an evaluation for {{evaluatee_name}}.\n\nPlease click the link below to complete the evaluation:\n{{evaluation_link}}\n\nThis evaluation is part of: {{event_name}}\n\nThank you.",
  });

  // Dropdown options
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  
  // Staff from hierarchy for preview
  const [hierarchyStaff, setHierarchyStaff] = useState<any[]>([]);
  const [hierarchyRelationships, setHierarchyRelationships] = useState<any[]>([]);
  const [assignmentPreview, setAssignmentPreview] = useState<{evaluator: string, evaluatee: string, type: string}[]>([]);

  useEffect(() => {
    loadDropdownOptions();
  }, []);

  useEffect(() => {
    // Filter programs when organization changes
    if (formData.organization_id) {
      loadPrograms(formData.organization_id);
    } else {
      setPrograms([]);
      setFormData(prev => ({ ...prev, program_id: "" }));
    }
  }, [formData.organization_id]);

  async function loadDropdownOptions() {
    try {
      setLoading(true);
      const [questData, orgData] = await Promise.all([
        questionnairesApi.getAll(),
        organizationsApi.getAll(),
      ]);
      // Filter to show only Evaluation type questionnaires first, then others
      const evalQuestionnaires = questData.filter((q: Questionnaire) => 
        q.status === 'published' && q.type?.toLowerCase() === 'evaluation'
      );
      const otherQuestionnaires = questData.filter((q: Questionnaire) => 
        q.status === 'published' && q.type?.toLowerCase() !== 'evaluation'
      );
      setQuestionnaires([...evalQuestionnaires, ...otherQuestionnaires]);
      setOrganizations(orgData);
      
      // Load hierarchy data for assignment generation
      await loadHierarchyData();
    } catch (err) {
      console.error('Error loading options:', err);
      toast({ title: "Error", description: "Failed to load form options", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function loadHierarchyData() {
    try {
      const [staffRes, hierarchyRes] = await Promise.all([
        fetchWithAuth('/evaluation/staff'),
        fetchWithAuth('/evaluation/hierarchy'),
      ]);
      if (staffRes.success) setHierarchyStaff(staffRes.staff || []);
      if (hierarchyRes.success) setHierarchyRelationships(hierarchyRes.hierarchies || []);
    } catch (err) {
      console.error('Error loading hierarchy:', err);
    }
  }

  // Generate assignment preview based on evaluation type
  useEffect(() => {
    generateAssignmentPreview();
  }, [formData.evaluation_type, formData.allow_self_evaluation, hierarchyStaff, hierarchyRelationships]);

  function generateAssignmentPreview() {
    if (hierarchyStaff.length === 0 || hierarchyRelationships.length === 0) {
      setAssignmentPreview([]);
      return;
    }

    const preview: {evaluator: string, evaluatee: string, type: string}[] = [];
    const staffMap = new Map(hierarchyStaff.map(s => [s.id, s.name]));

    hierarchyRelationships.forEach(rel => {
      const staffName = staffMap.get(rel.staff_id) || 'Unknown';
      const managerName = staffMap.get(rel.reports_to_id) || 'Unknown';

      switch (formData.evaluation_type) {
        case 'manager_to_subordinate':
          // Manager evaluates subordinate (downward)
          preview.push({ evaluator: managerName, evaluatee: staffName, type: 'Manager → Subordinate' });
          break;
        case 'subordinate_to_manager':
          // Subordinate evaluates manager (upward)
          preview.push({ evaluator: staffName, evaluatee: managerName, type: 'Subordinate → Manager' });
          break;
        case '360_degree':
          // Both directions
          preview.push({ evaluator: managerName, evaluatee: staffName, type: 'Manager → Subordinate' });
          preview.push({ evaluator: staffName, evaluatee: managerName, type: 'Subordinate → Manager' });
          break;
        case 'peer_to_peer':
          // Will need peer relationships - for now show placeholder
          break;
        case 'self_only':
          // Self evaluation
          break;
      }
    });

    // Add self evaluations if enabled
    if (formData.allow_self_evaluation) {
      hierarchyStaff.forEach(staff => {
        preview.push({ evaluator: staff.name, evaluatee: staff.name, type: 'Self' });
      });
    }

    setAssignmentPreview(preview.slice(0, 10)); // Show first 10 for preview
  }

  async function loadPrograms(orgId: string) {
    try {
      const data = await programsApi.getAll({ organization_id: orgId });
      setPrograms(data);
    } catch (err) {
      console.error('Error loading programs:', err);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Please enter an evaluation name", variant: "error" });
      return;
    }
    if (!formData.questionnaire_id) {
      toast({ title: "Error", description: "Please select a questionnaire", variant: "error" });
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      toast({ title: "Error", description: "Please select start and end dates", variant: "error" });
      return;
    }

    try {
      setSaving(true);
      const data = {
        ...formData,
        status: 'draft' as const,
      };
      
      const result = await evaluationEventsApi.create(data);
      
      // If auto-generate is enabled, generate assignments
      if (formData.auto_generate_assignments && result.data?.id) {
        try {
          await fetchWithAuth(`/evaluation-events/${result.data.id}/generate-assignments`, {
            method: 'POST',
            body: JSON.stringify({
              evaluation_type: formData.evaluation_type,
              allow_self_evaluation: formData.allow_self_evaluation,
            })
          });
          toast({ title: "Success!", description: "Evaluation event created with assignments", variant: "success" });
        } catch (assignErr) {
          console.error('Failed to generate assignments:', assignErr);
          toast({ title: "Warning", description: "Event created but assignments need to be generated manually", variant: "warning" });
        }
      } else {
        toast({ title: "Success!", description: "Evaluation event created successfully", variant: "success" });
      }
      
      router.push('/evaluation-events');
    } catch (err) {
      console.error('Error creating evaluation event:', err);
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create evaluation event", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Evaluation Event</h1>
            <p className="text-gray-500 text-sm mt-1">
              Set up a new hierarchy-based evaluation
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-qsights-cyan mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-qsights-cyan" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Evaluation Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Q1 2026 Staff Performance Evaluation"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Describe the purpose of this evaluation..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Questionnaire <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="questionnaire_id"
                    value={formData.questionnaire_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-indigo-500"
                  >
                    <option value="">Select a questionnaire</option>
                    {questionnaires.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Only published questionnaires are shown
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization (Optional)
                    </label>
                    <select
                      name="organization_id"
                      value={formData.organization_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-indigo-500"
                    >
                      <option value="">All Organizations</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Program (Optional)
                    </label>
                    <select
                      name="program_id"
                      value={formData.program_id}
                      onChange={handleInputChange}
                      disabled={!formData.organization_id}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-indigo-500 disabled:opacity-50"
                    >
                      <option value="">All Programs</option>
                      {programs.map((prog) => (
                        <option key={prog.id} value={prog.id}>
                          {prog.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-qsights-cyan" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      min={formData.start_date}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-indigo-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Evaluation Type - NEW */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5 text-qsights-cyan" />
                  Evaluation Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Manager → Subordinate */}
                  <label 
                    className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.evaluation_type === 'manager_to_subordinate' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="evaluation_type"
                      value="manager_to_subordinate"
                      checked={formData.evaluation_type === 'manager_to_subordinate'}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDown className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Manager → Subordinate</span>
                    </div>
                    <p className="text-xs text-gray-500">Managers evaluate their direct reports</p>
                  </label>

                  {/* Subordinate → Manager (Upward) */}
                  <label 
                    className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.evaluation_type === 'subordinate_to_manager' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="evaluation_type"
                      value="subordinate_to_manager"
                      checked={formData.evaluation_type === 'subordinate_to_manager'}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUp className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Subordinate → Manager</span>
                    </div>
                    <p className="text-xs text-gray-500">Staff evaluate their managers (upward feedback)</p>
                  </label>

                  {/* 360° Evaluation */}
                  <label 
                    className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.evaluation_type === '360_degree' 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="evaluation_type"
                      value="360_degree"
                      checked={formData.evaluation_type === '360_degree'}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="w-5 h-5 text-purple-600" />
                      <span className="font-medium">360° Evaluation</span>
                    </div>
                    <p className="text-xs text-gray-500">Full circle - managers, subordinates, and self</p>
                  </label>

                  {/* Peer to Peer */}
                  <label 
                    className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.evaluation_type === 'peer_to_peer' 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="evaluation_type"
                      value="peer_to_peer"
                      checked={formData.evaluation_type === 'peer_to_peer'}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-orange-600" />
                      <span className="font-medium">Peer to Peer</span>
                    </div>
                    <p className="text-xs text-gray-500">Colleagues at same level evaluate each other</p>
                  </label>

                  {/* Self Evaluation Only */}
                  <label 
                    className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.evaluation_type === 'self_only' 
                        ? 'border-cyan-500 bg-cyan-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="evaluation_type"
                      value="self_only"
                      checked={formData.evaluation_type === 'self_only'}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="w-5 h-5 text-cyan-600" />
                      <span className="font-medium">Self Evaluation</span>
                    </div>
                    <p className="text-xs text-gray-500">Staff evaluate their own performance</p>
                  </label>
                </div>

                {/* Auto-generate toggle */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="auto_generate_assignments"
                      name="auto_generate_assignments"
                      checked={formData.auto_generate_assignments}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-qsights-cyan border-gray-300 rounded focus:ring-qsights-cyan"
                    />
                    <label htmlFor="auto_generate_assignments" className="text-sm font-medium text-gray-700">
                      Auto-generate assignments from hierarchy
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-7">
                    Automatically create evaluation assignments based on your organization's hierarchy structure
                  </p>
                </div>

                {/* Assignment Preview */}
                {formData.auto_generate_assignments && assignmentPreview.length > 0 && (
                  <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Assignment Preview ({hierarchyRelationships.length} relationships found)
                    </h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {assignmentPreview.map((a, idx) => (
                        <div key={idx} className="text-sm text-blue-800 flex items-center gap-2">
                          <span className="font-medium">{a.evaluator}</span>
                          <span className="text-blue-400">→</span>
                          <span>{a.evaluatee}</span>
                          <span className="text-xs bg-blue-200 px-2 py-0.5 rounded">{a.type}</span>
                        </div>
                      ))}
                      {assignmentPreview.length < hierarchyRelationships.length + (formData.allow_self_evaluation ? hierarchyStaff.length : 0) && (
                        <div className="text-xs text-blue-600 italic mt-2">
                          + more assignments will be generated...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {formData.auto_generate_assignments && hierarchyStaff.length === 0 && (
                  <div className="mt-4 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>No hierarchy data found.</strong> Please set up staff and hierarchy relationships in the Evaluation module first.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-qsights-cyan" />
                  Evaluation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="allow_self_evaluation"
                    name="allow_self_evaluation"
                    checked={formData.allow_self_evaluation}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-qsights-cyan border-gray-300 rounded focus:ring-qsights-cyan"
                  />
                  <label htmlFor="allow_self_evaluation" className="text-sm text-gray-700">
                    Allow self-evaluation (staff can also evaluate themselves)
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_anonymous"
                    name="is_anonymous"
                    checked={formData.is_anonymous}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-qsights-cyan border-gray-300 rounded focus:ring-qsights-cyan"
                  />
                  <label htmlFor="is_anonymous" className="text-sm text-gray-700">
                    Anonymous evaluations (hide evaluator identity in reports)
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="show_individual_responses"
                    name="show_individual_responses"
                    checked={formData.show_individual_responses}
                    onChange={handleInputChange}
                    disabled={formData.is_anonymous}
                    className="w-4 h-4 text-qsights-cyan border-gray-300 rounded focus:ring-qsights-cyan disabled:opacity-50"
                  />
                  <label htmlFor="show_individual_responses" className="text-sm text-gray-700">
                    Show individual responses in reports
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Email Template */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-qsights-cyan" />
                  Email Template
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Available placeholders:</p>
                      <ul className="mt-1 list-disc list-inside">
                        <li>{"{{evaluatee_name}}"} - Name of the person being evaluated</li>
                        <li>{"{{evaluator_name}}"} - Name of the manager doing the evaluation</li>
                        <li>{"{{evaluation_link}}"} - Unique link to complete the evaluation</li>
                        <li>{"{{event_name}}"} - Name of this evaluation event</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    name="email_subject"
                    value={formData.email_subject}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Body
                  </label>
                  <textarea
                    name="email_body"
                    value={formData.email_body}
                    onChange={handleInputChange}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-cyan focus:border-indigo-500 font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-qsights-dark text-white rounded-lg hover:bg-qsights-dark/90 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Evaluation Event
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
