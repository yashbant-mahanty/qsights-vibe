"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bell,
  Mail,
  Link as LinkIcon,
  Copy,
  Send,
  Users,
  UserPlus,
  Check,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";

interface Participant {
  id: string;
  name: string;
  email: string;
}

interface ActivityNotificationsPanelProps {
  activityId: string;
  activityName: string;
  allowGuests?: boolean;
  isMultilingual?: boolean;
}

export default function ActivityNotificationsPanel({
  activityId,
  activityName,
  allowGuests = false,
  isMultilingual = false,
}: ActivityNotificationsPanelProps) {
  const [notificationType, setNotificationType] = useState("invitation");
  const [language, setLanguage] = useState("EN");
  const [mode, setMode] = useState("participant");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Bulk email state
  const [emailMode, setEmailMode] = useState<"single" | "bulk">("single");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const notificationTypes = [
    { value: "invitation", label: "Invitation", icon: Mail },
    { value: "reminder", label: "Reminder", icon: Bell },
    { value: "thank-you", label: "Thank You", icon: Check },
    { value: "program-expiry", label: "Program Expiry", icon: Bell },
    { value: "activity-summary", label: "Activity Summary", icon: Bell },
  ];

  const languages = [
    { code: "EN", name: "English" },
    { code: "HI", name: "हिन्दी (Hindi)" },
    { code: "AR", name: "العربية (Arabic)" },
    { code: "FR", name: "Français (French)" },
  ];

  // Load participants for this activity
  useEffect(() => {
    if (mode === "participant" && emailMode === "bulk") {
      loadParticipants();
    }
  }, [activityId, mode, emailMode]);

  async function loadParticipants() {
    try {
      setLoadingParticipants(true);
      const { activitiesApi } = await import("@/lib/api");
      const participants = await activitiesApi.getParticipants(activityId);
      setParticipants(participants || []);
    } catch (err) {
      console.error("Failed to load participants:", err);
      alert("Failed to load participants");
    } finally {
      setLoadingParticipants(false);
    }
  }

  const handleToggleParticipant = (participantId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedParticipants([]);
      setSelectAll(false);
    } else {
      setSelectedParticipants(participants.map(p => p.id));
      setSelectAll(true);
    }
  };

  const generateLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/activities/take/${activityId}?mode=${mode}`;
  };

  const handleCopyLink = async () => {
    const link = generateLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy link to clipboard");
    }
  };

  const handleSendEmail = async () => {
    // Single email validation
    if (emailMode === "single" && mode === "participant" && !email.trim()) {
      alert("Please enter an email address for participant mode");
      return;
    }

    // Bulk email validation
    if (emailMode === "bulk" && selectedParticipants.length === 0) {
      alert("Please select at least one participant");
      return;
    }

    try {
      setSending(true);
      
      if (emailMode === "bulk") {
        // Bulk email sending
        const response = await fetch("/api/notifications/send-bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            activityId,
            activityName,
            notificationType,
            language,
            participantIds: selectedParticipants,
            link: generateLink(),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to send bulk emails");
        }

        alert(`${notificationType} emails sent to ${selectedParticipants.length} participants successfully!`);
        setSelectedParticipants([]);
        setSelectAll(false);
      } else {
        // Single email sending
        const response = await fetch("/api/notifications/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            activityId,
            activityName,
            notificationType,
            language,
            mode,
            email: mode === "participant" ? email : undefined,
            link: generateLink(),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to send email");
        }

        alert(`${notificationType} email sent successfully!`);
        if (mode === "participant") {
          setEmail("");
        }
      }
    } catch (err) {
      console.error("Failed to send email:", err);
      alert("Failed to send email: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-qsights-blue" />
            Activity Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Notification Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Notification Type <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {notificationTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.value}
                    onClick={() => setNotificationType(type.value)}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      notificationType === type.value
                        ? "border-qsights-blue bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        notificationType === type.value ? "text-qsights-blue" : "text-gray-400"
                      }`}
                    />
                    <span className="text-sm font-medium text-gray-700">{type.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Language <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {languages.map((lang) => (
                <div
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    language === lang.code
                      ? "border-qsights-blue bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-sm font-medium text-gray-700">{lang.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Access Mode <span className="text-red-500">*</span>
            </Label>
            <div className={`grid grid-cols-1 ${allowGuests ? 'md:grid-cols-2' : ''} gap-3`}>
              <div
                onClick={() => setMode("participant")}
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  mode === "participant"
                    ? "border-qsights-blue bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Users className={`w-5 h-5 ${mode === "participant" ? "text-qsights-blue" : "text-gray-400"}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">Participant</p>
                  <p className="text-xs text-gray-500">Requires name & email</p>
                </div>
              </div>
              {allowGuests && (
                <div
                  onClick={() => setMode("guest")}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    mode === "guest"
                      ? "border-qsights-blue bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <UserPlus className={`w-5 h-5 ${mode === "guest" ? "text-qsights-blue" : "text-gray-400"}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Guest</p>
                    <p className="text-xs text-gray-500">Anonymous access</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Email Mode Selection (only for participant mode) */}
          {mode === "participant" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Email Mode <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setEmailMode("single")}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    emailMode === "single"
                      ? "border-qsights-blue bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Mail className={`w-5 h-5 ${emailMode === "single" ? "text-qsights-blue" : "text-gray-400"}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Single Email</p>
                    <p className="text-xs text-gray-500">Send to one participant</p>
                  </div>
                </div>
                <div
                  onClick={() => setEmailMode("bulk")}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    emailMode === "bulk"
                      ? "border-qsights-blue bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Users className={`w-5 h-5 ${emailMode === "bulk" ? "text-qsights-blue" : "text-gray-400"}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Bulk Email</p>
                    <p className="text-xs text-gray-500">Send to multiple participants</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Single Email Input */}
          {mode === "participant" && emailMode === "single" && (
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Participant Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="participant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          {/* Bulk Participant Selection */}
          {mode === "participant" && emailMode === "bulk" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">
                  Select Participants <span className="text-red-500">*</span>
                </Label>
                {participants.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-qsights-blue hover:underline flex items-center gap-1"
                  >
                    {selectAll ? (
                      <>
                        <CheckSquare className="w-3 h-3" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <Square className="w-3 h-3" />
                        Select All
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {loadingParticipants ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-qsights-blue" />
                  <span className="ml-2 text-sm text-gray-600">Loading participants...</span>
                </div>
              ) : participants.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
                  <Users className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">No participants registered for this activity yet</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      onClick={() => handleToggleParticipant(participant.id)}
                      className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer transition-all ${
                        selectedParticipants.includes(participant.id)
                          ? "bg-blue-50 hover:bg-blue-100"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {selectedParticipants.includes(participant.id) ? (
                        <CheckSquare className="w-5 h-5 text-qsights-blue flex-shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{participant.name}</p>
                        <p className="text-xs text-gray-500 truncate">{participant.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedParticipants.length > 0 && (
                <p className="text-xs text-qsights-blue">
                  {selectedParticipants.length} participant{selectedParticipants.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-qsights-blue" />
            Activity Link
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Generated Link */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Public Link</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono break-all">
                {generateLink()}
              </div>
              <button
                onClick={handleCopyLink}
                className="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSendEmail}
              disabled={
                sending ||
                (mode === "participant" && emailMode === "single" && !email.trim()) ||
                (mode === "participant" && emailMode === "bulk" && selectedParticipants.length === 0)
              }
              className="flex-1 px-4 py-3 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {mode === "participant" && emailMode === "bulk" && selectedParticipants.length > 0
                    ? `Send to ${selectedParticipants.length} Participant${selectedParticipants.length > 1 ? "s" : ""}`
                    : "Send Email"}
                </>
              )}
            </button>
          </div>

          {/* Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              <strong>Note:</strong> The link will be {mode === "participant" ? "sent to the participant's email and " : ""}
              valid for the activity duration. {mode === "participant" 
                ? "Participants will need to provide their name and email." 
                : "Guests can access anonymously."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
