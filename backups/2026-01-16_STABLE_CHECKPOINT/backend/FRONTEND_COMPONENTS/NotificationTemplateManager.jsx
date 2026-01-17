// NotificationTemplateManager.jsx
// Main component for managing notification templates in Activity settings

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Tabs, Tab, Box, Typography, Button, Chip, Alert } from '@mui/material';
import NotificationTemplateEditor from './NotificationTemplateEditor';
import NotificationTemplatePreview from './NotificationTemplatePreview';

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

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
    fetchMetadata();
  }, [activityId]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE}/activities/${activityId}/notification-templates`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      setTemplates(response.data.templates || []);
      setNotificationTypes(response.data.available_types || []);
      setPlaceholders(response.data.available_placeholders || {});
      setError(null);
    } catch (err) {
      setError('Failed to load templates: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [typesRes, placeholdersRes] = await Promise.all([
        axios.get(`${API_BASE}/notification-templates/types`, {
          headers: { Authorization: `Bearer ${authToken}` }
        }),
        axios.get(`${API_BASE}/notification-templates/placeholders`, {
          headers: { Authorization: `Bearer ${authToken}` }
        })
      ]);
      setNotificationTypes(typesRes.data.types || []);
      setPlaceholders(placeholdersRes.data.placeholders || {});
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
    }
  };

  const getTemplateForType = (type) => {
    return templates.find(t => t.notification_type === type);
  };

  const hasCustomTemplate = (type) => {
    return templates.some(t => t.notification_type === type);
  };

  const handleEdit = async (type) => {
    try {
      const response = await axios.get(
        `${API_BASE}/activities/${activityId}/notification-templates/type/${type}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      setCurrentTemplate(response.data.template);
      setSelectedType(type);
      setEditorOpen(true);
    } catch (err) {
      setError('Failed to load template: ' + err.message);
    }
  };

  const handleCreate = (type) => {
    setCurrentTemplate({
      notification_type: type,
      subject: '',
      body_html: '',
      body_text: '',
      is_active: true,
      is_default: false
    });
    setSelectedType(type);
    setEditorOpen(true);
  };

  const handleSave = async (templateData) => {
    try {
      await axios.post(
        `${API_BASE}/activities/${activityId}/notification-templates`,
        templateData,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      await fetchTemplates();
      setEditorOpen(false);
      setCurrentTemplate(null);
    } catch (err) {
      throw new Error('Failed to save template: ' + err.message);
    }
  };

  const handleDelete = async (templateId, type) => {
    if (!window.confirm('Delete this template? It will revert to the default template.')) {
      return;
    }

    try {
      await axios.delete(
        `${API_BASE}/activities/${activityId}/notification-templates/${templateId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      await fetchTemplates();
    } catch (err) {
      setError('Failed to delete template: ' + err.message);
    }
  };

  const handlePreview = async (type) => {
    try {
      const response = await axios.get(
        `${API_BASE}/activities/${activityId}/notification-templates/type/${type}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      setCurrentTemplate(response.data.template);
      setSelectedType(type);
      setPreviewOpen(true);
    } catch (err) {
      setError('Failed to load template preview: ' + err.message);
    }
  };

  const getTypeLabel = (type) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getTypeDescription = (type) => {
    const descriptions = {
      invitation: 'Sent when activity is created or published',
      reminder: 'Sent 24 hours before activity starts',
      thank_you: 'Sent after participant submits response',
      program_expiry: 'Sent when program is about to expire',
      activity_summary: 'Sent with activity statistics and results'
    };
    return descriptions[type] || '';
  };

  if (loading) {
    return <div>Loading templates...</div>;
  }

  return (
    <div className="notification-template-manager">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Notification Templates
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Customize email notifications for this activity. Each template supports dynamic placeholders.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {notificationTypes.map((type) => {
          const template = getTemplateForType(type);
          const isCustom = hasCustomTemplate(type);

          return (
            <Box
              key={type}
              sx={{
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                '&:hover': {
                  borderColor: '#1976d2',
                  backgroundColor: '#f5f5f5'
                }
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="h6">
                    {getTypeLabel(type)}
                  </Typography>
                  <Chip
                    label={isCustom ? 'Custom' : 'Default'}
                    color={isCustom ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {getTypeDescription(type)}
                </Typography>
                {isCustom && template && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Subject: {template.subject}
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handlePreview(type)}
                >
                  Preview
                </Button>
                {isCustom ? (
                  <>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleEdit(type)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={() => handleDelete(template.id, type)}
                    >
                      Delete
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleCreate(type)}
                  >
                    Customize
                  </Button>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Editor Modal */}
      {editorOpen && (
        <NotificationTemplateEditor
          open={editorOpen}
          template={currentTemplate}
          placeholders={placeholders}
          activityId={activityId}
          authToken={authToken}
          onSave={handleSave}
          onClose={() => {
            setEditorOpen(false);
            setCurrentTemplate(null);
          }}
        />
      )}

      {/* Preview Modal */}
      {previewOpen && (
        <NotificationTemplatePreview
          open={previewOpen}
          template={currentTemplate}
          type={selectedType}
          activityId={activityId}
          authToken={authToken}
          onClose={() => {
            setPreviewOpen(false);
            setCurrentTemplate(null);
          }}
        />
      )}
    </div>
  );
};

export default NotificationTemplateManager;
