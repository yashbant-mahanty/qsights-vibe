"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, Trash2, Power, X, Upload, Download, Mail, Send, CheckSquare, Square, AlertCircle, CheckCircle2, Edit, Search, ChevronLeft, ChevronRight, Filter, FileText, Eye, Edit2, Users, Inbox, MessageSquare, Info, Star, CheckCircle, Settings, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from '@/components/ui/toast';
import DeleteConfirmationModal from '@/components/delete-confirmation-modal';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://prod.qsights.com/api';

const ActivityParticipantsAndNotifications = ({ activityId, activityName }) => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState(null);

  // Modal states
  const [addNewModalOpen, setAddNewModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState('create'); // 'create' or 'existing'
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [sendNotificationModalOpen, setSendNotificationModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, participantId: null, participantName: null });

  // Import from existing participants states
  const [allExistingParticipants, setAllExistingParticipants] = useState([]);
  const [existingSearchQuery, setExistingSearchQuery] = useState('');
  const [selectedExistingParticipants, setSelectedExistingParticipants] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Form states
  const [participantForm, setParticipantForm] = useState({});
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  // Notification states
  const [notificationType, setNotificationType] = useState('invitation');
  const [selectedForNotification, setSelectedForNotification] = useState([]);
  const [selectAllNotification, setSelectAllNotification] = useState(false);
  const [sending, setSending] = useState(false);

  // Template editor states
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const [editingTemplateType, setEditingTemplateType] = useState(null);
  const [templateContent, setTemplateContent] = useState({ subject: '', body: '' });
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [previewRendered, setPreviewRendered] = useState({ subject: '', body_html: '' });

  // Send notification modal search
  const [notificationSearchQuery, setNotificationSearchQuery] = useState('');

  // Email-Embedded Survey states
  const [emailEmbeddedModalOpen, setEmailEmbeddedModalOpen] = useState(false);
  const [embeddedQuestions, setEmbeddedQuestions] = useState([]);
  const [selectedEmbeddedQuestions, setSelectedEmbeddedQuestions] = useState([]);
  const [embeddedRecipients, setEmbeddedRecipients] = useState([]);
  const [embeddedSearchQuery, setEmbeddedSearchQuery] = useState('');
  const [sendingEmbedded, setSendingEmbedded] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  // Email-Embedded Survey email config states
  const [embeddedEmailConfig, setEmbeddedEmailConfig] = useState({
    subject: '',
    fromName: '',
    preheader: '',
    headerText: '',
    footerText: '',
  });

  // Pagination and filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Notification settings states
  const [welcomeEmailEnabled, setWelcomeEmailEnabled] = useState(false);
  const [thankYouEmailEnabled, setThankYouEmailEnabled] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Contact Us settings states
  const [contactUsRecipient, setContactUsRecipient] = useState('');
  const [contactUsCc, setContactUsCc] = useState([]);
  const [contactUsBcc, setContactUsBcc] = useState([]);
  const [notifyProgramAdmin, setNotifyProgramAdmin] = useState(true);
  const [notifyManager, setNotifyManager] = useState(true);
  const [savingContactUsSettings, setSavingContactUsSettings] = useState(false);
  const [ccInputValue, setCcInputValue] = useState('');
  const [bccInputValue, setBccInputValue] = useState('');
  
  // Portal mount state
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const notificationTypes = [
    { value: 'invitation', label: 'Invitation' },
    { value: 'reminder', label: 'Reminder' },
    { value: 'thank-you', label: 'Thank You' },
    { value: 'program-expiry', label: 'Program Expiry' },
    { value: 'activity-summary', label: 'Activity Summary' },
  ];

  // Filtered and paginated participants
  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = searchQuery === '' || 
      participant.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      participant.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || participant.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedParticipants = filteredParticipants.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Note: In production, backendToken is HttpOnly so JS cannot read it.
  // We use credentials: 'include' in fetch to let browser send cookie automatically.
  // Auth state is checked via useAuth() hook which queries /api/auth/me.

  // Initialize form with activity fields
  const initializeForm = useCallback((existingData = {}) => {
    const formData = {
      name: existingData.name || '',
      email: existingData.email || '',
    };

    // Add registration form fields
    if (activity?.registration_form_fields) {
      activity.registration_form_fields.forEach(field => {
        if (field.name !== 'name' && field.name !== 'email') {
          formData[field.name] = existingData[field.name] || existingData.additional_data?.[field.name] || '';
        }
      });
    } else {
      // Default fields if no registration form
      formData.phone = existingData.phone || '';
      formData.notes = existingData.notes || '';
    }

    return formData;
  }, [activity]);

  // Fetch activity details
  const fetchActivityDetails = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/activities/${activityId}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        throw new Error('Failed to fetch activity');
      }
      const result = await response.json();
      setActivity(result.data);
      
      // Load notification settings
      const notificationSettings = result.data.settings?.notifications || {};
      setWelcomeEmailEnabled(notificationSettings.welcome_email_enabled ?? false);
      setThankYouEmailEnabled(notificationSettings.thank_you_email_enabled ?? false);
      
      // Load Contact Us settings
      const contactUsSettings = result.data.settings?.contact_us || {};
      setContactUsRecipient(contactUsSettings.recipient_email || '');
      setContactUsCc(contactUsSettings.cc_emails || []);
      setContactUsBcc(contactUsSettings.bcc_emails || []);
      setNotifyProgramAdmin(contactUsSettings.notify_program_admin ?? true);
      setNotifyManager(contactUsSettings.notify_manager ?? true);
      
      console.log('✓ Activity loaded:', result.data.name);
      console.log('✓ Registration fields:', result.data.registration_form_fields);
    } catch (err) {
      console.error('Error fetching activity:', err);
    }
  }, [activityId]);

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/activities/${activityId}/participants`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        throw new Error('Failed to fetch participants');
      }
      
      const result = await response.json();
      setParticipants(result.data || []);
      console.log(`✓ Loaded ${result.data?.length || 0} participants`);
    } catch (err) {
      toast({ title: "Error", description: err.message || 'Failed to fetch participants', variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  // Fetch all existing participants (not yet linked to this activity)
  const fetchExistingParticipants = useCallback(async () => {
    try {
      setLoadingExisting(true);
      
      const response = await fetch(`${API_URL}/participants`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch existing participants');
      
      const result = await response.json();
      const allParticipants = result.data || [];
      
      // Filter out participants already linked to this activity
      const currentParticipantIds = participants.map(p => p.id);
      const availableParticipants = allParticipants.filter(p => 
        !currentParticipantIds.includes(p.id) && 
        !p.deleted_at &&
        p.status === 'active'
      );
      
      setAllExistingParticipants(availableParticipants);
      console.log(`✓ Found ${availableParticipants.length} available participants to import`);
    } catch (err) {
      console.error('Error fetching existing participants:', err);
    } finally {
      setLoadingExisting(false);
    }
  }, [participants]);

  // Fetch template by type
  const fetchTemplate = useCallback(async (templateType) => {
    try {
      setTemplateLoading(true);
      
      const response = await fetch(`${API_URL}/activities/${activityId}/notification-templates/type/${templateType}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('Failed to fetch template');
        // Use empty template if fetch fails
        setTemplateContent({ subject: '', body: '' });
        return;
      }
      
      const result = await response.json();
      const template = result.template;
      
      if (template) {
        setTemplateContent({
          subject: template.subject || '',
          body: template.body_html || template.body || '',
        });
        console.log('✓ Template loaded:', templateType, template.subject);
      } else {
        setTemplateContent({ subject: '', body: '' });
      }
    } catch (err) {
      console.error('Error fetching template:', err);
      setTemplateContent({ subject: '', body: '' });
    } finally {
      setTemplateLoading(false);
    }
  }, [activityId]);

  // Save template
  const handleSaveTemplate = useCallback(async () => {
    if (!editingTemplateType) return;
    
    try {
      setTemplateSaving(true);
      
      const payload = {
        notification_type: editingTemplateType,
        subject: templateContent.subject,
        body_html: templateContent.body,
        is_active: true,
      };
      
      const response = await fetch(`${API_URL}/activities/${activityId}/notification-templates`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save template');
      }
      
      toast({ title: "Success!", description: "Template saved successfully!", variant: "success" });
      setTemplateEditorOpen(false);
      console.log('✓ Template saved:', editingTemplateType);
    } catch (err) {
      console.error('Error saving template:', err);
      toast({ title: "Error", description: err.message || "Failed to save template", variant: "error" });
    } finally {
      setTemplateSaving(false);
    }
  }, [activityId, editingTemplateType, templateContent]);

  // Fetch rendered preview with QR code from backend
  const fetchRenderedPreview = useCallback(async (templateType) => {
    try {
      setTemplateLoading(true);
      
      // First get the template content
      const templateResponse = await fetch(`${API_URL}/activities/${activityId}/notification-templates/type/${templateType}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!templateResponse.ok) {
        console.error('Failed to fetch template for preview');
        return;
      }
      
      const templateResult = await templateResponse.json();
      const template = templateResult.template;
      
      if (template) {
        setTemplateContent({
          subject: template.subject || '',
          body: template.body_html || template.body || '',
        });
        
        // Now call the preview endpoint to get rendered HTML with QR code
        const previewResponse = await fetch(`${API_URL}/activities/${activityId}/notification-templates/preview`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notification_type: templateType,
            subject: template.subject || '',
            body_html: template.body_html || template.body || '',
          }),
        });
        
        if (previewResponse.ok) {
          const previewResult = await previewResponse.json();
          setPreviewRendered({
            subject: previewResult.preview?.subject || template.subject || '',
            body_html: previewResult.preview?.body_html || template.body_html || '',
          });
          console.log('✓ Preview rendered with QR code');
        } else {
          // Fallback to template content if preview fails
          setPreviewRendered({
            subject: template.subject || '',
            body_html: template.body_html || template.body || '',
          });
        }
      } else {
        setTemplateContent({ subject: '', body: '' });
        setPreviewRendered({ subject: '', body_html: '' });
      }
    } catch (err) {
      console.error('Error fetching rendered preview:', err);
      setPreviewRendered({ subject: '', body_html: '' });
    } finally {
      setTemplateLoading(false);
    }
  }, [activityId]);

  // Load template when editor opens
  useEffect(() => {
    if (templateEditorOpen && editingTemplateType) {
      fetchTemplate(editingTemplateType);
    }
  }, [templateEditorOpen, editingTemplateType, fetchTemplate]);

  // Load rendered preview when preview opens
  useEffect(() => {
    if (templatePreviewOpen && editingTemplateType) {
      fetchRenderedPreview(editingTemplateType);
    }
  }, [templatePreviewOpen, editingTemplateType, fetchRenderedPreview]);

  // Wait for auth to load, then fetch data
  useEffect(() => {
    // Don't do anything while auth is loading
    if (authLoading) return;
    
    // Check if user is authenticated using useAuth state
    if (!currentUser) {
      toast({ title: "Error", description: "Not authenticated. Please log in to manage participants.", variant: "error" });
      setLoading(false);
      return;
    }
    
    fetchActivityDetails();
    fetchParticipants();
  }, [fetchActivityDetails, fetchParticipants, currentUser, authLoading]);

  // Initialize form when activity loads
  useEffect(() => {
    if (activity && !addNewModalOpen && !editModalOpen) {
      setParticipantForm(initializeForm());
    }
  }, [activity, addNewModalOpen, editModalOpen, initializeForm]);

  // Add new participant
  const handleAddNewParticipant = useCallback(async () => {
    if (!participantForm.name || !participantForm.email) {
      toast({ title: "Validation Error", description: "Name and email are required", variant: "warning" });
      return;
    }

    try {
      // Build payload
      const payload = {
        name: participantForm.name,
        email: participantForm.email,
      };

      // Add standard optional fields
      if (participantForm.phone) payload.phone = participantForm.phone;
      if (participantForm.notes) payload.notes = participantForm.notes;

      // Add custom fields to additional_data
      const additionalData = {};
      if (activity?.registration_form_fields) {
        activity.registration_form_fields.forEach(field => {
          if (field.name !== 'name' && field.name !== 'email' && field.name !== 'phone' && field.name !== 'notes') {
            if (participantForm[field.name]) {
              additionalData[field.name] = participantForm[field.name];
            }
          }
        });
        if (Object.keys(additionalData).length > 0) {
          payload.additional_data = additionalData;
        }
      }

      console.log('Adding participant:', payload);
      
      const response = await fetch(`${API_URL}/activities/${activityId}/participants/new`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        if (response.status === 409) {
          throw new Error(result?.message || 'This email is already added to this activity.');
        }

        const message = result?.message || '';
        // Backend sometimes returns 500 with DB unique constraint when participant exists globally
        if (message.includes('participants_email_unique')) {
          throw new Error('A participant with this email already exists. Use "Import from Existing" to link them to this activity.');
        }

        const validationMessage = result?.message || (result?.errors ? Object.values(result.errors).flat()[0] : null);
        throw new Error(validationMessage || 'Failed to add participant');
      }

      const resultMessage = result?.message || 'Participant added successfully';
      const isExisting = resultMessage.toLowerCase().includes('existing participant');
      toast({
        title: isExisting ? 'Participant reused' : 'Success!',
        description: resultMessage,
        variant: isExisting ? 'info' : 'success'
      });
      setAddNewModalOpen(false);
      setParticipantForm(initializeForm());
      fetchParticipants();
    } catch (err) {
      console.error('Error adding participant:', err);
      toast({ title: "Error", description: err.message || 'Failed to add participant', variant: "error" });
    }
  }, [activityId, participantForm, activity, fetchParticipants, initializeForm]);

  // Link existing participants to activity
  const handleLinkExistingParticipants = useCallback(async () => {
    if (selectedExistingParticipants.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one participant", variant: "warning" });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/activities/${activityId}/participants/existing`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          participant_ids: selectedExistingParticipants
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        throw new Error(result.message || 'Failed to add participants');
      }

      const message = `Successfully linked ${result.added} participant(s)` + 
        (result.already_added > 0 ? ` (${result.already_added} already in activity)` : '');
      
      toast({ title: "Success!", description: message, variant: "success" });
      setAddNewModalOpen(false);
      setSelectedExistingParticipants([]);
      setExistingSearchQuery('');
      fetchParticipants();
    } catch (err) {
      console.error('Error linking participants:', err);
      toast({ title: "Error", description: err.message || 'Failed to link participants', variant: "error" });
    }
  }, [activityId, selectedExistingParticipants, fetchParticipants]);

  // Edit participant
  const handleOpenEditModal = useCallback((participant) => {
    setEditingParticipant(participant);
    setParticipantForm(initializeForm(participant));
    setEditModalOpen(true);
  }, [initializeForm]);

  const handleUpdateParticipant = useCallback(async () => {
    if (!participantForm.name || !participantForm.email) {
      toast({ title: "Validation Error", description: "Name and email are required", variant: "warning" });
      return;
    }

    try {
      // Build payload
      const payload = {
        name: participantForm.name,
        email: participantForm.email,
      };

      // Add standard optional fields
      if (participantForm.phone !== undefined) payload.phone = participantForm.phone;
      if (participantForm.notes !== undefined) payload.notes = participantForm.notes;

      // Add custom fields to additional_data
      const additionalData = {};
      if (activity?.registration_form_fields) {
        activity.registration_form_fields.forEach(field => {
          if (field.name !== 'name' && field.name !== 'email' && field.name !== 'phone' && field.name !== 'notes') {
            if (participantForm[field.name] !== undefined) {
              additionalData[field.name] = participantForm[field.name];
            }
          }
        });
        if (Object.keys(additionalData).length > 0) {
          payload.additional_data = additionalData;
        }
      }

      const response = await fetch(`${API_URL}/activities/${activityId}/participants/${editingParticipant.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        throw new Error(result.message || 'Failed to update participant');
      }
      
      toast({ title: "Success!", description: "Participant updated successfully", variant: "success" });
      setEditModalOpen(false);
      setEditingParticipant(null);
      setParticipantForm(initializeForm());
      fetchParticipants();
    } catch (err) {
      console.error('Error updating participant:', err);
      toast({ title: "Error", description: err.message || 'Failed to update participant', variant: "error" });
    }
  }, [activityId, participantForm, editingParticipant, activity, fetchParticipants, initializeForm]);

  // Bulk import participants
  const handleBulkImport = useCallback(async () => {
    if (!importFile) {
      toast({ title: "Validation Error", description: "Please select a file to import", variant: "warning" });
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch(`${API_URL}/activities/${activityId}/participants/import`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        throw new Error(result.message || 'Failed to import participants');
      }

      toast({ title: "Success!", description: `Imported ${result.success_count} participant(s). Skipped ${result.skipped_count} rows.`, variant: "success" });
      setBulkImportModalOpen(false);
      setImportFile(null);
      fetchParticipants();
    } catch (err) {
      console.error('Error importing participants:', err);
      toast({ title: "Error", description: err.message || 'Failed to import participants', variant: "error" });
    } finally {
      setImporting(false);
    }
  }, [activityId, importFile, fetchParticipants]);

  // Download template
  const handleDownloadTemplate = useCallback(() => {
    let headers = ['name', 'email'];
    
    // Only add registration form fields if they exist
    if (activity?.registration_form_fields && activity.registration_form_fields.length > 0) {
      activity.registration_form_fields.forEach(field => {
        if (field.name !== 'name' && field.name !== 'email') {
          headers.push(field.name);
        }
      });
    }
    
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activityName || 'activity'}_participants_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [activity, activityName]);

  // Remove participant
  const handleRemoveParticipant = useCallback(async (participantId) => {
    try {
      const response = await fetch(`${API_URL}/activities/${activityId}/participants/${participantId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        throw new Error('Failed to remove participant');
      }
      toast({ title: "Success!", description: "Participant removed from activity", variant: "success" });
      setDeleteModal({ isOpen: false, participantId: null, participantName: null });
      fetchParticipants();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "error" });
    }
  }, [activityId, fetchParticipants]);

  // Toggle participant status
  const handleToggleStatus = useCallback(async (participantId, currentStatus) => {
    try {
      const response = await fetch(`${API_URL}/participants/${participantId}/toggle-status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        throw new Error('Failed to toggle status');
      }
      
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      toast({ title: "Success!", description: `Participant ${newStatus === 'active' ? 'activated' : 'deactivated'}`, variant: "success" });
      fetchParticipants();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "error" });
    }
  }, [fetchParticipants]);

  // Save notification settings
  const saveNotificationSettings = async () => {
    try {
      setSavingSettings(true);
      
      const response = await fetch(`${API_URL}/activities/${activityId}/notification-settings`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          welcome_email_enabled: welcomeEmailEnabled,
          thank_you_email_enabled: thankYouEmailEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save notification settings');
      }

      // Reload activity to get updated settings
      await fetchActivityDetails();
      
      toast({ 
        title: "Success", 
        description: "Notification settings saved successfully", 
        variant: "success" 
      });
    } catch (err) {
      console.error('Error saving notification settings:', err);
      toast({ 
        title: "Error", 
        description: err.message || 'Failed to save notification settings', 
        variant: "error" 
      });
    } finally {
      setSavingSettings(false);
    }
  };

  // Save Contact Us settings
  const saveContactUsSettings = async () => {
    try {
      setSavingContactUsSettings(true);
      
      // Auto-add any typed CC email before saving
      let finalCcEmails = [...contactUsCc];
      if (ccInputValue && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ccInputValue)) {
        if (!finalCcEmails.includes(ccInputValue)) {
          finalCcEmails.push(ccInputValue);
          setContactUsCc(finalCcEmails);
          setCcInputValue('');
        }
      }
      
      // Auto-add any typed BCC email before saving
      let finalBccEmails = [...contactUsBcc];
      if (bccInputValue && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bccInputValue)) {
        if (!finalBccEmails.includes(bccInputValue)) {
          finalBccEmails.push(bccInputValue);
          setContactUsBcc(finalBccEmails);
          setBccInputValue('');
        }
      }
      
      const response = await fetch(`${API_URL}/activities/${activityId}/contact-us-settings`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          recipient_email: contactUsRecipient || null,
          cc_emails: finalCcEmails,
          bcc_emails: finalBccEmails,
          notify_program_admin: notifyProgramAdmin,
          notify_manager: notifyManager,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save Contact Us settings');
      }

      // Reload activity to get updated settings
      await fetchActivityDetails();
      
      toast({ 
        title: "Success", 
        description: "Contact Us settings saved successfully", 
        variant: "success" 
      });
    } catch (err) {
      console.error('Error saving Contact Us settings:', err);
      toast({ 
        title: "Error", 
        description: err.message || 'Failed to save Contact Us settings', 
        variant: "error" 
      });
    } finally {
      setSavingContactUsSettings(false);
    }
  };

  // Helper functions for CC/BCC email management
  const addCcEmail = () => {
    if (ccInputValue && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ccInputValue)) {
      if (!contactUsCc.includes(ccInputValue)) {
        setContactUsCc([...contactUsCc, ccInputValue]);
        setCcInputValue('');
      }
    } else {
      toast({ title: "Error", description: "Please enter a valid email address", variant: "error" });
    }
  };

  const removeCcEmail = (email) => {
    setContactUsCc(contactUsCc.filter(e => e !== email));
  };

  const addBccEmail = () => {
    if (bccInputValue && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bccInputValue)) {
      if (!contactUsBcc.includes(bccInputValue)) {
        setContactUsBcc([...contactUsBcc, bccInputValue]);
        setBccInputValue('');
      }
    } else {
      toast({ title: "Error", description: "Please enter a valid email address", variant: "error" });
    }
  };

  const removeBccEmail = (email) => {
    setContactUsBcc(contactUsBcc.filter(e => e !== email));
  };

  // Send notification functions
  const handleOpenSendNotification = useCallback(() => {
    setSendNotificationModalOpen(true);
    setSelectedForNotification([]);
    setSelectAllNotification(false);
  }, []);

  const handleToggleParticipantNotification = useCallback((participantId) => {
    setSelectedForNotification(prev =>
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  }, []);

  const handleSelectAllNotification = useCallback(() => {
    if (selectAllNotification) {
      setSelectedForNotification([]);
    } else {
      setSelectedForNotification(participants.filter(p => p.status === 'active').map(p => p.id));
    }
    setSelectAllNotification(!selectAllNotification);
  }, [selectAllNotification, participants]);

  const handleSendNotification = useCallback(async () => {
    if (selectedForNotification.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one participant", variant: "warning" });
      return;
    }

    try {
      setSending(true);
      
      // FIXED: Use the correct endpoint with enhanced logging
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/notifications/send-emails`;
      console.log('=== SENDING NOTIFICATIONS ===');
      console.log('API URL:', apiUrl);
      console.log('Participant Count:', selectedForNotification.length);
      console.log('Participant IDs:', selectedForNotification);
      console.log('Notification Type:', notificationType);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          activity_id: activityId,
          notification_type: notificationType,
          participant_ids: selectedForNotification,
        }),
      });

      console.log('Response Status:', response.status);
      console.log('Response OK:', response.ok);
      
      const result = await response.json();
      console.log('Response Data:', result);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        throw new Error(result.message || 'Failed to send notifications');
      }

      // FIXED: Only show success if backend confirms it (NO FAKE SUCCESS)
      const sentCount = result.sent_count || result.data?.sent_count || 0;
      const failedCount = result.failed_count || result.data?.failed_count || 0;
      
      if (sentCount === 0 && failedCount === 0) {
        // Backend didn't provide counts - this is an error
        throw new Error('No confirmation received from backend');
      }
      
      if (failedCount > 0) {
        toast({ title: "Partially Sent", description: `Sent to ${sentCount} participant(s). ${failedCount} failed.`, variant: "warning" });
      } else {
        toast({ title: "Success!", description: `Successfully sent notifications to ${sentCount} participant(s)!`, variant: "success" });
      }
      
      setSendNotificationModalOpen(false);
      setSelectedForNotification([]);
      setSelectAllNotification(false);
      setNotificationSearchQuery('');
    } catch (err) {
      console.error('=== NOTIFICATION SEND FAILED ===');
      console.error('Error:', err);
      console.error('Error Message:', err.message);
      toast({ title: "Error", description: `Failed to send notification: ${err.message || 'Unknown error'}`, variant: "error" });
    } finally {
      setSending(false);
    }
  }, [activityId, notificationType, selectedForNotification]);

  // Email-Embedded Survey Functions
  const fetchQuestionsForEmbedded = useCallback(async () => {
    try {
      setLoadingQuestions(true);
      
      // Fetch questions from the activity's questionnaire
      const response = await fetch(`${API_URL}/activities/${activityId}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please refresh the page and log in again.');
        }
        throw new Error('Failed to fetch activity');
      }
      const result = await response.json();
      const activityData = result.data;
      
      if (activityData?.questionnaire_id) {
        // Fetch the questionnaire with sections and questions
        const qResponse = await fetch(`${API_URL}/questionnaires/${activityData.questionnaire_id}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (qResponse.ok) {
          const qResult = await qResponse.json();
          
          // Questions are nested inside sections
          // Flatten all questions from all sections
          const allQuestions = [];
          const sections = qResult.data?.sections || [];
          
          sections.forEach(section => {
            const sectionQuestions = section.questions || [];
            sectionQuestions.forEach(q => {
              allQuestions.push({
                ...q,
                section_title: section.title,
              });
            });
          });
          
          // Filter for questions that can be embedded
          // Question types in DB: radio, checkbox, select, multiselect, rating, scale, yesno, text, etc.
          const embeddableTypes = ['radio', 'single_select', 'yesno', 'rating', 'scale', 'select'];
          const questions = allQuestions.filter(q => 
            embeddableTypes.includes(q.type)
          );
          
          console.log('Fetched questions:', allQuestions.length, 'Embeddable:', questions.length);
          setEmbeddedQuestions(questions);
        }
      } else {
        console.log('No questionnaire linked to activity');
        setEmbeddedQuestions([]);
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
      toast({ title: "Error", description: "Failed to load questions", variant: "error" });
    } finally {
      setLoadingQuestions(false);
    }
  }, [activityId]);

  const handleOpenEmailEmbedded = useCallback(() => {
    setEmailEmbeddedModalOpen(true);
    setSelectedEmbeddedQuestions([]);
    setEmbeddedRecipients([]);
    setEmbeddedSearchQuery('');
    fetchQuestionsForEmbedded();
  }, [fetchQuestionsForEmbedded]);

  const handleToggleEmbeddedQuestion = useCallback((question) => {
    setSelectedEmbeddedQuestions(prev =>
      prev.some(q => q.id === question.id)
        ? prev.filter(q => q.id !== question.id)
        : [...prev, question]
    );
  }, []);

  const handleSelectAllQuestions = useCallback(() => {
    if (selectedEmbeddedQuestions.length === embeddedQuestions.length) {
      setSelectedEmbeddedQuestions([]);
    } else {
      setSelectedEmbeddedQuestions([...embeddedQuestions]);
    }
  }, [embeddedQuestions, selectedEmbeddedQuestions]);

  const handleToggleEmbeddedRecipient = useCallback((participantId) => {
    setEmbeddedRecipients(prev =>
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  }, []);

  const handleSelectAllEmbedded = useCallback(() => {
    const activeParticipants = participants.filter(p => p.status === 'active');
    if (embeddedRecipients.length === activeParticipants.length) {
      setEmbeddedRecipients([]);
    } else {
      setEmbeddedRecipients(activeParticipants.map(p => p.id));
    }
  }, [participants, embeddedRecipients]);

  const handleSendEmbeddedSurvey = useCallback(async () => {
    if (selectedEmbeddedQuestions.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one question", variant: "warning" });
      return;
    }
    if (embeddedRecipients.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one recipient", variant: "warning" });
      return;
    }

    try {
      setSendingEmbedded(true);
      
      // Get participant emails
      const selectedParticipants = participants.filter(p => embeddedRecipients.includes(p.id));
      const emails = selectedParticipants.map(p => p.email);
      
      // Debug: Log the email config being sent
      console.log('[Email-Embedded Survey] Email config state:', embeddedEmailConfig);
      console.log('[Email-Embedded Survey] Email config to send:', {
        subject: embeddedEmailConfig.subject || null,
        from_name: embeddedEmailConfig.fromName || null,
        preheader: embeddedEmailConfig.preheader || null,
        header_text: embeddedEmailConfig.headerText || null,
        footer_text: embeddedEmailConfig.footerText || null,
      });
      
      // Send for each selected question
      let totalSent = 0;
      let totalFailed = 0;
      
      for (const question of selectedEmbeddedQuestions) {
        const response = await fetch(`${API_URL}/email-embedded-survey/send`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            activity_id: activityId,
            question_id: question.id,
            emails: emails,
            email_config: {
              subject: embeddedEmailConfig.subject || null,
              from_name: embeddedEmailConfig.fromName || null,
              preheader: embeddedEmailConfig.preheader || null,
              header_text: embeddedEmailConfig.headerText || null,
              footer_text: embeddedEmailConfig.footerText || null,
            },
          }),
        });

        const result = await response.json();
        
        if (response.ok) {
          totalSent += result.sent_count || emails.length;
        } else {
          if (response.status === 401) {
            throw new Error('Session expired. Please refresh the page and log in again.');
          }
          totalFailed += emails.length;
        }
      }

      if (totalFailed > 0) {
        toast({ 
          title: "Partially Sent", 
          description: `Sent ${totalSent} emails. ${totalFailed} failed.`, 
          variant: "warning" 
        });
      } else {
        toast({ 
          title: "Success!", 
          description: `Email-embedded survey sent! ${selectedEmbeddedQuestions.length} question(s) to ${emails.length} recipient(s).`, 
          variant: "success" 
        });
      }
      
      setEmailEmbeddedModalOpen(false);
      setSelectedEmbeddedQuestions([]);
      setEmbeddedRecipients([]);
      setEmbeddedEmailConfig({ subject: '', fromName: '', preheader: '', headerText: '', footerText: '' });
    } catch (err) {
      console.error('Error sending email-embedded survey:', err);
      toast({ title: "Error", description: err.message || "Failed to send survey", variant: "error" });
    } finally {
      setSendingEmbedded(false);
    }
  }, [activityId, selectedEmbeddedQuestions, embeddedRecipients, participants, embeddedEmailConfig]);

  // Render form fields
  const renderFormFields = (isEdit = false) => {
    const fields = [];

    // Always show name and email
    fields.push(
      <div key="name">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={participantForm.name || ''}
          onChange={(e) => setParticipantForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter participant name"
        />
      </div>
    );

    fields.push(
      <div key="email">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={participantForm.email || ''}
          onChange={(e) => setParticipantForm(prev => ({ ...prev, email: e.target.value }))}
          placeholder="Enter email address"
        />
      </div>
    );

    // Add registration form fields only
    if (activity?.registration_form_fields && activity.registration_form_fields.length > 0) {
      activity.registration_form_fields.forEach(field => {
        if (field.name !== 'name' && field.name !== 'email') {
          // Handle different field types
          if (field.type === 'select' || field.type === 'country') {
            fields.push(
              <div key={field.name}>
                <Label htmlFor={field.name}>
                  {field.label} {field.required && '*'}
                </Label>
                <select
                  id={field.name}
                  value={participantForm[field.name] || ''}
                  onChange={(e) => setParticipantForm(prev => ({ ...prev, [field.name]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={field.required}
                >
                  <option value="">Select an option...</option>
                  {field.options?.map((option, idx) => (
                    <option key={idx} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            );
          } else if (field.type === 'radio' || field.type === 'gender') {
            fields.push(
              <div key={field.name}>
                <Label htmlFor={field.name}>
                  {field.label} {field.required && '*'}
                </Label>
                <div className="space-y-2 mt-2">
                  {field.options?.map((option, idx) => (
                    <label key={idx} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={field.name}
                        value={option}
                        checked={participantForm[field.name] === option}
                        onChange={(e) => setParticipantForm(prev => ({ ...prev, [field.name]: e.target.value }))}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        required={field.required && !participantForm[field.name]}
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          } else if (field.type === 'textarea' || field.type === 'address') {
            fields.push(
              <div key={field.name}>
                <Label htmlFor={field.name}>
                  {field.label} {field.required && '*'}
                </Label>
                <textarea
                  id={field.name}
                  rows={field.type === 'address' ? 3 : 4}
                  value={participantForm[field.name] || ''}
                  onChange={(e) => setParticipantForm(prev => ({ ...prev, [field.name]: e.target.value }))}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={field.required}
                />
              </div>
            );
          } else {
            fields.push(
              <div key={field.name}>
                <Label htmlFor={field.name}>
                  {field.label} {field.required && '*'}
                </Label>
                <Input
                  id={field.name}
                  type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : field.type === 'phone' ? 'tel' : 'text'}
                  value={participantForm[field.name] || ''}
                  onChange={(e) => setParticipantForm(prev => ({ ...prev, [field.name]: e.target.value }))}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  required={field.required}
                />
              </div>
            );
          }
        }
      });
    }
    // No default fields - only show registration form fields

    return fields;
  };

  // Show loading while auth is loading or data is loading
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <Tabs defaultValue="participants" className="w-full">
        <TabsList className="inline-flex h-auto items-center justify-start rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 p-1.5 text-gray-600 shadow-inner border border-gray-200 flex-wrap gap-1 mb-6">
          <TabsTrigger 
            value="participants" 
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100 hover:text-gray-900"
          >
            <Users className="w-4 h-4 mr-2" />
            Manage Participants
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-100 hover:text-gray-900"
          >
            <Mail className="w-4 h-4 mr-2" />
            Standard Notifications
          </TabsTrigger>
          <TabsTrigger 
            value="embedded" 
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-qsights-cyan data-[state=active]:shadow-lg data-[state=active]:shadow-purple-100 hover:text-gray-900"
          >
            <Inbox className="w-4 h-4 mr-2" />
            Email-Embedded Survey
          </TabsTrigger>
        </TabsList>

        {/* Add Participants Tab */}
        <TabsContent value="participants" className="mt-6">
          <Card className="p-6">
            {/* Enhanced Header with Title and Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Activity Participants</h3>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-semibold text-blue-700">{participants.length}</span>
                    <span className="text-blue-600">Total</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-100">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-semibold text-green-700">{participants.filter(p => p.status === 'active' && (!p.type || p.type === 'registered')).length}</span>
                    <span className="text-green-600">Active</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-qsights-light rounded-lg border border-purple-100">
                    <div className="w-2 h-2 bg-qsights-light0 rounded-full"></div>
                    <span className="font-semibold text-purple-700">{participants.filter(p => p.type === 'anonymous').length}</span>
                    <span className="text-qsights-cyan">Anonymous</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="font-semibold text-gray-700">{participants.filter(p => p.status === 'inactive').length}</span>
                    <span className="text-gray-600">Inactive</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    setAddNewModalOpen(true);
                    setAddModalTab('create');
                    setSelectedExistingParticipants([]);
                    setExistingSearchQuery('');
                    fetchExistingParticipants();
                  }} 
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all px-6"
                >
                  <UserPlus className="h-5 w-5" />
                  <span className="font-semibold">Add Participant</span>
                </Button>
                <Button 
                  onClick={() => setBulkImportModalOpen(true)} 
                  variant="outline" 
                  className="flex items-center gap-2 border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all px-5"
                >
                  <Upload className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-700">Bulk Import</span>
                </Button>
              </div>
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                <UserPlus className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-lg font-medium">No participants added yet.</p>
                <p className="text-sm mt-1">Add participants manually, import them, or they can register via the activity link.</p>
              </div>
            ) : (
              <>
                {/* Enhanced Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl border border-gray-200">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-11 bg-white border-2 border-gray-200 focus:border-blue-400 rounded-lg shadow-sm"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={statusFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter('all')}
                      className={`flex items-center gap-2 px-4 h-11 font-semibold transition-all ${
                        statusFilter === 'all' 
                          ? 'bg-blue-600 hover:bg-blue-700 shadow-md' 
                          : 'border-2 hover:bg-blue-50 hover:border-blue-300'
                      }`}
                    >
                      <Filter className="h-4 w-4" />
                      All <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">({participants.length})</span>
                    </Button>
                    <Button
                      variant={statusFilter === 'active' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter('active')}
                      className={`flex items-center gap-2 px-4 h-11 font-semibold transition-all ${
                        statusFilter === 'active' 
                          ? 'bg-green-600 hover:bg-green-700 shadow-md' 
                          : 'border-2 hover:bg-green-50 hover:border-green-300'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Active <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">({participants.filter(p => p.status === 'active').length})</span>
                    </Button>
                    <Button
                      variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter('inactive')}
                      className={`flex items-center gap-2 px-4 h-11 font-semibold transition-all ${
                        statusFilter === 'inactive' 
                          ? 'bg-gray-600 hover:bg-gray-700 shadow-md' 
                          : 'border-2 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <AlertCircle className="h-4 w-4" />
                      Inactive <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">({participants.filter(p => p.status === 'inactive').length})</span>
                    </Button>
                  </div>
                </div>

                {/* Results Summary */}
                {(searchQuery || statusFilter !== 'all') && (
                  <div className="mb-4 text-sm text-gray-600">
                    Showing {filteredParticipants.length} of {participants.length} participant{filteredParticipants.length !== 1 ? 's' : ''}
                    {searchQuery && ` matching "${searchQuery}"`}
                  </div>
                )}

                {/* Modern Enhanced Table */}
                <div className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-500" />
                              Participant
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-500" />
                              Email
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Joined
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredParticipants.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="px-6 py-16 text-center">
                              <div className="flex flex-col items-center gap-3">
                                <div className="p-4 bg-gray-100 rounded-full">
                                  <Users className="w-8 h-8 text-gray-400" />
                                </div>
                                <div>
                                  <p className="text-gray-900 font-medium">No participants found</p>
                                  <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          paginatedParticipants.map((participant, index) => (
                            <tr key={participant.id} className="hover:bg-blue-50/30 transition-all duration-150 group">
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-4">
                                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md group-hover:shadow-lg transition-shadow">
                                    {participant.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{participant.name}</p>
                                    {participant.phone && (
                                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                        {participant.phone}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <p className="text-sm text-gray-700 font-medium">{participant.email}</p>
                              </td>
                              <td className="px-6 py-5">
                                {participant.type === 'anonymous' ? (
                                  <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 rounded-full border border-purple-200">
                                    <span className="w-1.5 h-1.5 bg-qsights-light0 rounded-full mr-1.5"></span>
                                    Anonymous
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 rounded-full border border-gray-200">
                                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full mr-1.5"></span>
                                    Participant
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-5">
                                <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full border ${
                                  participant.status === 'active'
                                    ? 'bg-gradient-to-r from-green-100 to-emerald-50 text-green-700 border-green-200'
                                    : 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-600 border-gray-200'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                    participant.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                                  }`}></span>
                                  {participant.status}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-sm text-gray-600 font-medium">
                                {participant.joined_at 
                                  ? new Date(participant.joined_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })
                                  : '-'
                                }
                              </td>
                              <td className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenEditModal(participant)}
                                    title="Edit participant"
                                    className="h-9 w-9 p-0 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-all"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleToggleStatus(participant.id, participant.status)}
                                    title={`${participant.status === 'active' ? 'Deactivate' : 'Activate'} participant`}
                                    className={`h-9 w-9 p-0 rounded-lg transition-all ${participant.status === 'active' ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-100' : 'text-green-600 hover:text-green-700 hover:bg-green-100'}`}
                                  >
                                    <Power className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDeleteModal({
                                      isOpen: true,
                                      participantId: participant.id,
                                      participantName: participant.name
                                    })}
                                    className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-all"
                                    title="Delete participant"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(startIndex + itemsPerPage, filteredParticipants.length)}
                      </span>{' '}
                      of <span className="font-medium">{filteredParticipants.length}</span> results
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <Button
                                key={page}
                                variant={currentPage === page ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="w-8 h-8 p-0"
                              >
                                {page}
                              </Button>
                            );
                          } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="px-2 py-1 text-gray-500">...</span>;
                          }
                          return null;
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </TabsContent>

        {/* Notification Setting Tab */}
        <TabsContent value="notifications" className="mt-6">
          {/* Notification Settings Card */}
          <Card className="p-6 mb-6 border-2 border-orange-200 bg-gradient-to-br from-orange-50/50 to-amber-50/50">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-100">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">Email Notification Settings</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Control automatic email notifications sent to participants during registration and completion.
                  </p>
                </div>
              </div>

              {/* Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Welcome Email Toggle */}
                <div className="p-5 bg-white rounded-xl border-2 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <h4 className="text-base font-semibold text-gray-900">Welcome Email</h4>
                      </div>
                      <p className="text-sm text-gray-600 ml-13">
                        Send welcome email when participant registers. Includes event details and access link.
                      </p>
                    </div>
                    <Switch
                      checked={welcomeEmailEnabled}
                      onCheckedChange={setWelcomeEmailEnabled}
                      className="ml-3 flex-shrink-0"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs ml-13">
                    <div className={`w-2 h-2 rounded-full ${welcomeEmailEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className={`font-medium ${welcomeEmailEnabled ? 'text-green-700' : 'text-gray-500'}`}>
                      {welcomeEmailEnabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Thank You Email Toggle */}
                <div className="p-5 bg-white rounded-xl border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <h4 className="text-base font-semibold text-gray-900">Thank You Email</h4>
                      </div>
                      <p className="text-sm text-gray-600 ml-13">
                        Send thank you email when participant completes their response. Includes confirmation and results.
                      </p>
                    </div>
                    <Switch
                      checked={thankYouEmailEnabled}
                      onCheckedChange={setThankYouEmailEnabled}
                      className="ml-3 flex-shrink-0"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs ml-13">
                    <div className={`w-2 h-2 rounded-full ${thankYouEmailEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className={`font-medium ${thankYouEmailEnabled ? 'text-green-700' : 'text-gray-500'}`}>
                      {thankYouEmailEnabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2 border-t border-orange-200">
                <Button
                  onClick={saveNotificationSettings}
                  disabled={savingSettings}
                  className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-lg shadow-orange-100 font-semibold"
                >
                  {savingSettings ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Contact Us Email Settings Card */}
          <Card className="p-6 mb-6 border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-indigo-50/50">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-100">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">Contact Us Email Settings</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure recipient, CC, BCC emails for Contact Us form submissions. Default recipient is Program Admin if not specified.
                  </p>
                </div>
              </div>

              {/* Recipient Email */}
              <div className="bg-white rounded-xl border-2 border-purple-200 p-5">
                <Label className="text-sm font-semibold text-gray-900 mb-2 block">
                  Primary Recipient Email
                </Label>
                <p className="text-xs text-gray-500 mb-3">
                  Leave empty to use Program Admin's email by default
                </p>
                <Input
                  type="email"
                  value={contactUsRecipient}
                  onChange={(e) => setContactUsRecipient(e.target.value)}
                  placeholder="manager@company.com (optional)"
                  className="w-full"
                />
              </div>

              {/* CC Emails */}
              <div className="bg-white rounded-xl border-2 border-blue-200 p-5">
                <Label className="text-sm font-semibold text-gray-900 mb-2 block">
                  CC (Carbon Copy)
                </Label>
                <p className="text-xs text-gray-500 mb-3">
                  Add email addresses to receive copies of Contact Us messages
                </p>
                <div className="flex gap-2 mb-3">
                  <Input
                    type="email"
                    value={ccInputValue}
                    onChange={(e) => setCcInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCcEmail()}
                    placeholder="cc@example.com"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={addCcEmail}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Add CC
                  </Button>
                </div>
                {contactUsCc.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {contactUsCc.map((email, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm border border-blue-200"
                      >
                        <span>{email}</span>
                        <button
                          onClick={() => removeCcEmail(email)}
                          className="hover:bg-blue-100 rounded p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BCC Emails */}
              <div className="bg-white rounded-xl border-2 border-indigo-200 p-5">
                <Label className="text-sm font-semibold text-gray-900 mb-2 block">
                  BCC (Blind Carbon Copy)
                </Label>
                <p className="text-xs text-gray-500 mb-3">
                  Add email addresses to receive hidden copies of Contact Us messages
                </p>
                <div className="flex gap-2 mb-3">
                  <Input
                    type="email"
                    value={bccInputValue}
                    onChange={(e) => setBccInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addBccEmail()}
                    placeholder="bcc@example.com"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={addBccEmail}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Add BCC
                  </Button>
                </div>
                {contactUsBcc.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {contactUsBcc.map((email, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm border border-indigo-200"
                      >
                        <span>{email}</span>
                        <button
                          onClick={() => removeBccEmail(email)}
                          className="hover:bg-indigo-100 rounded p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bell Notification Toggles */}
              <div className="bg-white rounded-xl border-2 border-green-200 p-5">
                <Label className="text-sm font-semibold text-gray-900 mb-3 block">
                  Dashboard Notifications (Bell Icon)
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">Notify Program Admin</p>
                        <p className="text-xs text-gray-500">Send bell notification to Program Admin</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifyProgramAdmin}
                      onCheckedChange={setNotifyProgramAdmin}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Star className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">Notify Manager</p>
                        <p className="text-xs text-gray-500">Send bell notification to Event Manager</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifyManager}
                      onCheckedChange={setNotifyManager}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2 border-t border-purple-200">
                <Button
                  onClick={saveContactUsSettings}
                  disabled={savingContactUsSettings}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-100 font-semibold"
                >
                  {savingContactUsSettings ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Contact Us Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-6">
              {/* Header with icon */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-100">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Standard Notifications</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Send automated email notifications to participants at various stages of the activity.
                  </p>
                </div>
              </div>

              {/* Notification Types Grid */}
              <div>
                <Label className="text-sm font-medium mb-3 block text-gray-700">Select Notification Type</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notificationTypes.map((type) => (
                    <div
                      key={type.value}
                      className={`p-4 border-2 rounded-xl transition-all duration-200 cursor-pointer hover:shadow-md ${
                        notificationType === type.value
                          ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      onClick={() => setNotificationType(type.value)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`font-semibold text-sm ${notificationType === type.value ? 'text-green-700' : 'text-gray-700'}`}>
                          {type.label}
                        </span>
                        {notificationType === type.value && (
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTemplateType(type.value);
                            setTemplateEditorOpen(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 text-xs hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTemplateType(type.value);
                            setTemplatePreviewOpen(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 text-xs hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                        >
                          <Eye className="h-3 w-3" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Send Notification Button */}
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button
                  onClick={handleOpenSendNotification}
                  disabled={participants.filter(p => p.status === 'active').length === 0}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-100"
                >
                  <Send className="h-4 w-4" />
                  Send Notification
                </Button>
              </div>

              {participants.filter(p => p.status === 'active').length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-xl bg-gray-50">
                  <Mail className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium">No active participants available</p>
                  <p className="text-sm mt-1">Add participants first to send notifications.</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Email-Embedded Survey Tab */}
        <TabsContent value="embedded" className="mt-6">
          <Card className="p-6">
            <div className="space-y-6">
              {/* Header with icon */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-100">
                  <Inbox className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">Email-Embedded Survey</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Embed survey questions directly in the email body. Recipients can answer by clicking buttons without leaving their inbox.
                  </p>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-xl">
                  <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center mb-3">
                    <CheckCircle className="h-5 w-5 text-qsights-cyan" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">Single Choice</h4>
                  <p className="text-xs text-gray-500">Radio buttons, dropdowns, and select options</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl">
                  <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center mb-3">
                    <CheckCircle className="h-5 w-5 text-qsights-cyan" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">Yes/No Questions</h4>
                  <p className="text-xs text-gray-500">Simple binary choice questions</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                    <Star className="h-5 w-5 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">Rating & Scale</h4>
                  <p className="text-xs text-gray-500">Star ratings and numerical scales</p>
                </div>
              </div>

              {/* How it works */}
              <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-gray-400" />
                  How it works
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-qsights-cyan text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                    <p className="text-gray-600">Select one or more questions to embed in the email</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-qsights-cyan text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                    <p className="text-gray-600">Recipients see questions with clickable answer buttons</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-qsights-cyan text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                    <p className="text-gray-600">One-click response records their answer instantly</p>
                  </div>
                </div>
              </div>

              {/* Send Button */}
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button
                  onClick={handleOpenEmailEmbedded}
                  disabled={participants.filter(p => p.status === 'active').length === 0}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-100"
                >
                  <MessageSquare className="h-4 w-4" />
                  Create Email-Embedded Survey
                </Button>
              </div>

              {participants.filter(p => p.status === 'active').length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-xl bg-gray-50">
                  <Inbox className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium">No active participants available</p>
                  <p className="text-sm mt-1">Add participants first to send email-embedded surveys.</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add New Participant Modal */}
      {addNewModalOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-100">
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Add Participants</h2>
              </div>
              <button 
                onClick={() => {
                  setAddNewModalOpen(false);
                  setAddModalTab('create');
                  setSelectedExistingParticipants([]);
                  setExistingSearchQuery('');
                }} 
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Advanced Tabs */}
            <div className="px-6 pt-4">
              <div className="inline-flex h-auto items-center justify-start rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 p-1.5 text-gray-600 shadow-inner border border-gray-200">
                <button
                  onClick={() => setAddModalTab('create')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                    addModalTab === 'create'
                      ? 'bg-white text-blue-600 shadow-lg shadow-blue-100'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create New
                </button>
                <button
                  onClick={() => {
                    setAddModalTab('existing');
                    if (allExistingParticipants.length === 0) {
                      fetchExistingParticipants();
                    }
                  }}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                    addModalTab === 'existing'
                      ? 'bg-white text-green-600 shadow-lg shadow-green-100'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Import Existing
                </button>
              </div>
            </div>

            {/* Create New Tab */}
            {addModalTab === 'create' && (
              <>
                <div className="px-6 py-4 overflow-y-auto flex-1">
                  <p className="text-sm text-gray-600 mb-6">
                    Create a new participant and add them to this activity.
                  </p>
                  <div className="space-y-4">
                    {renderFormFields()}
                  </div>
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <Button variant="outline" onClick={() => setAddNewModalOpen(false)} className="flex-1 h-11">
                    Cancel
                  </Button>
                  <Button onClick={handleAddNewParticipant} className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-100">
                    Add Participant
                  </Button>
                </div>
              </>
            )}

            {/* Import from Existing Tab */}
            {addModalTab === 'existing' && (
              <>
                <div className="px-6 py-4 flex-1 flex flex-col overflow-hidden">
                  <p className="text-sm text-gray-600 mb-4">
                    Select existing participants from your Participants list to add to this activity.
                  </p>

                  {/* Search */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search by name or email..."
                        value={existingSearchQuery}
                        onChange={(e) => setExistingSearchQuery(e.target.value)}
                        className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Participants List */}
                  <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col bg-white">
                    {loadingExisting ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">Loading participants...</p>
                        </div>
                      </div>
                    ) : allExistingParticipants.filter(p => 
                      !existingSearchQuery || 
                      p.name?.toLowerCase().includes(existingSearchQuery.toLowerCase()) ||
                      p.email?.toLowerCase().includes(existingSearchQuery.toLowerCase())
                    ).length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <UserPlus className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {existingSearchQuery ? 'No participants found' : 'No available participants'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {existingSearchQuery ? 'Try a different search term' : 'All participants are already added to this activity'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-y-auto divide-y divide-gray-100">
                        {allExistingParticipants
                          .filter(p => 
                            !existingSearchQuery || 
                            p.name?.toLowerCase().includes(existingSearchQuery.toLowerCase()) ||
                            p.email?.toLowerCase().includes(existingSearchQuery.toLowerCase())
                          )
                          .map((participant) => (
                            <div
                              key={participant.id}
                              className={`p-4 hover:bg-blue-50 cursor-pointer flex items-center gap-4 transition-colors ${
                                selectedExistingParticipants.includes(participant.id) ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => {
                                setSelectedExistingParticipants(prev => 
                                  prev.includes(participant.id)
                                    ? prev.filter(id => id !== participant.id)
                                    : [...prev, participant.id]
                                );
                              }}
                            >
                              <div className="flex-shrink-0">
                                {selectedExistingParticipants.includes(participant.id) ? (
                                  <div className="h-5 w-5 bg-blue-600 rounded flex items-center justify-center">
                                    <CheckSquare className="h-4 w-4 text-white" />
                                  </div>
                                ) : (
                                  <div className="h-5 w-5 border-2 border-gray-300 rounded"></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {participant.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                  {participant.email}
                                </p>
                              </div>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                                participant.additional_data?.participant_type === 'anonymous'
                                  ? 'bg-cyan-50 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {participant.additional_data?.participant_type === 'anonymous' ? 'Anonymous' : 'Registered'}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Selection Counter */}
                  {selectedExistingParticipants.length > 0 && (
                    <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">
                        {selectedExistingParticipants.length} participant{selectedExistingParticipants.length !== 1 ? 's' : ''} selected
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <Button variant="outline" onClick={() => setAddNewModalOpen(false)} className="flex-1 h-11">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleLinkExistingParticipants} 
                    disabled={selectedExistingParticipants.length === 0}
                    className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add {selectedExistingParticipants.length > 0 ? `${selectedExistingParticipants.length} ` : ''}Participant{selectedExistingParticipants.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Edit Participant Modal */}
      {editModalOpen && editingParticipant && mounted && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Participant</h2>
              <button onClick={() => {
                setEditModalOpen(false);
                setEditingParticipant(null);
              }} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Update participant information.
            </p>
            <div className="space-y-4">
              {renderFormFields(true)}
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => {
                setEditModalOpen(false);
                setEditingParticipant(null);
              }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleUpdateParticipant} className="flex-1">
                Update Participant
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Import Modal */}
      {bulkImportModalOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Bulk Import Participants</h2>
              <button onClick={() => {
                setBulkImportModalOpen(false);
                setImportFile(null);
              }} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Import multiple participants at once using a CSV or Excel file. Download the template to see the required format.
            </p>
            <div className="space-y-4">
              <div>
                <Button onClick={handleDownloadTemplate} variant="outline" className="w-full flex items-center justify-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Template includes: {activity?.registration_form_fields && activity.registration_form_fields.length > 0 ?
                    activity.registration_form_fields.map(f => f.label).join(', ') :
                    'Name, Email'}
                </p>
              </div>
              <div>
                <Label htmlFor="import-file">Upload CSV/Excel File</Label>
                <Input
                  id="import-file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="mt-1"
                />
                {importFile && (
                  <p className="text-xs text-gray-600 mt-2">
                    Selected: {importFile.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => {
                setBulkImportModalOpen(false);
                setImportFile(null);
              }} className="flex-1">Cancel</Button>
              <Button onClick={handleBulkImport} disabled={!importFile || importing} className="flex-1">
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Send Notification Modal */}
      {sendNotificationModalOpen && mounted && (() => {
        const activeParticipants = participants.filter(p => p.status === 'active');
        const filteredNotificationParticipants = activeParticipants.filter(p => 
          notificationSearchQuery === '' ||
          p.name?.toLowerCase().includes(notificationSearchQuery.toLowerCase()) ||
          p.email?.toLowerCase().includes(notificationSearchQuery.toLowerCase())
        );
        
        return createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold">Send Notification</h2>
                <button onClick={() => {
                  setSendNotificationModalOpen(false);
                  setNotificationSearchQuery('');
                }} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4 flex-shrink-0">
                Select active participants to receive the <strong>{notificationTypes.find(t => t.value === notificationType)?.label}</strong> notification.
              </p>

              {/* Search Bar */}
              <div className="mb-4 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search participants by name or email..."
                    value={notificationSearchQuery}
                    onChange={(e) => setNotificationSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {notificationSearchQuery && (
                  <p className="text-xs text-gray-500 mt-2">
                    Showing {filteredNotificationParticipants.length} of {activeParticipants.length} active participants
                  </p>
                )}
              </div>

              {/* Select All */}
              <div className="flex items-center gap-2 mb-3 pb-3 border-b flex-shrink-0">
                <button onClick={handleSelectAllNotification} className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
                  {selectAllNotification ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                  Select All Active ({activeParticipants.length})
                </button>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-600">{selectedForNotification.length} selected</span>
              </div>

              {/* Table - Scrollable Area */}
              <div className="flex-1 overflow-hidden border rounded-lg mb-4 min-h-0">
                <div className="overflow-y-auto h-full" style={{ maxHeight: 'calc(90vh - 320px)' }}>
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="w-12 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectAllNotification}
                            onChange={handleSelectAllNotification}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Participant
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredNotificationParticipants.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                            {notificationSearchQuery ? 'No participants found matching your search.' : 'No active participants available.'}
                          </td>
                        </tr>
                      ) : (
                        filteredNotificationParticipants.map((participant) => (
                          <tr
                            key={participant.id}
                            onClick={() => handleToggleParticipantNotification(participant.id)}
                            className={`cursor-pointer hover:bg-gray-50 transition ${
                              selectedForNotification.includes(participant.id) ? 'bg-blue-50' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedForNotification.includes(participant.id)}
                                onChange={() => {}}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-qsights-blue text-white flex items-center justify-center text-xs font-semibold">
                                  {participant.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">{participant.name}</p>
                                  {participant.phone && (
                                    <p className="text-xs text-gray-500">{participant.phone}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-gray-900">{participant.email}</p>
                            </td>
                            <td className="px-4 py-3">
                              {participant.type === 'anonymous' ? (
                                <span className="px-2 py-1 text-xs font-medium bg-cyan-50 text-purple-700 rounded">
                                  Anonymous
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                                  Participant
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-2 pt-4 border-t flex-shrink-0">
                <p className="text-sm text-gray-500 mr-auto">
                  {selectedForNotification.length} participant{selectedForNotification.length !== 1 ? 's' : ''} selected
                </p>
                <Button variant="outline" onClick={() => {
                  setSendNotificationModalOpen(false);
                  setNotificationSearchQuery('');
                }}>Cancel</Button>
                <Button onClick={handleSendNotification} disabled={selectedForNotification.length === 0 || sending}>
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send to {selectedForNotification.length}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Template Editor Modal */}
      {templateEditorOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">Edit Email Template</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {notificationTypes.find(t => t.value === editingTemplateType)?.label} Notification
                </p>
              </div>
              <button onClick={() => setTemplateEditorOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {templateLoading ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading template...</p>
                </div>
              </div>
            ) : (
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {/* Subject Field */}
              <div>
                <Label htmlFor="template-subject" className="text-sm font-medium mb-2 block">
                  Email Subject
                </Label>
                <Input
                  id="template-subject"
                  type="text"
                  placeholder="e.g., You're invited to Activity Name"
                  value={templateContent.subject}
                  onChange={(e) => setTemplateContent(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use placeholders: {'{{activity_name}}, {{participant_name}}, {{activity_start_date}}'}
                </p>
              </div>

              {/* Body Field */}
              <div>
                <Label htmlFor="template-body" className="text-sm font-medium mb-2 block">
                  Email Body (HTML)
                </Label>
                <textarea
                  id="template-body"
                  rows={12}
                  placeholder="Enter your email content here. You can use HTML tags and placeholders."
                  value={templateContent.body}
                  onChange={(e) => setTemplateContent(prev => ({ ...prev, body: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available placeholders: {'{{activity_name}}, {{participant_name}}, {{activity_start_date}}, {{activity_end_date}}, {{activity_description}}, {{program_name}}, {{organization_name}}, {{qr_code}}'}
                </p>
              </div>

              {/* Sample Template Suggestions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Quick Tips
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Use {'{{participant_name}}'} to personalize emails</li>
                  <li>• Include {'{{activity_name}}'} for activity reference</li>
                  <li>• Add dates with {'{{activity_start_date}}'} and {'{{activity_end_date}}'}</li>
                  <li>• Add {'{{qr_code}}'} to include a scannable QR code linking to the event</li>
                  <li>• HTML tags like &lt;strong&gt;, &lt;em&gt;, &lt;br&gt; are supported</li>
                </ul>
              </div>
            </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setTemplateEditorOpen(false);
                  setTemplatePreviewOpen(true);
                }}
                className="flex items-center gap-2"
                disabled={templateLoading}
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <div className="flex-1"></div>
              <Button variant="outline" onClick={() => setTemplateEditorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} disabled={templateSaving}>
                {templateSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                {templateSaving ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Template Preview Modal */}
      {templatePreviewOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">Email Preview</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {notificationTypes.find(t => t.value === editingTemplateType)?.label} Notification
                </p>
              </div>
              <button onClick={() => setTemplatePreviewOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {templateLoading ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading preview...</p>
                </div>
              </div>
            ) : (
            <div className="flex-1 overflow-y-auto mb-4">
              {/* Preview Info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> This is a preview with sample data. Actual emails will use real participant and activity information.
                </p>
              </div>

              {/* Email Preview */}
              <div className="border rounded-lg overflow-hidden">
                {/* Email Header */}
                <div className="bg-gray-100 px-4 py-3 border-b">
                  <div className="text-xs text-gray-600 mb-1">Subject:</div>
                  <div className="font-semibold text-sm">
                    {previewRendered.subject || templateContent.subject || `You're invited to ${activityName || 'Demo Activity'}`}
                  </div>
                </div>

                {/* Email Body - Use rendered preview from backend */}
                <div className="p-6 bg-white">
                  <div className="prose prose-sm max-w-none">
                    {previewRendered.body_html ? (
                      <div dangerouslySetInnerHTML={{ __html: previewRendered.body_html }} />
                    ) : templateContent.body ? (
                      <div dangerouslySetInnerHTML={{ 
                        __html: templateContent.body
                          .replace(/\{\{activity_name\}\}/g, activityName || 'Demo Activity')
                          .replace(/\{\{participant_name\}\}/g, 'John Doe')
                          .replace(/\{\{activity_start_date\}\}/g, 'December 10, 2025')
                          .replace(/\{\{activity_end_date\}\}/g, 'December 20, 2025')
                          .replace(/\{\{program_name\}\}/g, 'Sample Program')
                          .replace(/\{\{organization_name\}\}/g, 'QSights Organization')
                      }} />
                    ) : (
                      <div className="text-gray-500">
                        <p className="mb-4">Dear <strong>John Doe</strong>,</p>
                        <p className="mb-4">You're invited to participate in <strong>{activityName || 'Demo Activity'}</strong>.</p>
                        <p className="mb-4">This activity is part of our ongoing program to gather valuable insights.</p>
                        <p className="mb-4">
                          <strong>Activity Details:</strong><br />
                          Start Date: December 10, 2025<br />
                          End Date: December 20, 2025
                        </p>
                        <p>We look forward to your participation!</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email Footer */}
                <div className="bg-gray-50 px-4 py-3 border-t">
                  <p className="text-xs text-gray-500 text-center">
                    This email was sent by QSights • You're receiving this because you're a participant
                  </p>
                </div>
              </div>
            </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setTemplatePreviewOpen(false);
                  setTemplateEditorOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit Template
              </Button>
              <div className="flex-1"></div>
              <Button onClick={() => setTemplatePreviewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Email-Embedded Survey Modal */}
      {emailEmbeddedModalOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Inbox className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Email-Embedded Survey</h2>
                  <p className="text-sm text-white/80">Send questions directly in email body</p>
                </div>
              </div>
              <button 
                onClick={() => setEmailEmbeddedModalOpen(false)} 
                className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Step 1: Select Questions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-qsights-cyan text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                    <h3 className="font-semibold text-gray-900">Select Questions</h3>
                    {selectedEmbeddedQuestions.length > 0 && (
                      <span className="text-xs px-2 py-1 bg-cyan-50 text-purple-700 rounded-full">
                        {selectedEmbeddedQuestions.length} selected
                      </span>
                    )}
                  </div>
                  {embeddedQuestions.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSelectAllQuestions}
                      className="text-xs"
                    >
                      {selectedEmbeddedQuestions.length === embeddedQuestions.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>
                
                {loadingQuestions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-qsights-cyan" />
                    <span className="ml-2 text-gray-500">Loading questions...</span>
                  </div>
                ) : embeddedQuestions.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <AlertCircle className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 font-medium">No embeddable questions found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      This activity needs questions of type: Single Choice, Yes/No, or Rating
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 max-h-60 overflow-y-auto">
                    {embeddedQuestions.map((question, index) => (
                      <div
                        key={question.id}
                        onClick={() => handleToggleEmbeddedQuestion(question)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedEmbeddedQuestions.some(q => q.id === question.id)
                            ? 'border-purple-500 bg-qsights-light ring-2 ring-purple-200'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                            selectedEmbeddedQuestions.some(q => q.id === question.id)
                              ? 'border-qsights-cyan bg-qsights-cyan'
                              : 'border-gray-300'
                          }`}>
                            {selectedEmbeddedQuestions.some(q => q.id === question.id) && (
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Q{index + 1}. {question.title || question.question_text}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                {(question.type || question.question_type || '').replace('_', ' ')}
                              </span>
                              <span className="text-xs text-gray-400">
                                {question.options?.length || 0} options
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2: Select Recipients */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-qsights-cyan text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    <h3 className="font-semibold text-gray-900">Select Recipients</h3>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAllEmbedded}
                    className="text-xs"
                  >
                    {embeddedRecipients.length === participants.filter(p => p.status === 'active').length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search participants..."
                    value={embeddedSearchQuery}
                    onChange={(e) => setEmbeddedSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Participants List */}
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {participants.filter(p => p.status === 'active').length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No active participants</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-200">
                        {participants
                          .filter(p => p.status === 'active')
                          .filter(p => 
                            embeddedSearchQuery === '' ||
                            p.name?.toLowerCase().includes(embeddedSearchQuery.toLowerCase()) ||
                            p.email?.toLowerCase().includes(embeddedSearchQuery.toLowerCase())
                          )
                          .map((participant) => (
                            <tr
                              key={participant.id}
                              onClick={() => handleToggleEmbeddedRecipient(participant.id)}
                              className={`cursor-pointer hover:bg-gray-50 transition ${
                                embeddedRecipients.includes(participant.id) ? 'bg-qsights-light' : ''
                              }`}
                            >
                              <td className="px-4 py-3 w-12">
                                <input
                                  type="checkbox"
                                  checked={embeddedRecipients.includes(participant.id)}
                                  onChange={() => {}}
                                  className="h-4 w-4 rounded border-gray-300 text-qsights-cyan"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
                                    {participant.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{participant.name}</p>
                                    <p className="text-sm text-gray-500">{participant.email}</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Step 3: Email Configuration */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <h3 className="font-semibold text-gray-900">Email Configuration</h3>
                  <span className="text-xs text-gray-500">(Optional)</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {/* Subject Line */}
                  <div className="md:col-span-2">
                    <Label htmlFor="embedded-subject" className="text-sm font-medium text-gray-700">Email Subject</Label>
                    <Input
                      id="embedded-subject"
                      value={embeddedEmailConfig.subject}
                      onChange={(e) => setEmbeddedEmailConfig(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g., Quick Survey: We'd love your feedback!"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-400 mt-1">Leave empty for default: "Quick Survey from [Activity Name]"</p>
                  </div>
                  
                  {/* From Name */}
                  <div>
                    <Label htmlFor="embedded-from-name" className="text-sm font-medium text-gray-700">From Name</Label>
                    <Input
                      id="embedded-from-name"
                      value={embeddedEmailConfig.fromName}
                      onChange={(e) => setEmbeddedEmailConfig(prev => ({ ...prev, fromName: e.target.value }))}
                      placeholder="e.g., QSights Team"
                      className="mt-1"
                    />
                  </div>
                  
                  {/* Preheader */}
                  <div>
                    <Label htmlFor="embedded-preheader" className="text-sm font-medium text-gray-700">Preheader Text</Label>
                    <Input
                      id="embedded-preheader"
                      value={embeddedEmailConfig.preheader}
                      onChange={(e) => setEmbeddedEmailConfig(prev => ({ ...prev, preheader: e.target.value }))}
                      placeholder="Preview text shown in inbox"
                      className="mt-1"
                    />
                  </div>
                  
                  {/* Header Text */}
                  <div className="md:col-span-2">
                    <Label htmlFor="embedded-header" className="text-sm font-medium text-gray-700">Header Message</Label>
                    <Input
                      id="embedded-header"
                      value={embeddedEmailConfig.headerText}
                      onChange={(e) => setEmbeddedEmailConfig(prev => ({ ...prev, headerText: e.target.value }))}
                      placeholder="e.g., Hi {{name}}, please take a moment to answer this quick question:"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-400 mt-1">Use {'{{name}}'} to personalize with recipient's name</p>
                  </div>
                  
                  {/* Footer Text */}
                  <div className="md:col-span-2">
                    <Label htmlFor="embedded-footer" className="text-sm font-medium text-gray-700">Footer Message</Label>
                    <Input
                      id="embedded-footer"
                      value={embeddedEmailConfig.footerText}
                      onChange={(e) => setEmbeddedEmailConfig(prev => ({ ...prev, footerText: e.target.value }))}
                      placeholder="e.g., Thank you for your feedback!"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              {selectedEmbeddedQuestions.length > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Email Preview ({selectedEmbeddedQuestions.length} question{selectedEmbeddedQuestions.length !== 1 ? 's' : ''})
                  </h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {selectedEmbeddedQuestions.map((question, qIdx) => (
                      <div key={question.id} className="bg-white rounded-lg p-4 shadow-sm">
                        <p className="text-gray-800 font-medium mb-3">Q{qIdx + 1}. {question.title || question.question_text}</p>
                        <div className="flex flex-wrap gap-2">
                          {(question.options || []).slice(0, 5).map((option, idx) => (
                            <span 
                              key={idx} 
                              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-xs font-medium"
                            >
                              {option.option_text || option.text || option.label || option}
                            </span>
                          ))}
                          {(question.options || []).length > 5 && (
                            <span className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs">
                              +{question.options.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Each recipient will receive separate emails for each selected question.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <p className="text-sm text-gray-600">
                {selectedEmbeddedQuestions.length} question{selectedEmbeddedQuestions.length !== 1 ? 's' : ''} • {embeddedRecipients.length} recipient{embeddedRecipients.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setEmailEmbeddedModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSendEmbeddedSurvey}
                  disabled={selectedEmbeddedQuestions.length === 0 || embeddedRecipients.length === 0 || sendingEmbedded}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  {sendingEmbedded ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send {selectedEmbeddedQuestions.length * embeddedRecipients.length} email{selectedEmbeddedQuestions.length * embeddedRecipients.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Modal */}
      {deleteModal.isOpen && (
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, participantId: null, participantName: null })}
          onConfirm={() => handleRemoveParticipant(deleteModal.participantId)}
          itemName={deleteModal.participantName}
          itemType="participant"
        />
      )}
    </div>
  );
};

export default ActivityParticipantsAndNotifications;
