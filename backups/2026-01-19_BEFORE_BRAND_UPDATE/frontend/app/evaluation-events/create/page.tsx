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
} from "lucide-react";
import { evaluationEventsApi, questionnairesApi, organizationsApi, programsApi, type Questionnaire, type Organization, type Program } from "@/lib/api";
import { toast } from "@/components/ui/toast";

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
    allow_self_evaluation: false,
    is_anonymous: true,
    show_individual_responses: false,
    hierarchy_levels: 1, // 1 = direct reports only, null = all levels
    email_subject: "Evaluation Request: {{evaluatee_name}}",
    email_body: "Dear Manager,\n\nYou have been requested to complete an evaluation for {{evaluatee_name}}.\n\nPlease click the link below to complete the evaluation:\n{{evaluation_link}}\n\nThank you.",
  });

  // Dropdown options
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

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
      setQuestionnaires(questData.filter((q: Questionnaire) => q.status === 'published'));
      setOrganizations(orgData);
    } catch (err) {
      console.error('Error loading options:', err);
      toast({ title: "Error", description: "Failed to load form options", variant: "error" });
    } finally {
      setLoading(false);
    }
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

    try {
      setSaving(true);
      const data = {
        ...formData,
        status: 'draft' as const,
        hierarchy_levels: formData.hierarchy_levels || null,
      };
      
      await evaluationEventsApi.create(data);
      toast({ title: "Success!", description: "Evaluation event created successfully", variant: "success" });
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-indigo-600" />
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
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
                  <Calendar className="w-5 h-5 text-indigo-600" />
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
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
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
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
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
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
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <label htmlFor="show_individual_responses" className="text-sm text-gray-700">
                    Show individual responses in reports
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hierarchy Depth
                  </label>
                  <select
                    name="hierarchy_levels"
                    value={formData.hierarchy_levels}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value={1}>Direct Reports Only</option>
                    <option value={2}>Up to 2 Levels</option>
                    <option value={3}>Up to 3 Levels</option>
                    <option value="">All Levels (Full Hierarchy)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    How many levels down the hierarchy can a manager evaluate
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Email Template */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
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
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
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
