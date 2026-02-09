'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  Clock, 
  Database, 
  TrendingUp, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Settings,
  FileText,
  BarChart3,
  Send,
  Calendar,
  Eye,
  Edit2,
  Info
} from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';
import { toast } from '@/components/ui/toast';

interface NotificationsTabProps {
  programId: string;
  userRole: string;
  programs: any[];
}

interface NotificationConfig {
  id: number;
  program_id: string;
  enable_trigger_notifications: boolean;
  enable_completion_notifications: boolean;
  enable_missed_deadline_alerts: boolean;
  enable_automatic_reminders: boolean;
  reminder_schedule: number[];
  trigger_email_template: string | null;
  completion_email_template: string | null;
  missed_deadline_template: string | null;
  reminder_email_template: string | null;
}

interface EmailTemplate {
  subject: string;
  body: string;
}

const DEFAULT_TEMPLATES = {
  trigger: {
    subject: 'Evaluation Request: {program_name}',
    body: `Hello {evaluator_name},

You have been requested to complete a {program_name} evaluation for your team members.

Evaluation Period: {start_date} to {end_date}

Your subordinates to evaluate:
{subordinates_list}

Please complete the evaluation by clicking the button in your email.

Best regards,
QSights Team`
  },
  reminder: {
    subject: 'Reminder: Pending Evaluation - {program_name}',
    body: `Hello {evaluator_name},

This is a reminder that you have a pending evaluation to complete.

Program: {program_name}
Evaluation Period: {start_date} to {end_date}
Deadline: {deadline_date}

Subordinates pending evaluation:
{subordinates_list}

Please complete the evaluation as soon as possible.

Best regards,
QSights Team`
  },
  completion: {
    subject: 'Evaluation Completed - {program_name}',
    body: `Hello {evaluator_name},

Thank you for completing the {program_name} evaluation.

Evaluation Period: {start_date} to {end_date}
Completed on: {completion_date}

Your feedback has been successfully recorded.

Best regards,
QSights Team`
  },
  missed_deadline: {
    subject: 'Missed Deadline Alert - {program_name}',
    body: `Hello {evaluator_name},

The deadline for the following evaluation has been missed:

Program: {program_name}
Original Deadline: {deadline_date}
Subordinates not evaluated:
{subordinates_list}

Please complete the evaluation as soon as possible.

Best regards,
QSights Team`
  }
};

