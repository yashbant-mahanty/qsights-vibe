"use client";

// NotificationTemplateManager.jsx
// Main component for managing notification templates in Activity settings
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import DeleteConfirmationModal from '@/components/delete-confirmation-modal';
import NotificationTemplateEditor from './NotificationTemplateEditor';
import NotificationTemplatePreview from './NotificationTemplatePreview';
import SendNotificationPanel from './SendNotificationPanel';

const NotificationTemplateManager = ({ activityId, authToken }) => {
  const [templates, setTemplates] = useState([]);
  const [notificationTypes, setNotificationTypes] = useState([]);
  const [placeholders, setPlaceholders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, templateId: null, templateName: null });
  const [sendPanelOpen, setSendPanelOpen] = useState(false);
  const [selectedTemplateForSend, setSelectedTemplateForSend] = useState(null);

  // Get auth token
  const getAuthToken = useCallback(() => {
    if (authToken) return authToken;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || '';
    }
    return '';
  }, [authToken]);

  // Fetch helper
  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const token = getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }, [getAuthToken]);

  // Load templates
  const loadData = useCallback(async () => {
    if (!activityId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      const [templatesResponse, placeholdersData] = await Promise.all([
        fetchWithAuth(`/api/activities/${activityId}/notification-templates`),
        fetchWithAuth(`/api/notification-templates/placeholders`),
      ]);

      setTemplates(templatesResponse.data || []);
      setNotificationTypes(templatesResponse.available_types || []);
      setPlaceholders(placeholdersData.data || {});
    } catch (err) {
      setError(err.message || 'Failed to load templates');
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  }, [activityId, fetchWithAuth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = useCallback((type) => {
    const template = templates.find(t => t.notification_type === type);
    setCurrentTemplate(template || { notification_type: type });
    setSelectedType(type);
    setEditorOpen(true);
  }, [templates]);

  const handleSave = useCallback(async (templateData) => {
    try {
      const hasCustomTemplate = currentTemplate?.id && !currentTemplate?.is_default;
      
      const url = hasCustomTemplate
        ? `/api/activities/${activityId}/notification-templates/${currentTemplate.id}`
        : `/api/activities/${activityId}/notification-templates`;

      const method = hasCustomTemplate ? 'PUT' : 'POST';

      await fetchWithAuth(url, {
        method,
        body: JSON.stringify({
          notification_type: selectedType,
          ...templateData,
        }),
      });

      setSuccessMessage(`Template ${hasCustomTemplate ? 'updated' : 'created'} successfully!`);
      setEditorOpen(false);
      await loadData();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      throw new Error(err.message || 'Failed to save template');
    }
  }, [activityId, currentTemplate, selectedType, fetchWithAuth, loadData]);

  const handleDeleteClick = useCallback((template) => {
    if (!template?.id || template?.is_default) {
      setError('Cannot delete default template');
      return;
    }

    setDeleteModal({
      isOpen: true,
      templateId: template.id,
      templateName: template.notification_type?.replace(/_/g, ' ')
    });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteModal.templateId) return;

    try {
      await fetchWithAuth(`/api/activities/${activityId}/notification-templates/${deleteModal.templateId}`, {
        method: 'DELETE',
      });

      setSuccessMessage('Template deleted successfully! Reverted to default.');
      await loadData();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete template');
    }
  }, [activityId, deleteModal.templateId, fetchWithAuth, loadData]);

  const handlePreview = useCallback((type) => {
    const template = templates.find(t => t.notification_type === type);
    setCurrentTemplate(template || { notification_type: type });
    setSelectedType(type);
    setPreviewOpen(true);
  }, [templates]);

  const isCustomTemplate = useCallback((template) => {
    return template && template.id && !template.is_default;
  }, []);

  const handleSend = useCallback((template) => {
    setSelectedTemplateForSend(template);
    setSendPanelOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-qsights-blue mr-2" />
        <span className="text-gray-600">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-800">{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-green-800">{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="text-green-600 hover:text-green-800">
            ×
          </button>
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm text-gray-600">
          Customize email templates for this activity. Custom templates override defaults.
          Click <strong>Customize</strong> to edit any template, or <strong>Preview</strong> to see how it looks.
        </p>
      </div>

      {templates.length === 0 && !loading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          No templates available. Please refresh the page.
        </div>
      )}

      <div className="space-y-3">
        {templates.map((template) => {
          const isCustom = isCustomTemplate(template);
          
          return (
            <div
              key={template.notification_type}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-4 flex-1">
                <h3 className="min-w-[180px] font-medium text-gray-900 capitalize">
                  {template.notification_type.replace(/_/g, ' ')}
                </h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  isCustom 
                    ? 'bg-qsights-blue text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {isCustom ? 'Custom' : 'Default'}
                </span>
                {isCustom && template.updated_at && (
                  <span className="text-xs text-gray-500">
                    Last modified: {new Date(template.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(template.notification_type)}
                >
                  {isCustom ? 'Edit' : 'Customize'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(template.notification_type)}
                >
                  Preview
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSend(template)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Send
                </Button>
                {isCustom && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(template)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editorOpen && currentTemplate && (
        <NotificationTemplateEditor
          open={editorOpen}
          template={currentTemplate}
          notificationType={selectedType}
          placeholders={placeholders}
          onSave={handleSave}
          onClose={() => setEditorOpen(false)}
        />
      )}

      {previewOpen && currentTemplate && (
        <NotificationTemplatePreview
          open={previewOpen}
          activityId={activityId}
          notificationType={selectedType}
          template={currentTemplate}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, templateId: null, templateName: null })}
        onConfirm={confirmDelete}
        title="Delete Custom Template?"
        itemName={deleteModal.templateName || undefined}
        itemType="custom email template (will revert to default)"
      />

      {sendPanelOpen && (
        <SendNotificationPanel
          activityId={activityId}
          templates={templates}
          selectedTemplate={selectedTemplateForSend}
          onClose={() => {
            setSendPanelOpen(false);
            setSelectedTemplateForSend(null);
          }}
        />
      )}
    </div>
  );
};

export default NotificationTemplateManager;
