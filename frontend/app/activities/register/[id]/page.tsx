"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface FormField {
  id: string;
  name?: string; // Support both id and name from backend
  type: "text" | "email" | "phone" | "number" | "date" | "textarea" | "select" | "address" | "organization";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  order: number;
  isMandatory?: boolean;
}

interface Activity {
  id: string;
  name: string;
  description?: string;
  registration_form_fields?: FormField[];
  landing_config?: {
    loginBoxLogoUrl?: string;
    loginBoxContentType?: string;
    loginBoxCustomTitle?: string;
    loginBoxCustomSubtitle?: string;
    loginButtonColor?: string;
    footerTextColor?: string;
  };
}

export default function PostSubmissionRegistrationPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params?.id as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [participantData, setParticipantData] = useState<Record<string, any>>({});
  const [tempSessionToken, setTempSessionToken] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState("2.0");

  useEffect(() => {
    loadActivity();
  }, [activityId]);

  async function loadActivity() {
    try {
      setLoading(true);

      // Fetch activity data
      const activityResponse = await fetch(`/api/public/activities/${activityId}`);
      if (!activityResponse.ok) {
        throw new Error("Activity not found");
      }
      const activityData = await activityResponse.json();
      setActivity(activityData.data);

      // Get temporary session token from localStorage
      const storedToken = localStorage.getItem(`temp_session_${activityId}`);
      if (!storedToken) {
        // No temporary session found - redirect back to take page
        toast({
          title: "Error",
          description: "No submission found. Please complete the activity first.",
          variant: "error"
        });
        router.push(`/activities/take/${activityId}`);
        return;
      }
      setTempSessionToken(storedToken);

      // Load app version
      try {
        const appSettingsResponse = await fetch('/api/app-settings');
        if (appSettingsResponse.ok) {
          const appSettingsData = await appSettingsResponse.json();
          if (appSettingsData.data?.app_version) {
            setAppVersion(appSettingsData.data.app_version);
          }
        }
      } catch (err) {
        console.log("Could not load app version settings");
      }
    } catch (err) {
      console.error("Error loading activity:", err);
      toast({
        title: "Error",
        description: "Failed to load activity",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (fieldId: string, value: any) => {
    setParticipantData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const renderFormField = (field: FormField) => {
    // Use the same field key logic as pre-registration: support both 'id' and 'name'
    const fieldKey = field.id || (field as any).name || 'unknown';
    const value = participantData[fieldKey] || "";

    switch (field.type) {
      case "textarea":
        return (
          <textarea
            id={fieldKey}
            name={fieldKey}
            value={value}
            onChange={(e) => handleInputChange(fieldKey, e.target.value)}
            placeholder={field.placeholder || field.label}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
          />
        );
      case "select":
        return (
          <select
            id={fieldKey}
            name={fieldKey}
            value={value}
            onChange={(e) => handleInputChange(fieldKey, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
          >
            <option value="">-- Select an option --</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      default:
        return (
          <Input
            id={fieldKey}
            name={fieldKey}
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(fieldKey, e.target.value)}
            placeholder={field.placeholder || field.label}
            className="w-full"
          />
        );
    }
  };

  const handleSubmit = async () => {
    if (!tempSessionToken) {
      toast({
        title: "Error",
        description: "No submission found. Please try again.",
        variant: "error"
      });
      return;
    }

    // Validate required fields
    const formFields = activity?.registration_form_fields || [
      { id: "name", name: "name", type: "text", label: "Full Name", required: true, order: 0, isMandatory: true },
      { id: "email", name: "email", type: "email", label: "Communication Email ID", required: true, order: 1, isMandatory: true },
    ];

    for (const field of formFields) {
      if (field.required || field.isMandatory) {
        // Use the same field key logic as form rendering
        const fieldKey = field.id || (field as any).name || 'unknown';
        const value = participantData[fieldKey];
        if (!value || (typeof value === "string" && !value.trim())) {
          toast({
            title: "Validation Error",
            description: `${field.label} is required`,
            variant: "warning"
          });
          return;
        }
      }
    }

    try {
      setSubmitting(true);

      // Register participant
      const registerResponse = await fetch(`/api/public/activities/${activityId}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          name: participantData.name || participantData.full_name,
          email: participantData.email || participantData.email_address,
          additional_data: participantData,
          is_anonymous: false,
          is_preview: false,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to register");
      }

      const registerData = await registerResponse.json();
      const participantId = registerData.data.participant_id;

      // Link temporary submission to participant
      const linkResponse = await fetch(`/api/public/activities/${activityId}/temporary-submissions/link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_token: tempSessionToken,
          participant_id: participantId,
        }),
      });

      if (!linkResponse.ok) {
        throw new Error("Failed to link submission");
      }

      const linkData = await linkResponse.json();

      // Submit final response
      const submitPayload = {
        participant_id: participantId,
        answers: linkData.data.responses,
        started_at: new Date().toISOString(),
        is_preview: false,
      };

      const submitResponse = await fetch(`/api/public/activities/${activityId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(submitPayload),
      });

      if (!submitResponse.ok) {
        throw new Error("Failed to submit response");
      }

      // Clean up temporary data
      localStorage.removeItem(`temp_session_${activityId}`);
      localStorage.removeItem(`temp_responses_${activityId}`);

      // Success! Redirect to thank you page with submitted flag
      router.push(`/activities/take/${activityId}?submitted=true`);

    } catch (err) {
      console.error("Registration error:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to complete registration",
        variant: "error"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-qsights-blue" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Activity not found</p>
      </div>
    );
  }

  const formFields = activity.registration_form_fields || [
    { id: "name", name: "name", type: "text" as const, label: "Full Name", required: true, order: 0, isMandatory: true },
    { id: "email", name: "email", type: "email" as const, label: "Communication Email ID", required: true, order: 1, isMandatory: true },
  ];

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{
        background: activity.landing_config?.loginBoxContentType === 'logo' || activity.landing_config?.loginBoxContentType === 'text'
          ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      }}
    >
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 overflow-hidden backdrop-blur-sm bg-white/95">
          <CardHeader className="p-6 relative z-10">
            {activity.landing_config?.loginBoxContentType === 'logo' && activity.landing_config?.loginBoxLogoUrl ? (
              <div className="flex justify-center mb-3">
                <img 
                  src={activity.landing_config.loginBoxLogoUrl} 
                  alt="Logo" 
                  className="h-16 object-contain"
                />
              </div>
            ) : activity.landing_config?.loginBoxContentType === 'text' ? (
              <>
                {activity.landing_config?.loginBoxCustomTitle && (
                  <CardTitle className="text-xl font-bold text-center">{activity.landing_config.loginBoxCustomTitle}</CardTitle>
                )}
                {activity.landing_config?.loginBoxCustomSubtitle && (
                  <p className="text-sm text-gray-600 mt-2 text-center">{activity.landing_config.loginBoxCustomSubtitle}</p>
                )}
              </>
            ) : (
              <>
                <CardTitle className="text-xl font-bold text-center">Complete Your Registration</CardTitle>
                <p className="text-sm text-gray-600 mt-2 text-center">Please provide your details to finalize your submission</p>
              </>
            )}
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Success indicator */}
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Responses Saved!</p>
                <p className="text-xs text-gray-600 mt-1">Complete registration to finalize your submission</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {formFields
                .sort((a, b) => a.order - b.order)
                .map((field, idx) => {
                  // Use the same field key logic as pre-registration
                  const fieldKey = field.id || (field as any).name || `field-${idx}`;
                  return (
                    <div key={fieldKey} className="space-y-2">
                      <Label htmlFor={fieldKey} className="text-sm font-medium text-gray-700">
                        {field.label}
                        {(field.required || field.isMandatory) && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                      {renderFormField(field)}
                    </div>
                  );
                })}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full px-4 py-3 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: activity.landing_config?.loginButtonColor || "#3B82F6" }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Complete Registration'
              )}
            </button>
          </CardContent>
        </Card>

        {/* Version Display */}
        <div className="mt-4 text-center">
          <p 
            className="text-xs font-medium"
            style={{ color: activity.landing_config?.footerTextColor || "#E5E7EB" }}
          >
            Version {appVersion}
          </p>
        </div>
      </div>
    </div>
  );
}
