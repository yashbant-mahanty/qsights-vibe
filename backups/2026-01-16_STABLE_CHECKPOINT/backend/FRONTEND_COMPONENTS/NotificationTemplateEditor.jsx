// NotificationTemplateEditor.jsx
// Rich editor for creating/editing notification templates

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  IconButton,
  Alert,
  Switch,
  FormControlLabel,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import { Close as CloseIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const NotificationTemplateEditor = ({
  open,
  template,
  placeholders,
  activityId,
  authToken,
  onSave,
  onClose
}) => {
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [placeholderMenuAnchor, setPlaceholderMenuAnchor] = useState(null);
  const [activeField, setActiveField] = useState(null);
  
  const subjectInputRef = useRef(null);
  const quillRef = useRef(null);

  useEffect(() => {
    if (template) {
      setSubject(template.subject || '');
      setBodyHtml(template.body_html || '');
      setBodyText(template.body_text || '');
      setIsActive(template.is_active !== false);
    }
  }, [template]);

  const handlePlaceholderClick = (event, field) => {
    setActiveField(field);
    setPlaceholderMenuAnchor(event.currentTarget);
  };

  const insertPlaceholder = (placeholder) => {
    const placeholderText = `{{${placeholder}}}`;

    if (activeField === 'subject') {
      const input = subjectInputRef.current;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const newValue = subject.substring(0, start) + placeholderText + subject.substring(end);
      setSubject(newValue);
      
      // Set cursor position after inserted placeholder
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = start + placeholderText.length;
        input.focus();
      }, 0);
    } else if (activeField === 'html') {
      const quill = quillRef.current?.getEditor();
      if (quill) {
        const range = quill.getSelection(true);
        quill.insertText(range.index, placeholderText);
        quill.setSelection(range.index + placeholderText.length);
      }
    } else if (activeField === 'text') {
      setBodyText(prev => prev + placeholderText);
    }

    setPlaceholderMenuAnchor(null);
  };

  const handleSave = async () => {
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }

    if (!bodyHtml.trim()) {
      setError('Email body is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        notification_type: template.notification_type,
        subject: subject.trim(),
        body_html: bodyHtml.trim(),
        body_text: bodyText.trim() || undefined,
        is_active: isActive
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ]
  };

  const copyPlaceholder = (placeholder) => {
    navigator.clipboard.writeText(`{{${placeholder}}}`);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Edit {template?.notification_type?.split('_').map(w => 
              w.charAt(0).toUpperCase() + w.slice(1)
            ).join(' ')} Template
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Subject Field */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2">Email Subject *</Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => handlePlaceholderClick(e, 'subject')}
            >
              Insert Placeholder
            </Button>
          </Box>
          <TextField
            fullWidth
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., You're invited: {{activity_name}}"
            inputRef={subjectInputRef}
          />
        </Box>

        {/* HTML Body Field */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2">Email Body (HTML) *</Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => handlePlaceholderClick(e, 'html')}
            >
              Insert Placeholder
            </Button>
          </Box>
          <Box sx={{ 
            border: '1px solid #e0e0e0', 
            borderRadius: 1,
            '& .quill': { height: '300px' }
          }}>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={bodyHtml}
              onChange={setBodyHtml}
              modules={modules}
            />
          </Box>
        </Box>

        {/* Plain Text Field (Optional) */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2">
              Plain Text Version (Optional)
              <Typography variant="caption" display="block" color="text.secondary">
                Auto-generated from HTML if left empty
              </Typography>
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => handlePlaceholderClick(e, 'text')}
            >
              Insert Placeholder
            </Button>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="Plain text version of the email..."
          />
        </Box>

        {/* Active Toggle */}
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
            }
            label="Template Active"
          />
        </Box>

        {/* Available Placeholders Info */}
        <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Available Placeholders:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {Object.keys(placeholders).map((key) => (
              <Tooltip key={key} title={placeholders[key]} arrow>
                <Chip
                  label={`{{${key}}}`}
                  size="small"
                  onClick={() => copyPlaceholder(key)}
                  icon={<CopyIcon fontSize="small" />}
                  sx={{ cursor: 'pointer' }}
                />
              </Tooltip>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Click any placeholder to copy. Placeholders are automatically replaced with actual data when sending emails.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Template'}
        </Button>
      </DialogActions>

      {/* Placeholder Menu */}
      <Menu
        anchorEl={placeholderMenuAnchor}
        open={Boolean(placeholderMenuAnchor)}
        onClose={() => setPlaceholderMenuAnchor(null)}
      >
        {Object.entries(placeholders).map(([key, description]) => (
          <MenuItem 
            key={key} 
            onClick={() => insertPlaceholder(key)}
            sx={{ display: 'flex', justifyContent: 'space-between', minWidth: 300 }}
          >
            <Typography variant="body2" fontFamily="monospace">
              {`{{${key}}}`}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
              {description}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </Dialog>
  );
};

export default NotificationTemplateEditor;
