"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, Users, Trash2, Power, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DeleteConfirmationModal from '@/components/delete-confirmation-modal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const ActivityParticipantManager = ({ activityId, authToken }) => {
  const [participants, setParticipants] = useState([]);
  const [availableParticipants, setAvailableParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modal states
  const [addNewModalOpen, setAddNewModalOpen] = useState(false);
  const [selectExistingModalOpen, setSelectExistingModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, participantId: null, participantName: null });
  
  // Form states
  const [newParticipantForm, setNewParticipantForm] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Get auth token with fallback
  const getAuthToken = useCallback(() => {
    let token = '';
    
    // First try the prop
    if (authToken) {
      token = authToken;
      console.log('Using authToken prop');
    } 
    // Then try localStorage
    else if (typeof window !== 'undefined') {
      token = localStorage.getItem('token') || '';
      if (token) {
        console.log('Using token from localStorage');
      }
    }
    
    if (!token) {
      console.error('No authentication token found!');
      console.log('authToken prop:', authToken);
      console.log('localStorage token:', typeof window !== 'undefined' ? localStorage.getItem('token') : 'N/A');
    }
    
    return token;
  }, [authToken]);

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      const response = await fetch(`${API_URL}/activities/${activityId}/participants`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch participants');
      
      const result = await response.json();
      setParticipants(result.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch participants');
      if (err.message && err.message.includes('Unauthenticated')) {
        setError('Your session has expired. Please log in again.');
      }
    } finally {
      setLoading(false);
    }
  }, [activityId, getAuthToken]);

  // Fetch available participants for selection
  const fetchAvailableParticipants = useCallback(async (search = '') => {
    try {
      const token = getAuthToken();
      const url = new URL(`${API_URL}/activities/${activityId}/participants/available`);
      if (search) url.searchParams.append('search', search);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch available participants');
      
      const result = await response.json();
      setAvailableParticipants(result.data || []);
    } catch (err) {
      console.error('Error fetching available participants:', err);
    }
  }, [activityId, getAuthToken]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setError('You are not logged in. Please log in to manage participants.');
      setLoading(false);
      return;
    }
    fetchParticipants();
  }, [fetchParticipants, getAuthToken]);

  // Add new participant
  const handleAddNewParticipant = useCallback(async () => {
    // Validate required fields
    if (!newParticipantForm.name || !newParticipantForm.email) {
      setError('Name and email are required');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const token = getAuthToken();
      console.log('Add participant - Token length:', token.length);
      console.log('Add participant - Form data:', newParticipantForm);
      
      const response = await fetch(`${API_URL}/activities/${activityId}/participants/new`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(newParticipantForm),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(result?.message || 'This email is already added to this activity.');
        }
        const validationMessage = result?.message || (result?.errors ? Object.values(result.errors).flat()[0] : null);
        throw new Error(validationMessage || 'Failed to add participant');
      }
      
      const resultMessage = result?.message || 'Participant added successfully';
      setSuccessMessage(resultMessage);
      setAddNewModalOpen(false);
      setNewParticipantForm({ name: '', email: '', phone: '', notes: '' });
      fetchParticipants();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error adding participant:', err);
      setError(err.message || 'Failed to add participant');
      setTimeout(() => setError(null), 5000);
    }
  }, [activityId, newParticipantForm, getAuthToken, fetchParticipants]);

  // Add existing participants
  const handleAddExistingParticipants = useCallback(async () => {
    if (selectedParticipantIds.length === 0) return;

    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_URL}/activities/${activityId}/participants/existing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ participant_ids: selectedParticipantIds }),
      });

      if (!response.ok) throw new Error('Failed to add participants');
      
      const result = await response.json();
      setSuccessMessage(`Added ${result.added} participant(s)`);
      setSelectExistingModalOpen(false);
      setSelectedParticipantIds([]);
      setSearchQuery('');
      fetchParticipants();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  }, [activityId, selectedParticipantIds, getAuthToken, fetchParticipants]);

  // Remove participant
  const handleRemoveParticipant = useCallback(async (participantId) => {
    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_URL}/activities/${activityId}/participants/${participantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to remove participant');
      
      setSuccessMessage('Participant removed from activity');
      setDeleteModal({ isOpen: false, participantId: null, participantName: null });
      fetchParticipants();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  }, [activityId, getAuthToken, fetchParticipants]);

  // Toggle participant status
  const handleToggleStatus = useCallback(async (participantId) => {
    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_URL}/participants/${participantId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to toggle status');
      
      setSuccessMessage('Participant status updated');
      fetchParticipants();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  }, [getAuthToken, fetchParticipants]);

  // Open select existing modal
  const openSelectExistingModal = useCallback(() => {
    setSelectExistingModalOpen(true);
    fetchAvailableParticipants();
  }, [fetchAvailableParticipants]);

  // Handle search in available participants
  const handleSearchAvailable = useCallback((query) => {
    setSearchQuery(query);
    fetchAvailableParticipants(query);
  }, [fetchAvailableParticipants]);

  // Toggle participant selection
  const toggleParticipantSelection = useCallback((participantId) => {
    setSelectedParticipantIds(prev => 
      prev.includes(participantId) 
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Header with action buttons */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Activity Participants</h3>
          <p className="text-sm text-gray-500">Total: {participants.length}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAddNewModalOpen(true)} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add New
          </Button>
          <Button onClick={openSelectExistingModal} variant="outline" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Select Existing
          </Button>
        </div>
      </div>

      {/* Participants List */}
      <Card className="p-4">
        {participants.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No participants added to this activity yet.
          </div>
        ) : (
          <div className="space-y-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{participant.name}</p>
                    {participant.is_guest && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">Guest</span>
                    )}
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      participant.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {participant.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{participant.email}</p>
                  {participant.phone && (
                    <p className="text-sm text-gray-500">{participant.phone}</p>
                  )}
                  {participant.joined_at && (
                    <p className="text-xs text-gray-400">
                      Joined: {new Date(participant.joined_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleStatus(participant.id)}
                    title={`Toggle status (currently ${participant.status})`}
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
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add New Participant Modal */}
      {addNewModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New Participant</h2>
              <button onClick={() => setAddNewModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Create a new participant and add them to this activity</p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newParticipantForm.name}
                  onChange={(e) => setNewParticipantForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter participant name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newParticipantForm.email}
                  onChange={(e) => setNewParticipantForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newParticipantForm.phone}
                  onChange={(e) => setNewParticipantForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={newParticipantForm.notes}
                  onChange={(e) => setNewParticipantForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => setAddNewModalOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAddNewParticipant} className="flex-1">Add Participant</Button>
            </div>
          </div>
        </div>
      )}

      {/* Select Existing Participants Modal */}
      {selectExistingModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Select From Program Participants</h2>
              <button onClick={() => {
                setSelectExistingModalOpen(false);
                setSelectedParticipantIds([]);
                setSearchQuery('');
              }} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Choose existing participants to add to this activity</p>
            
            {/* Search */}
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search participants..."
                value={searchQuery}
                onChange={(e) => handleSearchAvailable(e.target.value)}
              />
            </div>

            {/* Participants List */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {availableParticipants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No available participants found
                </div>
              ) : (
                availableParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    onClick={() => toggleParticipantSelection(participant.id)}
                    className={`flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                      selectedParticipantIds.includes(participant.id) ? 'bg-blue-50 border-blue-300' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{participant.name}</p>
                        {participant.is_guest && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">Guest</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{participant.email}</p>
                      {participant.phone && (
                        <p className="text-sm text-gray-500">{participant.phone}</p>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedParticipantIds.includes(participant.id)}
                      onChange={() => {}}
                      className="h-4 w-4"
                    />
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2 pt-4 border-t">
              <p className="text-sm text-gray-500 mr-auto">
                {selectedParticipantIds.length} selected
              </p>
              <Button variant="outline" onClick={() => {
                setSelectExistingModalOpen(false);
                setSelectedParticipantIds([]);
                setSearchQuery('');
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddExistingParticipants}
                disabled={selectedParticipantIds.length === 0}
              >
                Add {selectedParticipantIds.length} Participant(s)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, participantId: null, participantName: null })}
          onConfirm={() => handleRemoveParticipant(deleteModal.participantId)}
          itemName={deleteModal.participantName}
          itemType="participant from this activity"
        />
      )}
    </div>
  );
};

export default ActivityParticipantManager;
