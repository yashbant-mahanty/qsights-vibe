"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
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
    // Thank you page background settings (reused for registration)
    thankYouBackgroundStyle?: string;
    thankYouBackgroundColor?: string;
    thankYouGradientFrom?: string;
    thankYouGradientTo?: string;
    // Post Session Registration config
    postSessionRegTitle?: string;
    postSessionRegSubtitle?: string;
    postSessionRegDescription?: string;
    postSessionRegButtonText?: string;
    postSessionRegBackgroundColor?: string;
    postSessionRegBackgroundImageUrl?: string;
    postSessionRegBackgroundOpacity?: number;
    postSessionRegFormBackgroundColor?: string;
    postSessionRegFormBorderColor?: string;
    postSessionRegButtonColor?: string;
    postSessionRegTitleColor?: string;
    postSessionRegDescriptionColor?: string;
  };
}

export default function PostSubmissionRegistrationPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const activityId = params?.id as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [participantData, setParticipantData] = useState<Record<string, any>>({});
  const [tempSessionToken, setTempSessionToken] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState("2.0");
  const [isPreview, setIsPreview] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [hasTokenData, setHasTokenData] = useState(false);

  useEffect(() => {
    loadActivity();
  }, [activityId]);

  async function loadActivity() {
    try {
      setLoading(true);

      // Check if preview mode from URL or localStorage (take page stores as temp_preview_)
      const previewParam = searchParams?.get('preview');
      const storedPreview = localStorage.getItem(`temp_preview_${activityId}`);
      const isPreviewMode = previewParam === 'true' || storedPreview === 'true';
      setIsPreview(isPreviewMode);
      
      // Check if anonymous mode from URL or localStorage (take page stores as temp_anonymous_)
      const anonymousParam = searchParams?.get('anonymous');
      const storedAnonymous = localStorage.getItem(`temp_anonymous_${activityId}`);
      const isAnonymousMode = anonymousParam === 'true' || storedAnonymous === 'true';
      setIsAnonymous(isAnonymousMode);
      
      console.log('[REGISTER] Preview mode:', isPreviewMode, 'Anonymous mode:', isAnonymousMode);

      // Check for stored access token (from triggered email links)
      const storedAccessToken = localStorage.getItem(`temp_token_${activityId}`);
      
      // If we have an access token, validate it and check completion status
      if (storedAccessToken && !isPreviewMode && !isAnonymousMode) {
        console.log('[REGISTER] Found access token, validating...');
        try {
          const tokenResponse = await fetch(`/api/public/access-tokens/${storedAccessToken}/validate`);
          const tokenData = await tokenResponse.json();
          
          console.log('[REGISTER] Token validation response:', tokenData);
          
          // If participant already completed, redirect to thank you page
          if (tokenData.already_completed) {
            console.log('[REGISTER] Participant already completed - redirecting to thank you');
            setAlreadyCompleted(true);
            
            // Clean up localStorage
            localStorage.removeItem(`temp_session_${activityId}`);
            localStorage.removeItem(`temp_responses_${activityId}`);
            localStorage.removeItem(`temp_participant_${activityId}`);
            localStorage.removeItem(`temp_token_${activityId}`);
            localStorage.removeItem(`temp_preview_${activityId}`);
            localStorage.removeItem(`temp_anonymous_${activityId}`);
            
            toast({
              title: "Already Completed",
              description: "You have already submitted this activity. Thank you!",
              variant: "success"
            });
            
            router.push(`/activities/take/${activityId}?submitted=true`);
            return;
          }
        } catch (tokenErr) {
          console.log('[REGISTER] Token validation failed, continuing with form:', tokenErr);
        }
      }

      // For anonymous mode, pre-fill with anonymous values
      if (isAnonymousMode) {
        setParticipantData({
          name: 'Anonymous',
          full_name: 'Anonymous',
          email: 'anonymous@anonymous.com',
          email_address: 'anonymous@anonymous.com',
          phone: 'N/A',
          organization: 'Anonymous',
        });
      } else {
        // Check for stored participant data from token (pre-fill registration form)
        const storedParticipantData = localStorage.getItem(`temp_participant_${activityId}`);
        if (storedParticipantData) {
          try {
            const parsedData = JSON.parse(storedParticipantData);
            console.log('[REGISTER] Pre-filling form with token data:', parsedData);
            setParticipantData(parsedData);
            setHasTokenData(true);
          } catch (parseErr) {
            console.log('[REGISTER] Failed to parse participant data:', parseErr);
          }
        }
      }

      // Fetch activity data
      const activityResponse = await fetch(`/api/public/activities/${activityId}`);
      if (!activityResponse.ok) {
        throw new Error("Activity not found");
      }
      const activityData = await activityResponse.json();
      setActivity(activityData.data);

      // Get temporary session token from localStorage (skip check for preview)
      const storedToken = localStorage.getItem(`temp_session_${activityId}`);
      if (!storedToken && !isPreviewMode) {
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
    
    // Check if this is a name or email field and if we have token data
    const isIdentityField = ['name', 'full_name', 'email', 'email_address'].includes(fieldKey) || field.type === 'email';
    const isReadOnly = hasTokenData && isIdentityField && value; // Make read-only if pre-filled from token

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
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent ${
              isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            readOnly={isReadOnly}
            disabled={isReadOnly}
          />
        );
      case "select":
        return (
          <select
            id={fieldKey}
            name={fieldKey}
            value={value}
            onChange={(e) => handleInputChange(fieldKey, e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent ${
              isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            disabled={isReadOnly}
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
            className={`w-full ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            readOnly={isReadOnly}
            disabled={isReadOnly}
          />
        );
    }
  };

  const handleSubmit = async () => {
    console.log('[REGISTER] handleSubmit called, isPreview:', isPreview, 'isAnonymous:', isAnonymous);
    
    // For preview mode, skip validation and just redirect to thank you
    if (isPreview) {
      console.log('[REGISTER] Preview mode - skipping validation, redirecting to thank you');
      // Clean up all preview data
      localStorage.removeItem(`temp_session_${activityId}`);
      localStorage.removeItem(`temp_responses_${activityId}`);
      localStorage.removeItem(`temp_preview_${activityId}`);
      localStorage.removeItem(`temp_participant_${activityId}`);
      localStorage.removeItem(`temp_token_${activityId}`);
      localStorage.removeItem(`temp_anonymous_${activityId}`);
      router.push(`/activities/take/${activityId}?submitted=true&preview=true`);
      return;
    }
    
    // For anonymous mode, skip validation and submit with anonymous participant
    if (isAnonymous) {
      console.log('[REGISTER] Anonymous mode - skipping validation, submitting anonymously');
      try {
        setSubmitting(true);
        
        // Get stored responses
        const storedResponses = localStorage.getItem(`temp_responses_${activityId}`);
        const responses = storedResponses ? JSON.parse(storedResponses) : {};
        
        // Step 1: Register as anonymous participant first (to get participant_id)
        const anonymousName = `Anonymous_${Date.now()}`;
        const anonymousEmail = `anonymous_${Date.now()}@anonymous.local`;
        
        const registerResponse = await fetch(`/api/public/activities/${activityId}/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            name: anonymousName,
            email: anonymousEmail,
            additional_data: {},
            is_anonymous: true,
          }),
        });

        if (!registerResponse.ok) {
          const errorData = await registerResponse.json().catch(() => null);
          console.error('[REGISTER] Anonymous registration failed:', errorData);
          throw new Error("Failed to register anonymous participant");
        }

        const registerData = await registerResponse.json();
        const participantId = registerData.data.participant_id;
        console.log('[REGISTER] Anonymous participant created:', participantId);

        // Step 2: Submit responses with participant_id
        const submitPayload = {
          participant_id: participantId,
          answers: responses,
          started_at: new Date().toISOString(),
          is_anonymous: true,
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
          const errorData = await submitResponse.json().catch(() => null);
          console.error('[REGISTER] Anonymous submit failed:', errorData);
          throw new Error("Failed to submit response");
        }

        // Clean up all anonymous data
        localStorage.removeItem(`temp_session_${activityId}`);
        localStorage.removeItem(`temp_responses_${activityId}`);
        localStorage.removeItem(`temp_anonymous_${activityId}`);
        localStorage.removeItem(`temp_participant_${activityId}`);
        localStorage.removeItem(`temp_token_${activityId}`);
        localStorage.removeItem(`temp_preview_${activityId}`);
        
        // Redirect to thank you page
        router.push(`/activities/take/${activityId}?submitted=true`);
        return;
      } catch (err) {
        console.error('[REGISTER] Anonymous submission error:', err);
        toast({
          title: "Error",
          description: "Failed to submit. Please try again.",
          variant: "error"
        });
        setSubmitting(false);
        return;
      }
    }
    
    if (!tempSessionToken) {
      toast({
        title: "Error",
        description: "No submission found. Please try again.",
        variant: "error"
      });
      return;
    }

    // Validate required fields (only for non-preview/non-anonymous mode)
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

      // Mark access token as used (if token-based access) to prevent duplicate submissions
      const storedAccessToken = localStorage.getItem(`temp_token_${activityId}`);
      if (storedAccessToken) {
        try {
          await fetch(`/api/public/access-tokens/${storedAccessToken}/mark-used`, {
            method: 'POST',
          });
          console.log('[REGISTER] Access token marked as used');
        } catch (err) {
          console.error('[REGISTER] Failed to mark token as used:', err);
        }
      }

      // Clean up all temporary data
      localStorage.removeItem(`temp_session_${activityId}`);
      localStorage.removeItem(`temp_responses_${activityId}`);
      localStorage.removeItem(`temp_participant_${activityId}`);
      localStorage.removeItem(`temp_token_${activityId}`);
      localStorage.removeItem(`temp_preview_${activityId}`);
      localStorage.removeItem(`temp_anonymous_${activityId}`);

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

  const backgroundStyle = {
    backgroundColor: activity.landing_config?.postSessionRegBackgroundColor || "#F3F4F6",
    ...(activity.landing_config?.postSessionRegBackgroundImageUrl && {
      backgroundImage: `url(${activity.landing_config.postSessionRegBackgroundImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative' as const,
    }),
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={backgroundStyle}
    >
      {/* Background overlay for image opacity */}
      {activity.landing_config?.postSessionRegBackgroundImageUrl && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: activity.landing_config?.postSessionRegBackgroundColor || "#F3F4F6",
            opacity: (100 - (activity.landing_config?.postSessionRegBackgroundOpacity || 100)) / 100,
          }}
        />
      )}
      <div className="w-full max-w-md relative z-10">
        <Card 
          className="shadow-2xl overflow-hidden backdrop-blur-sm"
          style={{
            backgroundColor: activity.landing_config?.postSessionRegFormBackgroundColor || "#FFFFFF",
            borderColor: activity.landing_config?.postSessionRegFormBorderColor || "#E5E7EB",
            borderWidth: '1px',
          }}
        >
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
                <CardTitle 
                  className="text-xl font-bold text-center"
                  style={{ color: activity.landing_config?.postSessionRegTitleColor || "#1F2937" }}
                >
                  {activity.landing_config?.postSessionRegTitle || "Complete Your Registration"}
                </CardTitle>
                {(activity.landing_config?.postSessionRegSubtitle || activity.landing_config?.postSessionRegDescription) && (
                  <div className="mt-2 text-center space-y-1">
                    {activity.landing_config?.postSessionRegSubtitle && (
                      <p 
                        className="text-base font-medium"
                        style={{ color: activity.landing_config?.postSessionRegDescriptionColor || "#6B7280" }}
                      >
                        {activity.landing_config.postSessionRegSubtitle}
                      </p>
                    )}
                    {activity.landing_config?.postSessionRegDescription && (
                      <p 
                        className="text-sm"
                        style={{ color: activity.landing_config?.postSessionRegDescriptionColor || "#6B7280" }}
                      >
                        {activity.landing_config.postSessionRegDescription}
                      </p>
                    )}
                  </div>
                )}
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

            {/* Form Fields - Hidden for Anonymous mode */}
            {isAnonymous ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 text-center">
                  You are submitting as <span className="font-semibold">Anonymous</span>
                </p>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Your identity will not be recorded with this submission.
                </p>
              </div>
            ) : (
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
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full px-4 py-3 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: activity.landing_config?.postSessionRegButtonColor || activity.landing_config?.loginButtonColor || "#3B82F6" }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : isAnonymous ? (
                'Submit Anonymously'
              ) : isPreview ? (
                'Continue (Preview Mode)'
              ) : (
                activity.landing_config?.postSessionRegButtonText || 'Complete Registration'
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