const NotificationsTab: React.FC<NotificationsTabProps> = ({ programId, userRole, programs }) => {
  const [activeSection, setActiveSection] = useState<'settings' | 'templates' | 'logs' | 'stats'>('settings');
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [editingTemplate, setEditingTemplate] = useState<'trigger' | 'reminder' | 'completion' | 'missed_deadline' | null>(null);
  const [templateDrafts, setTemplateDrafts] = useState<{[key: string]: EmailTemplate}>({});

  useEffect(() => {
    if (programId) {
      loadConfig();
    }
  }, [programId]);

  useEffect(() => {
    if (activeSection === 'logs' && programId) {
      loadLogs();
    } else if (activeSection === 'stats' && programId) {
      loadStats();
    }
  }, [activeSection, programId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/evaluation/notifications/config?program_id=${programId}`, {
        method: 'GET'
      });

      if (response.success) {
        setConfig(response.config);
        // Initialize template drafts with current or default values
        setTemplateDrafts({
          trigger: parseTemplate(response.config.trigger_email_template, DEFAULT_TEMPLATES.trigger),
          reminder: parseTemplate(response.config.reminder_email_template, DEFAULT_TEMPLATES.reminder),
          completion: parseTemplate(response.config.completion_email_template, DEFAULT_TEMPLATES.completion),
          missed_deadline: parseTemplate(response.config.missed_deadline_template, DEFAULT_TEMPLATES.missed_deadline),
        });
      }
    } catch (error: any) {
      toast.error('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const parseTemplate = (templateString: string | null, defaultTemplate: EmailTemplate): EmailTemplate => {
    if (!templateString) return defaultTemplate;
    
    try {
      const parsed = JSON.parse(templateString);
      return {
        subject: parsed.subject || defaultTemplate.subject,
        body: parsed.body || defaultTemplate.body
      };
    } catch {
      return defaultTemplate;
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      const response = await fetchWithAuth(`/evaluation/notifications/config?program_id=${programId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.success) {
        toast.success('Notification settings saved successfully');
      }
    } catch (error: any) {
      toast.error('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const saveTemplate = async (type: 'trigger' | 'reminder' | 'completion' | 'missed_deadline') => {
    if (!config) return;

    const template = templateDrafts[type];
    const templateString = JSON.stringify(template);
    
    const fieldMap = {
      trigger: 'trigger_email_template',
      reminder: 'reminder_email_template',
      completion: 'completion_email_template',
      missed_deadline: 'missed_deadline_template'
    };

    try {
      setSaving(true);
      const updatedConfig = {
        ...config,
        [fieldMap[type]]: templateString
      };

      const response = await fetchWithAuth(`/evaluation/notifications/config?program_id=${programId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });

      if (response.success) {
        setConfig(response.config);
        setEditingTemplate(null);
        toast.success('Email template saved successfully');
      }
    } catch (error: any) {
      toast.error('Failed to save email template');
    } finally {
      setSaving(false);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await fetchWithAuth(`/evaluation/notifications/logs?program_id=${programId}`, {
        method: 'GET'
      });

      if (response.success && response.logs) {
        setLogs(Array.isArray(response.logs.data) ? response.logs.data : []);
      } else {
        setLogs([]);
      }
    } catch (error: any) {
      toast.error('Failed to load notification logs');
      setLogs([]);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetchWithAuth(`/evaluation/notifications/stats?program_id=${programId}`, {
        method: 'GET'
      });

      if (response.success) {
        const emailStats = response.email_stats || {};
        setStats({
          total_sent: emailStats.total_sent || 0,
          pending: emailStats.pending || 0,
          failed: emailStats.failed || 0,
          delivery_rate: emailStats.total_sent > 0 
            ? Math.round(((emailStats.total_sent - emailStats.failed) / emailStats.total_sent) * 100) 
            : 0
        });
      }
    } catch (error: any) {
      toast.error('Failed to load notification statistics');
      setStats({
        total_sent: 0,
        pending: 0,
        failed: 0,
        delivery_rate: 0
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!programId) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-12">
        <div className="text-center">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Program</h3>
          <p className="text-gray-600">Please select a program from the dropdown above to view notification settings</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No notification configuration found</p>
      </div>
    );
  }

  return (
    <div className="-mt-6">
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveSection('settings')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
              activeSection === 'settings'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            Notification Settings
          </button>
          <button
            onClick={() => setActiveSection('templates')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
              activeSection === 'templates'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            Email Templates
          </button>
          <button
            onClick={() => setActiveSection('logs')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
              activeSection === 'logs'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Database className="w-4 h-4" />
            Notification Logs
          </button>
          <button
            onClick={() => setActiveSection('stats')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
              activeSection === 'stats'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Statistics
          </button>
        </div>
      </div>

      {/* Settings Section */}
      {activeSection === 'settings' && (
        <div className="bg-white">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Notification Settings</h2>
                <p className="text-sm text-gray-500 mt-1">Configure when to send email notifications to evaluators</p>
              </div>
              <Bell className="w-8 h-8 text-indigo-600" />
            </div>

            {/* Notification Types Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Initial Trigger Email */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-indigo-300 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Send className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Initial Trigger Email</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Send email when evaluation is first triggered
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enable_trigger_notifications}
                      onChange={(e) => setConfig({ ...config, enable_trigger_notifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* Automatic Reminders */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-indigo-300 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Automatic Reminders</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Send reminder emails before deadline
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enable_automatic_reminders}
                      onChange={(e) => setConfig({ ...config, enable_automatic_reminders: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              </div>

              {/* Completion Confirmation */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-indigo-300 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Completion Confirmation</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Send confirmation when evaluation is completed
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enable_completion_notifications}
                      onChange={(e) => setConfig({ ...config, enable_completion_notifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>

              {/* Missed Deadline Alert */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-indigo-300 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Missed Deadline Alert</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Alert when evaluation deadline is missed
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enable_missed_deadline_alerts}
                      onChange={(e) => setConfig({ ...config, enable_missed_deadline_alerts: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Reminder Schedule */}
            {config.enable_automatic_reminders && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Calendar className="w-5 h-5 text-amber-600 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Reminder Schedule</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Select how many days before the deadline to send reminder emails
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {[7, 5, 3, 2, 1].map((day) => (
                        <button
                          key={day}
                          onClick={() => {
                            const schedule = config.reminder_schedule.includes(day)
                              ? config.reminder_schedule.filter((d) => d !== day)
                              : [...config.reminder_schedule, day].sort((a, b) => b - a);
                            setConfig({ ...config, reminder_schedule: schedule });
                          }}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            config.reminder_schedule.includes(day)
                              ? 'bg-amber-600 text-white shadow-md'
                              : 'bg-white text-gray-700 border border-gray-300 hover:border-amber-400'
                          }`}
                        >
                          {day} day{day > 1 ? 's' : ''} before
                        </button>
                      ))}
                    </div>
                    {config.reminder_schedule.length > 0 && (
                      <p className="text-sm text-amber-700 mt-3 font-medium">
                        ✓ Reminders will be sent: {config.reminder_schedule.sort((a, b) => b - a).join(', ')} days before deadline
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Templates Section */}
      {activeSection === 'templates' && (
        <div className="bg-white">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Email Templates</h2>
                <p className="text-sm text-gray-500 mt-1">Customize email templates for different notification types</p>
              </div>
              <Mail className="w-8 h-8 text-indigo-600" />
            </div>

            {/* Template Cards */}
            <div className="space-y-6">
              {/* Initial Trigger Email Template */}
              <div className="border border-indigo-200 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 border-b border-indigo-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-600 rounded-lg">
                        <Send className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Initial Trigger Email</h3>
                        <p className="text-sm text-gray-600">Sent when evaluation is first triggered</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTemplate(editingTemplate === 'trigger' ? null : 'trigger')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                          editingTemplate === 'trigger'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-indigo-50'
                        }`}
                      >
                        {editingTemplate === 'trigger' ? (
                          <>
                            <Eye className="w-4 h-4" />
                            <span>Preview</span>
                          </>
                        ) : (
                          <>
                            <Edit2 className="w-4 h-4" />
                            <span>Edit</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-white">
                  {editingTemplate === 'trigger' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line</label>
                        <input
                          type="text"
                          value={templateDrafts.trigger?.subject || ''}
                          onChange={(e) => setTemplateDrafts({
                            ...templateDrafts,
                            trigger: { ...templateDrafts.trigger, subject: e.target.value }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Email subject..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Body</label>
                        <textarea
                          value={templateDrafts.trigger?.body || ''}
                          onChange={(e) => setTemplateDrafts({
                            ...templateDrafts,
                            trigger: { ...templateDrafts.trigger, body: e.target.value }
                          })}
                          rows={10}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                          placeholder="Email body content..."
                        />
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                          <p className="font-medium mb-1">Available Placeholders:</p>
                          <p className="text-blue-700">{'{evaluator_name}'}, {'{program_name}'}, {'{start_date}'}, {'{end_date}'}, {'{deadline_date}'}, {'{subordinates_list}'}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => saveTemplate('trigger')}
                          disabled={saving}
                          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          <span>Save Template</span>
                        </button>
                        <button
                          onClick={() => setTemplateDrafts({
                            ...templateDrafts,
                            trigger: DEFAULT_TEMPLATES.trigger
                          })}
                          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                          Reset to Default
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Subject:</p>
                        <p className="text-gray-900">{templateDrafts.trigger?.subject}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Body:</p>
                        <p className="text-gray-900 whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">
                          {templateDrafts.trigger?.body}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Automatic Reminders Template */}
              <div className="border border-amber-200 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-amber-50 to-amber-100 px-6 py-4 border-b border-amber-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-600 rounded-lg">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Automatic Reminders</h3>
                        <p className="text-sm text-gray-600">Sent as reminders before deadline</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTemplate(editingTemplate === 'reminder' ? null : 'reminder')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                          editingTemplate === 'reminder'
                            ? 'bg-amber-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-amber-50'
                        }`}
                      >
                        {editingTemplate === 'reminder' ? (
                          <>
                            <Eye className="w-4 h-4" />
                            <span>Preview</span>
                          </>
                        ) : (
                          <>
                            <Edit2 className="w-4 h-4" />
                            <span>Edit</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-white">
                  {editingTemplate === 'reminder' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line</label>
                        <input
                          type="text"
                          value={templateDrafts.reminder?.subject || ''}
                          onChange={(e) => setTemplateDrafts({
                            ...templateDrafts,
                            reminder: { ...templateDrafts.reminder, subject: e.target.value }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="Email subject..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Body</label>
                        <textarea
                          value={templateDrafts.reminder?.body || ''}
                          onChange={(e) => setTemplateDrafts({
                            ...templateDrafts,
                            reminder: { ...templateDrafts.reminder, body: e.target.value }
                          })}
                          rows={10}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono text-sm"
                          placeholder="Email body content..."
                        />
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                          <p className="font-medium mb-1">Available Placeholders:</p>
                          <p className="text-blue-700">{'{evaluator_name}'}, {'{program_name}'}, {'{start_date}'}, {'{end_date}'}, {'{deadline_date}'}, {'{subordinates_list}'}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => saveTemplate('reminder')}
                          disabled={saving}
                          className="flex items-center gap-2 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                        >
                          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          <span>Save Template</span>
                        </button>
                        <button
                          onClick={() => setTemplateDrafts({
                            ...templateDrafts,
                            reminder: DEFAULT_TEMPLATES.reminder
                          })}
                          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                          Reset to Default
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Subject:</p>
                        <p className="text-gray-900">{templateDrafts.reminder?.subject}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Body:</p>
                        <p className="text-gray-900 whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">
                          {templateDrafts.reminder?.body}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Completion Confirmation Template */}
              <div className="border border-green-200 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-600 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Completion Confirmation</h3>
                        <p className="text-sm text-gray-600">Sent after evaluation is completed</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTemplate(editingTemplate === 'completion' ? null : 'completion')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                          editingTemplate === 'completion'
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-green-50'
                        }`}
                      >
                        {editingTemplate === 'completion' ? (
                          <>
                            <Eye className="w-4 h-4" />
                            <span>Preview</span>
                          </>
                        ) : (
                          <>
                            <Edit2 className="w-4 h-4" />
                            <span>Edit</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-white">
                  {editingTemplate === 'completion' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line</label>
                        <input
                          type="text"
                          value={templateDrafts.completion?.subject || ''}
                          onChange={(e) => setTemplateDrafts({
                            ...templateDrafts,
                            completion: { ...templateDrafts.completion, subject: e.target.value }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Email subject..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Body</label>
                        <textarea
                          value={templateDrafts.completion?.body || ''}
                          onChange={(e) => setTemplateDrafts({
                            ...templateDrafts,
                            completion: { ...templateDrafts.completion, body: e.target.value }
                          })}
                          rows={10}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                          placeholder="Email body content..."
                        />
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                          <p className="font-medium mb-1">Available Placeholders:</p>
                          <p className="text-blue-700">{'{evaluator_name}'}, {'{program_name}'}, {'{start_date}'}, {'{end_date}'}, {'{completion_date}'}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => saveTemplate('completion')}
                          disabled={saving}
                          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          <span>Save Template</span>
                        </button>
                        <button
                          onClick={() => setTemplateDrafts({
                            ...templateDrafts,
                            completion: DEFAULT_TEMPLATES.completion
                          })}
                          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                          Reset to Default
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Subject:</p>
                        <p className="text-gray-900">{templateDrafts.completion?.subject}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Body:</p>
                        <p className="text-gray-900 whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">
                          {templateDrafts.completion?.body}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Missed Deadline Alert Template */}
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-600 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Missed Deadline Alert</h3>
                        <p className="text-sm text-gray-600">Sent when deadline is missed</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTemplate(editingTemplate === 'missed_deadline' ? null : 'missed_deadline')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                          editingTemplate === 'missed_deadline'
                            ? 'bg-red-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-red-50'
                        }`}
                      >
                        {editingTemplate === 'missed_deadline' ? (
                          <>
                            <Eye className="w-4 h-4" />
                            <span>Preview</span>
                          </>
                        ) : (
                          <>
                            <Edit2 className="w-4 h-4" />
                            <span>Edit</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-white">
                  {editingTemplate === 'missed_deadline' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line</label>
                        <input
                          type="text"
                          value={templateDrafts.missed_deadline?.subject || ''}
                          onChange={(e) => setTemplateDrafts({
                            ...templateDrafts,
                            missed_deadline: { ...templateDrafts.missed_deadline, subject: e.target.value }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Email subject..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Body</label>
                        <textarea
                          value={templateDrafts.missed_deadline?.body || ''}
                          onChange={(e) => setTemplateDrafts({
                            ...templateDrafts,
                            missed_deadline: { ...templateDrafts.missed_deadline, body: e.target.value }
                          })}
                          rows={10}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
                          placeholder="Email body content..."
                        />
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                          <p className="font-medium mb-1">Available Placeholders:</p>
                          <p className="text-blue-700">{'{evaluator_name}'}, {'{program_name}'}, {'{deadline_date}'}, {'{subordinates_list}'}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => saveTemplate('missed_deadline')}
                          disabled={saving}
                          className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          <span>Save Template</span>
                        </button>
                        <button
                          onClick={() => setTemplateDrafts({
                            ...templateDrafts,
                            missed_deadline: DEFAULT_TEMPLATES.missed_deadline
                          })}
                          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                          Reset to Default
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Subject:</p>
                        <p className="text-gray-900">{templateDrafts.missed_deadline?.subject}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Body:</p>
                        <p className="text-gray-900 whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">
                          {templateDrafts.missed_deadline?.body}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Section */}
      {activeSection === 'logs' && (
        <div className="bg-white">
          <div className="p-6">
            <div className="flex items-start justify-between pb-4 border-b border-gray-200 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Notification Logs</h2>
                <p className="text-sm text-gray-500 mt-1">View history of all sent notifications</p>
              </div>
              <Database className="w-8 h-8 text-indigo-600" />
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-16">
                <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notification logs yet</h3>
                <p className="text-gray-500">Logs will appear here once notifications are sent</p>
              </div>
            ) : (
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recipient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.sent_at || log.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.recipient_email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <span className="capitalize">{log.notification_type?.replace('_', ' ')}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              log.status === 'sent'
                                ? 'bg-green-100 text-green-800'
                                : log.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics Section */}
      {activeSection === 'stats' && (
        <div className="bg-white">
          <div className="p-6">
            <div className="flex items-start justify-between pb-4 border-b border-gray-200 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Notification Statistics</h2>
                <p className="text-sm text-gray-500 mt-1">Overview of notification delivery performance</p>
              </div>
              <BarChart3 className="w-8 h-8 text-indigo-600" />
            </div>

            {!stats ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-blue-500 text-white rounded-lg">
                      <Send className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm text-blue-700 font-medium mb-1">Total Sent</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.total_sent || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-green-500 text-white rounded-lg">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm text-green-700 font-medium mb-1">Delivery Rate</p>
                  <p className="text-3xl font-bold text-green-900">{stats.delivery_rate || 0}%</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-amber-500 text-white rounded-lg">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm text-amber-700 font-medium mb-1">Pending</p>
                  <p className="text-3xl font-bold text-amber-900">{stats.pending || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-red-500 text-white rounded-lg">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm text-red-700 font-medium mb-1">Failed</p>
                  <p className="text-3xl font-bold text-red-900">{stats.failed || 0}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsTab;
