// NotificationTemplatePreview.jsx
// Preview notification template with sample data

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
  Alert
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import axios from 'axios';

const NotificationTemplatePreview = ({
  open,
  template,
  type,
  activityId,
  authToken,
  onClose
}) => {
  const [preview, setPreview] = useState(null);
  const [sampleData, setSampleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    if (open && template) {
      fetchPreview();
    }
  }, [open, template]);

  const fetchPreview = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE}/activities/${activityId}/notification-templates/preview`,
        {
          notification_type: template.notification_type || type,
          subject: template.subject,
          body_html: template.body_html,
          body_text: template.body_text
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      setPreview(response.data.preview);
      setSampleData(response.data.sample_data);
    } catch (err) {
      setError('Failed to generate preview: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Template Preview
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
              <Tab label="HTML Preview" />
              <Tab label="Plain Text" />
              <Tab label="Sample Data" />
            </Tabs>

            {/* HTML Preview Tab */}
            {activeTab === 0 && preview && (
              <Box>
                <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Subject:
                  </Typography>
                  <Typography variant="body1">
                    {preview.subject}
                  </Typography>
                </Box>
                
                <Box sx={{ 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 1,
                  p: 2,
                  bgcolor: 'white',
                  minHeight: '400px'
                }}>
                  <iframe
                    srcDoc={preview.body_html}
                    style={{
                      width: '100%',
                      height: '400px',
                      border: 'none'
                    }}
                    title="Email Preview"
                  />
                </Box>
              </Box>
            )}

            {/* Plain Text Tab */}
            {activeTab === 1 && preview && (
              <Box>
                <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Subject:
                  </Typography>
                  <Typography variant="body1">
                    {preview.subject}
                  </Typography>
                </Box>
                
                <Box sx={{ 
                  p: 2,
                  bgcolor: '#f9f9f9',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  minHeight: '400px'
                }}>
                  {preview.body_text}
                </Box>
              </Box>
            )}

            {/* Sample Data Tab */}
            {activeTab === 2 && sampleData && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Sample data used for this preview:
                </Typography>
                <Box sx={{ 
                  p: 2,
                  bgcolor: '#f9f9f9',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  maxHeight: '500px',
                  overflow: 'auto'
                }}>
                  {Object.entries(sampleData).map(([key, value]) => (
                    <Box key={key} sx={{ mb: 1 }}>
                      <Typography 
                        component="span" 
                        sx={{ color: '#1976d2', fontWeight: 'bold' }}
                      >
                        {`{{${key}}}`}
                      </Typography>
                      <Typography component="span">
                        {' → '}
                      </Typography>
                      <Typography 
                        component="span"
                        sx={{ color: '#2e7d32' }}
                      >
                        {JSON.stringify(value)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Alert severity="info" sx={{ mt: 2 }}>
                  These are sample values. Actual emails will use real participant and activity data.
                </Alert>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
        <Button 
          variant="outlined"
          onClick={fetchPreview}
          disabled={loading}
        >
          Refresh Preview
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationTemplatePreview;
