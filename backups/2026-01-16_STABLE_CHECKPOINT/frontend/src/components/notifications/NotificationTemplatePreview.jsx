"use client";

// NotificationTemplatePreview.jsx
// Preview modal for notification templates with sample data
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const NotificationTemplatePreview = ({
  open,
  activityId,
  notificationType,
  template,
  onClose,
}) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // Get auth token
  const getAuthToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || '';
    }
    return '';
  }, []);

  // Fetch with auth
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
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }, [getAuthToken]);

  // Load preview
  const loadPreview = useCallback(async () => {
    if (!activityId || !notificationType || !template) {
      setError('Missing required data for preview');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Backend preview expects: notification_type, subject, body_html, body_text
      const requestData = {
        notification_type: notificationType,
        subject: template?.subject || '',
        body_html: template?.body_html || '',
        body_text: template?.body_text || '',
      };

      console.log('Preview request:', requestData);

      const data = await fetchWithAuth(
        `${API_URL}/activities/${activityId}/notification-templates/preview`,
        {
          method: 'POST',
          body: JSON.stringify(requestData),
        }
      );

      console.log('Preview response:', data);
      
      // Backend returns { preview: { subject, body_html, body_text }, sample_data: {...} }
      setPreview({
        subject: data.preview?.subject || '',
        body_html: data.preview?.body_html || '',
        body_text: data.preview?.body_text || '',
        sample_data: data.sample_data || {},
      });
    } catch (err) {
      const errorMessage = err.message || 'Failed to load preview';
      setError(errorMessage);
      console.error('Error loading preview:', err);
    } finally {
      setLoading(false);
    }
  }, [activityId, notificationType, template, fetchWithAuth]);

  useEffect(() => {
    if (open) {
      loadPreview();
    }
  }, [open, loadPreview]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Preview: {notificationType?.replace(/_/g, ' ')} Template
          </Typography>
          {preview && template && (
            <Chip 
              label={template?.is_default ? 'Default Template' : 'Custom Template'} 
              size="small"
              color={template?.is_default ? 'default' : 'primary'}
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Generating preview...</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Error loading preview:</Typography>
            <Typography variant="body2">{error}</Typography>
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              Please try refreshing or check the browser console for details.
            </Typography>
          </Alert>
        )}

        {!loading && !error && preview && (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="HTML Preview" />
                <Tab label="Plain Text" />
                <Tab label="Sample Data" />
              </Tabs>
            </Box>

            {tabValue === 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Subject:
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                  {preview?.subject || 'No subject'}
                </Typography>

                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Email Body:
                </Typography>
                <Box
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                    bgcolor: 'background.paper',
                    minHeight: 300,
                    maxHeight: 500,
                    overflow: 'auto',
                  }}
                >
                  <iframe
                    srcDoc={preview?.body_html || '<p>No content</p>'}
                    style={{
                      width: '100%',
                      minHeight: '400px',
                      border: 'none',
                    }}
                    title="Email Preview"
                  />
                </Box>
              </Box>
            )}

            {tabValue === 1 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Plain Text Version:
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    minHeight: 300,
                    maxHeight: 500,
                    overflow: 'auto',
                    fontSize: '0.875rem',
                  }}
                >
                  {preview?.body_text || 'No plain text version'}
                </Box>
              </Box>
            )}

            {tabValue === 2 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                  Sample Data Used for Placeholders:
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  This is sample data used to replace placeholders like {'{{participant_name}}'} in the template.
                </Alert>
                <Box
                  component="pre"
                  sx={{
                    p: 2,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    overflow: 'auto',
                    fontSize: '0.875rem',
                    maxHeight: 400,
                  }}
                >
                  {JSON.stringify(preview?.sample_data || {}, null, 2)}
                </Box>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={loadPreview} disabled={loading} variant="outlined">
          Refresh Preview
        </Button>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationTemplatePreview;
