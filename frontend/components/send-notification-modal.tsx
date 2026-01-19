"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Send, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { API_URL } from "@/lib/api";
import { toast } from "@/components/ui/toast";

interface SendNotificationModalProps {
  managerId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role_name?: string;
}

export default function SendNotificationModal({
  managerId,
  isOpen,
  onClose,
  onSuccess,
}: SendNotificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
    sendEmail: false,
  });

  const [errors, setErrors] = useState({
    subject: "",
    message: "",
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  useEffect(() => {
    if (isOpen && managerId) {
      loadTeamMembers();
      resetForm();
    }
  }, [isOpen, managerId]);

  const resetForm = () => {
    setFormData({
      subject: "",
      message: "",
      sendEmail: false,
    });
    setSelectedMembers([]);
    setSelectAll(true);
    setErrors({
      subject: "",
      message: "",
    });
  };

  const loadTeamMembers = async () => {
    if (!managerId) return;

    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(
        `${API_URL}/hierarchy/managers/${managerId}/team-members`,
        { headers, credentials: 'include' }
      );

      const data = await response.json();

      if (data.success) {
        setTeamMembers(data.team_members || []);
      } else {
        throw new Error(data.message || 'Failed to load team members');
      }
    } catch (error: any) {
      console.error('Error loading team members:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load team members",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors = {
      subject: "",
      message: "",
    };

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    } else if (formData.subject.length > 255) {
      newErrors.subject = "Subject must be less than 255 characters";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    }

    if (!selectAll && selectedMembers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one team member",
        variant: "error"
      });
      return false;
    }

    setErrors(newErrors);
    return !newErrors.subject && !newErrors.message;
  };

  const handleSend = async () => {
    if (!validate() || !managerId) return;

    setSending(true);
    try {
      const headers = getAuthHeaders();
      
      const payload: any = {
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        send_email: formData.sendEmail,
      };

      // If not selecting all, include specific recipient IDs
      if (!selectAll) {
        payload.recipient_ids = selectedMembers;
      }

      const response = await fetch(
        `${API_URL}/hierarchy/managers/${managerId}/send-notification`,
        {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success!",
          description: `Notification sent to ${data.sent_count} team member(s)`,
          variant: "success"
        });
        onSuccess?.();
        onClose();
      } else {
        throw new Error(data.message || 'Failed to send notification');
      }
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "error"
      });
    } finally {
      setSending(false);
    }
  };

  const handleToggleMember = (memberId: number) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
    setSelectAll(false);
  };

  const handleToggleAll = () => {
    setSelectAll(!selectAll);
    if (!selectAll) {
      setSelectedMembers([]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Send Team Notification
          </DialogTitle>
          <DialogDescription>
            Send an in-app notification to your team members
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Loading team members...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Recipients Section */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Recipients</h4>
                </div>
                <span className="text-sm text-gray-600">
                  {selectAll ? teamMembers.length : selectedMembers.length} selected
                </span>
              </div>

              {/* Select All */}
              <div className="flex items-center gap-2 mb-3 p-2 bg-white rounded border border-blue-200">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleToggleAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Send to all team members ({teamMembers.length})
                </label>
              </div>

              {/* Individual Members */}
              {!selectAll && (
                <div className="space-y-2 max-h-48 overflow-y-auto bg-white rounded border border-gray-200 p-2">
                  {teamMembers.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No team members found
                    </p>
                  ) : (
                    teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
                      >
                        <Checkbox
                          id={`member-${member.id}`}
                          checked={selectedMembers.includes(member.id)}
                          onCheckedChange={() => handleToggleMember(member.id)}
                        />
                        <label
                          htmlFor={`member-${member.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <p className="text-sm font-medium text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-600">{member.email}</p>
                        </label>
                        {member.role_name && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            {member.role_name}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">
                Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enter notification subject"
                maxLength={255}
                className={errors.subject ? "border-red-500" : ""}
              />
              {errors.subject && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.subject}
                </p>
              )}
              <p className="text-xs text-gray-500">
                {formData.subject.length}/255 characters
              </p>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">
                Message <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter your message here..."
                rows={6}
                className={errors.message ? "border-red-500" : ""}
              />
              {errors.message && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.message}
                </p>
              )}
            </div>

            {/* Email Option */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Checkbox
                id="send-email"
                checked={formData.sendEmail}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, sendEmail: checked as boolean })
                }
              />
              <div className="flex-1">
                <label htmlFor="send-email" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Also send via email
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  Recipients will receive both in-app and email notifications
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Important Notes:</p>
                  <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                    <li>Notifications will be sent immediately</li>
                    <li>Recipients will see this in their notifications panel</li>
                    <li>You can track notification read status in analytics</li>
                    <li>Email delivery (if enabled) may take a few minutes</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || teamMembers.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Notification
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
