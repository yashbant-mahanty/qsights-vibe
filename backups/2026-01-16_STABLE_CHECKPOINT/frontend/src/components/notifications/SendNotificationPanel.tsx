"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Send,
  TestTube,
  Clock,
  Users,
  Check,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface SendNotificationPanelProps {
  activityId: string;
  templates: any[];
  selectedTemplate?: any;
  onClose: () => void;
}

const SendNotificationPanel = ({
  activityId,
  templates,
  selectedTemplate: preselectedTemplate,
  onClose,
}: SendNotificationPanelProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState(
    preselectedTemplate?.notification_type || "",
  );
  const [recipientMode, setRecipientMode] = useState<
    "all" | "specific" | "status"
  >("all");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    [],
  );
  const [participantStatus, setParticipantStatus] = useState("not_responded");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);

  useEffect(() => {
    loadParticipants();
  }, [activityId]);

  const loadParticipants = async () => {
    try {
      setLoadingParticipants(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activities/${activityId}/participants`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setParticipants(data.data || data || []);
      }
    } catch (err) {
      console.error("Error loading participants:", err);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !selectedTemplate) {
      setError("Please select a template and enter test email");
      return;
    }

    try {
      setSending(true);
      setError(null);

      const template = templates.find(
        (t) => t.notification_type === selectedTemplate,
      );

      // Get template preview with sample data
      const previewResponse = await fetch(
        `/api/activities/${activityId}/notification-templates/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template: template,
            notification_type: selectedTemplate,
          }),
        },
      );

      if (!previewResponse.ok) throw new Error("Failed to generate preview");

      const preview = await previewResponse.json();

      // Send via SendGrid
      const sendResponse = await fetch("/api/sendgrid/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail,
          subject: `[TEST] ${preview.subject}`,
          html: preview.body_html,
          text: preview.body_text,
          activityId,
          notificationType: selectedTemplate,
        }),
      });

      if (!sendResponse.ok) throw new Error("Failed to send test email");

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send test email",
      );
    } finally {
      setSending(false);
    }
  };

  const handleSendNow = async () => {
    if (!selectedTemplate) {
      setError("Please select a template");
      return;
    }

    if (recipientMode === "specific" && selectedParticipants.length === 0) {
      setError("Please select at least one participant");
      return;
    }

    try {
      setSending(true);
      setError(null);

      // Get participants based on mode
      let selectedParts = [];
      if (recipientMode === "all") {
        selectedParts = participants.filter(
          (p) => p.email && p.email.trim() !== "",
        );
      } else if (recipientMode === "specific") {
        selectedParts = participants.filter(
          (p) =>
            selectedParticipants.includes(p.id) &&
            p.email &&
            p.email.trim() !== "",
        );
      } else if (recipientMode === "status") {
        selectedParts = participants.filter(
          (p) =>
            (p.status === participantStatus ||
              p.response_status === participantStatus) &&
            p.email &&
            p.email.trim() !== "",
        );
      }

      if (selectedParts.length === 0) {
        throw new Error(
          "No participants with valid email addresses found matching criteria",
        );
      }

      // Prepare participants array for backend
      const participantsData = selectedParts.map((p) => ({
        email: p.email,
        name: p.name || p.first_name || "Participant",
      }));

      // Call backend API to send emails via SendGrid
      const token = localStorage.getItem("token");
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/notifications/send-emails`;
      
      console.log('[SendNotification] Calling API:', apiUrl);
      console.log('[SendNotification] Participants:', participantsData.length);
      console.log('[SendNotification] Has Token:', !!token);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          activityId: activityId,
          templateType: selectedTemplate,
          participants: participantsData,
        }),
      });

      console.log('[SendNotification] Response status:', response.status);
      const result = await response.json();
      console.log('[SendNotification] Response data:', result);

      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to send emails");
      }

      if (result.success) {
        setSuccess(true);
        
        // Show detailed message
        const message = `Successfully sent ${result.data.sent_count} email(s)`;
        setError(result.data.failed_count > 0 
          ? `${message}. ${result.data.failed_count} failed.`
          : null
        );
        
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2000);
      } else {
        throw new Error("All emails failed to send");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send emails");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto">
      <div className="w-full max-w-4xl min-h-full py-12 px-4 flex items-center">
        <Card className="w-full shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200 bg-white rounded-xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Send Email Notification
                </h2>
                <p className="text-sm text-white/80 mt-0.5">
                  Configure and send notifications to participants
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 group"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>

          {/* Content */}
          <div
            className="p-6 space-y-5 overflow-y-auto flex-1 bg-gradient-to-b from-white to-gray-50"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#3B82F6 #E5E7EB",
            }}
          >
            {error && (
              <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-400 rounded-xl text-red-900 text-sm shadow-lg animate-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-red-600 rounded-lg flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-base">Error</p>
                    <p className="mt-1 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl text-green-900 text-sm shadow-lg animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-green-600 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-bold text-base">Email(s) sent successfully!</p>
                </div>
              </div>
            )}

            {/* Template Selection */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-blue-200 shadow-sm">
              <Label className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 rounded-lg">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                Email Template *
              </Label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-semibold bg-white shadow-sm hover:shadow"
              >
                <option value="">Choose a template...</option>
                {templates.map((template) => (
                  <option
                    key={template.notification_type}
                    value={template.notification_type}
                  >
                    {template.notification_type
                      .replace(/_/g, " ")
                      .toUpperCase()}
                    {template.is_default ? " (Default)" : " (Custom)"}
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient Mode */}
            <div className="bg-white p-5 rounded-xl border-2 border-gray-200 shadow-sm">
              <Label className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 rounded-lg">
                  <Users className="w-4 h-4 text-white" />
                </div>
                Recipients *
              </Label>
              <div className="space-y-2.5">
                <label
                  className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                    recipientMode === "all"
                      ? "border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md"
                      : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="recipientMode"
                    value="all"
                    checked={recipientMode === "all"}
                    onChange={(e) => setRecipientMode(e.target.value as any)}
                    className="w-5 h-5 text-blue-600"
                  />
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className={`p-1.5 rounded-lg ${recipientMode === "all" ? "bg-blue-600" : "bg-gray-400"}`}>
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-bold text-gray-800">
                      All Participants
                    </span>
                  </div>
                  <span className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full shadow-sm">
                    {participants.length}
                  </span>
                </label>

                <label
                  className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                    recipientMode === "specific"
                      ? "border-green-600 bg-gradient-to-r from-green-50 to-emerald-50 shadow-md"
                      : "border-gray-300 hover:border-green-400 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="recipientMode"
                    value="specific"
                    checked={recipientMode === "specific"}
                    onChange={(e) => setRecipientMode(e.target.value as any)}
                    className="w-5 h-5 text-green-600"
                  />
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className={`p-1.5 rounded-lg ${recipientMode === "specific" ? "bg-green-600" : "bg-gray-400"}`}>
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-bold text-gray-800">
                      Specific Participants
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                    recipientMode === "status"
                      ? "border-purple-600 bg-gradient-to-r from-purple-50 to-pink-50 shadow-md"
                      : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="recipientMode"
                    value="status"
                    checked={recipientMode === "status"}
                    onChange={(e) => setRecipientMode(e.target.value as any)}
                    className="w-5 h-5 text-purple-600"
                  />
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className={`p-1.5 rounded-lg ${recipientMode === "status" ? "bg-purple-600" : "bg-gray-400"}`}>
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-bold text-gray-800">
                      By Response Status
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Specific Participants Selection */}
            {recipientMode === "specific" && (
              <div className="p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                <Label className="text-sm font-medium mb-2 block">
                  Select Participants
                </Label>
                {loadingParticipants ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-qsights-blue" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {participants.map((participant) => (
                      <label
                        key={participant.id}
                        className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedParticipants.includes(
                            participant.id,
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedParticipants([
                                ...selectedParticipants,
                                participant.id,
                              ]);
                            } else {
                              setSelectedParticipants(
                                selectedParticipants.filter(
                                  (id) => id !== participant.id,
                                ),
                              );
                            }
                          }}
                          className="text-qsights-blue"
                        />
                        <span className="text-sm">
                          {participant.name ||
                            participant.first_name ||
                            participant.email}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Status Filter */}
            {recipientMode === "status" && (
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Response Status
                </Label>
                <select
                  value={participantStatus}
                  onChange={(e) => setParticipantStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                >
                  <option value="not_responded">Not Responded</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="invited">Invited</option>
                </select>
              </div>
            )}

            {/* Schedule Option */}
            <div>
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="text-qsights-blue"
                />
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Schedule for later</span>
              </label>
            </div>

            {/* Test Email */}
            <div className="p-5 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-orange-300 rounded-xl shadow-md">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-1.5 bg-orange-600 rounded-lg">
                  <TestTube className="w-4 h-4 text-white" />
                </div>
                <Label className="text-sm font-bold text-gray-800">
                  Test Email First (Recommended)
                </Label>
              </div>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="flex-1 px-4 py-2.5 border-2 border-orange-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white shadow-sm"
                />
                <Button
                  onClick={handleSendTest}
                  disabled={sending || !testEmail || !selectedTemplate}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  Test
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-5 border-t bg-white flex-shrink-0 shadow-lg">
            <p className="text-sm text-gray-600 font-medium">
              {recipientMode === "all" 
                ? `Sending to ${participants.length} participant${participants.length !== 1 ? 's' : ''}`
                : `${selectedParticipants.length} recipient${selectedParticipants.length !== 1 ? 's' : ''} selected`}
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={sending}
                className="px-6 py-2.5 border-2 border-gray-300 hover:bg-gray-50 font-medium rounded-lg transition-all shadow-sm hover:shadow"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendNow}
                disabled={sending || !selectedTemplate}
                className="px-8 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {isScheduled ? "Schedule Send" : "Send Now"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SendNotificationPanel;
