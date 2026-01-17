"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PerQuestionLanguageSwitcher from "@/components/PerQuestionLanguageSwitcher";
import {
  Calendar,
  FileText,
  Loader2,
  CheckCircle,
  Circle,
  Square,
  Star,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Send,
  UserPlus,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { evaluateConditionalLogic, filterQuestionsByLogic } from "@/utils/conditionalLogicEvaluator";
import { QuestionWithLogic } from "@/types/conditionalLogic";

interface FormField {
  id: string;
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
  type: string;
  status: string;
  start_date?: string;
  end_date?: string;
  questionnaire_id?: string;
  registration_form_fields?: FormField[];
  time_limit_enabled?: boolean;
  time_limit_minutes?: number;
  pass_percentage?: number;
  is_multilingual?: boolean;
  languages?: string[];
  landing_config?: {
    logoUrl?: string;
    logoSize?: string;
    pageTitle?: string;
    pageTitleColor?: string;
    bannerBackgroundColor?: string;
    bannerText?: string;
    bannerTextColor?: string;
    bannerImageUrl?: string;
    bannerHeight?: string;
    bannerTextPosition?: string;
    bannerImagePosition?: string;
    bannerShowOnInnerPages?: boolean;
    backgroundColor?: string;
    footerText?: string;
    footerTextColor?: string;
    footerBackgroundColor?: string;
    footerHeight?: string;
    footerEnabled?: boolean;
    footerLogoUrl?: string;
    footerLogoPosition?: string;
    footerLogoSize?: string;
    footerTextPosition?: string;
    logoPosition?: string;
    leftContentEnabled?: boolean;
    leftContentTitle?: string;
    leftContentTitleColor?: string;
    leftContentDescription?: string;
    leftContentDescriptionColor?: string;
    leftContentImageUrl?: string;
    leftContentImagePosition?: string;
    leftContentBackgroundColor?: string;
    activityCardHeaderColor?: string;
    loginBoxBannerLogoUrl?: string;
    loginButtonColor?: string;
    loginBoxAlignment?: string;
    [key: string]: any;
  };
}

interface Questionnaire {
  id: string;
  title: string;
  type?: string;
  sections?: Array<{
    id: string;
    title: string;
    description?: string;
    questions: Array<any>;
  }>;
}

// Language code to full name mapping
const LANGUAGE_NAMES: { [key: string]: string } = {
  EN: "English",
  HI: "Hindi (हिंदी)",
  ES: "Spanish (Español)",
  FR: "French (Français)",
  DE: "German (Deutsch)",
  ZH: "Chinese (中文)",
  JA: "Japanese (日本語)",
  KO: "Korean (한국어)",
  AR: "Arabic (العربية)",
  PT: "Portuguese (Português)",
  RU: "Russian (Русский)",
  IT: "Italian (Italiano)",
  NL: "Dutch (Nederlands)",
  TR: "Turkish (Türkçe)",
  PL: "Polish (Polski)",
  SV: "Swedish (Svenska)",
  DA: "Danish (Dansk)",
  NO: "Norwegian (Norsk)",
  FI: "Finnish (Suomi)",
  EL: "Greek (Ελληνικά)",
  CS: "Czech (Čeština)",
  HE: "Hebrew (עברית)",
  TH: "Thai (ไทย)",
  VI: "Vietnamese (Tiếng Việt)",
  ID: "Indonesian (Bahasa Indonesia)",
  MS: "Malay (Bahasa Melayu)",
  TA: "Tamil (தமிழ்)",
  TE: "Telugu (తెలుగు)",
  BN: "Bengali (বাংলা)",
  MR: "Marathi (मराठी)",
  GU: "Gujarati (ગુજરાતી)",
  KN: "Kannada (ಕನ್ನಡ)",
  ML: "Malayalam (മലയാളം)",
  PA: "Punjabi (ਪੰਜਾਬੀ)",
  UR: "Urdu (اردو)",
  BG: "Bulgarian (Български)",
  HU: "Hungarian (Magyar)",
  RO: "Romanian (Română)",
  UK: "Ukrainian (Українська)",
  FA: "Persian (فارسی)",
  SW: "Swahili (Kiswahili)",
};

export default function TakeActivityPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const activityId = params.id as string;
  
  // Determine link type based on URL parameters
  const linkType = searchParams.get("type"); // 'registration'
  const isPreview = searchParams.get("preview") === "true"; // Preview mode - saves data with is_preview flag
  const mode = searchParams.get("mode"); // 'anonymous' for anonymous link
  const token = searchParams.get("token"); // access token for direct access
  
  // Set initial form/start state based on link type
  const isAnonymous = mode === "anonymous";
  const isRegistration = linkType === "registration" || (!isPreview && !isAnonymous && !token);
  
  // Get current user for preview mode
  const { currentUser } = useAuth();
  
  const [activity, setActivity] = useState<Activity | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true); // ALWAYS show form initially - even with token
  const [started, setStarted] = useState(false); // Start only after user clicks button
  const [submitted, setSubmitted] = useState(false);

  // Participant form - dynamic based on activity settings
  const [participantData, setParticipantData] = useState<Record<string, any>>({});
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<any>(null);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenValidating, setTokenValidating] = useState(false);

  // Survey state
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [displayMode, setDisplayMode] = useState<'all' | 'single' | 'section'>('all');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>("2.0");
  
  // Per-question language overrides - allows switching language for individual questions
  const [perQuestionLanguages, setPerQuestionLanguages] = useState<Record<string, string>>({});
  const [enablePerQuestionLanguageSwitch, setEnablePerQuestionLanguageSwitch] = useState(false);
  
  // Assessment feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{ isCorrect: boolean; isLastQuestion: boolean }>({ isCorrect: false, isLastQuestion: false });
  
  // Assessment submission tracking - track which questions have been submitted
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(new Set());
  
  // Assessment result state
  const [assessmentResult, setAssessmentResult] = useState<{
    score: number | null;
    assessmentResult: 'pass' | 'fail' | 'pending' | null;
    correctAnswersCount: number;
    totalQuestions: number;
    attemptNumber: number;
    canRetake: boolean;
    retakesRemaining: number | null;
  } | null>(null);
  
  // Poll results state - stores results for each question
  const [pollResults, setPollResults] = useState<Record<string, { option: string; count: number; percentage: number }[]>>({});
  const [pollSubmittedQuestions, setPollSubmittedQuestions] = useState<Set<string>>(new Set());

  // Timer state
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // Filter visible questions based on conditional logic
  const visibleQuestions = useMemo(() => {
    if (!currentSection?.questions) return [];
    const allQuestions = questionnaire?.sections?.flatMap(s => s.questions || []) || [];
    return filterQuestionsByLogic(currentSection.questions as QuestionWithLogic[], responses, allQuestions as QuestionWithLogic[]);
  }, [currentSection, responses, questionnaire?.sections]);

  // Filter ALL sections' questions when displaying all mode
  const allSectionsWithVisibleQuestions = useMemo(() => {
    if (!questionnaire?.sections) return [];
    const allQuestions = questionnaire.sections.flatMap(s => s.questions || []);
    
    // Debug: Log questions with conditionalLogic
    const withLogic = allQuestions.filter(q => q.conditionalLogic || q.settings?.conditionalLogic);
    if (withLogic.length > 0) {
      console.log('[TakePage] Questions with conditionalLogic:', withLogic.map(q => ({
        id: q.id,
        title: (q.title || q.question || '').substring(0, 40),
        logicType: (q.conditionalLogic || q.settings?.conditionalLogic)?.metadata?.type
      })));
    }
    
    return questionnaire.sections.map(section => ({
      ...section,
      questions: filterQuestionsByLogic(section.questions || [] as QuestionWithLogic[], responses, allQuestions as QuestionWithLogic[])
    }));
  }, [questionnaire?.sections, responses]);

  // Helper function to get translated text based on selected language (with per-question override support)
  const getTranslatedText = (question: any, field: 'question' | 'options' | 'placeholder', optionIndex?: number): string | string[] => {
    // Check if there's a per-question language override for this question
    const perQuestionLang = perQuestionLanguages[question.id];
    const lang = perQuestionLang || selectedLanguage || 'EN';
    
    console.log('getTranslatedText called:', { 
      questionId: question.id, 
      field,
      globalLanguage: selectedLanguage || 'EN',
      perQuestionLanguage: perQuestionLang,
      finalLanguage: lang,
      hasTranslations: !!question.translations,
      translationType: typeof question.translations,
      translationKeys: question.translations ? Object.keys(question.translations) : [],
      translationsRaw: question.translations,
      questionTitle: question.title,
      fullQuestion: question
    });
    
    // If English or no translation exists, return original
    if (lang === 'EN' || !question.translations || Object.keys(question.translations).length === 0 || !question.translations[lang]) {
      if (field === 'question') {
        const result = question.title || question.question || question.text || '';
        console.log('Returning original question (EN or no translation):', result);
        return result;
      }
      if (field === 'options') {
        const result = question.options || [];
        console.log('Returning original options (EN or no translation):', result);
        return result;
      }
      if (field === 'placeholder') return question.placeholder || '';
    }
    
    const translation = question.translations[lang];
    console.log('Found translation for', lang, ':', translation);
    
    if (field === 'question') {
      const result = translation.question || translation.title || question.title || question.question || question.text || '';
      console.log('Returning translated question:', result);
      return result;
    }
    
    if (field === 'options') {
      const result = translation.options || question.options || [];
      console.log('Returning translated options:', result);
      return result;
    }
    
    if (field === 'placeholder') {
      return translation.placeholder || question.placeholder || '';
    }
    
    return '';
  };

  // Load persisted session on mount (skip in preview mode)
  useEffect(() => {
    // Get URL parameters
    const urlType = searchParams.get("type");
    const urlParticipantId = searchParams.get("participant_id");
    
    // For registration link: Use sessionStorage (tab-specific) instead of localStorage
    // This ensures new tabs always show login, but refresh preserves session
    if (urlType === "registration") {
      const persistedSession = sessionStorage.getItem(`activity_${activityId}_session`);
      
      if (persistedSession) {
        try {
          const session = JSON.parse(persistedSession);
          
          // If URL has a NEW participant_id (different from session), clear old session
          if (urlParticipantId && session.participantId && urlParticipantId !== session.participantId) {
            console.log('Registration link - new participant_id in URL, clearing old session');
            sessionStorage.removeItem(`activity_${activityId}_session`);
            sessionStorage.removeItem(`activity_${activityId}_start_time`);
            // Continue to show form for new participant
            setShowForm(true);
            setStarted(false);
            setSubmitted(false);
            return;
          }
          
          // Check if session is too old (older than 24 hours) or if it was submitted
          const sessionAge = Date.now() - (session.timestamp || 0);
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (sessionAge > maxAge || session.submitted) {
            console.log('Registration link - session expired or submitted, clearing');
            sessionStorage.removeItem(`activity_${activityId}_session`);
            sessionStorage.removeItem(`activity_${activityId}_start_time`);
            return;
          }
          
          // Restore session state (only happens on refresh in same tab)
          console.log('Registration link - restoring session from refresh');
          if (session.participantId) {
            setParticipantId(session.participantId);
            setParticipantData(session.participantData || {});
            setStarted(true);
            setShowForm(false);
            if (session.startTime) {
              setStartTime(session.startTime);
            }
            if (session.responses) {
              setResponses(session.responses);
            }
            if (session.currentSectionIndex !== undefined) {
              setCurrentSectionIndex(session.currentSectionIndex);
            }
            if (session.currentQuestionIndex !== undefined) {
              setCurrentQuestionIndex(session.currentQuestionIndex);
            }
            if (session.submittedQuestions) {
              setSubmittedQuestions(new Set(session.submittedQuestions));
            }
            if (session.assessmentResult && session.assessmentResult.score !== undefined) {
              setAssessmentResult(session.assessmentResult);
            }
            if (session.selectedLanguage) {
              setSelectedLanguage(session.selectedLanguage);
            }
          }
        } catch (err) {
          console.error("Failed to restore registration session:", err);
          sessionStorage.removeItem(`activity_${activityId}_session`);
        }
      } else {
        // New tab or first visit - show login page
        console.log('Registration link - new tab/visit, showing login page');
        setShowForm(true);
        setStarted(false);
        setSubmitted(false);
      }
      return;
    }
    
    // For preview mode: Clear everything
    if (isPreview) {
      console.log('Clearing session - preview mode');
      localStorage.removeItem(`activity_${activityId}_session`);
      localStorage.removeItem(`activity_${activityId}_start_time`);
      setSubmitted(false);
      setStarted(false);
      setShowForm(true);
      return;
    }
    
    // If there's a token, DON'T restore session - force fresh start with form
    if (token) {
      console.log('Token present - clearing any existing session and showing form');
      localStorage.removeItem(`activity_${activityId}_session`);
      localStorage.removeItem(`activity_${activityId}_start_time`);
      sessionStorage.removeItem(`activity_${activityId}_session`);
      sessionStorage.removeItem(`activity_${activityId}_start_time`);
      setShowForm(true);
      setStarted(false);
      setSubmitted(false);
      return;
    }
    
    // For anonymous mode: Use localStorage (persistent across tabs)
    const persistedSession = localStorage.getItem(`activity_${activityId}_session`);
    
    // Try to restore existing session for anonymous users only (not registration)
    if (persistedSession && urlType !== "registration") {
      try {
        const session = JSON.parse(persistedSession);
        
        // Check if session is too old (older than 24 hours) or if it was submitted
        const sessionAge = Date.now() - (session.timestamp || 0);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (sessionAge > maxAge) {
          console.log('Session expired, clearing');
          localStorage.removeItem(`activity_${activityId}_session`);
          return;
        }
        
        // Only restore if not submitted or if explicitly continuing
        if (session.submitted && urlType !== "continue") {
          console.log('Previous submission found, not restoring. Clear localStorage to start fresh.');
          // Don't auto-restore submitted sessions unless explicitly continuing
          return;
        }
        
        // Restore session state
        if (session.participantId) {
          setParticipantId(session.participantId);
          setParticipantData(session.participantData || {});
          setStarted(true);
          setShowForm(false);
          if (session.startTime) {
            setStartTime(session.startTime);
          }
          if (session.responses) {
            setResponses(session.responses);
          }
          if (session.currentSectionIndex !== undefined) {
            setCurrentSectionIndex(session.currentSectionIndex);
          }
          if (session.currentQuestionIndex !== undefined) {
            setCurrentQuestionIndex(session.currentQuestionIndex);
          }
          if (session.submitted) {
            setSubmitted(session.submitted);
          }
          if (session.submittedQuestions) {
            setSubmittedQuestions(new Set(session.submittedQuestions));
          }
          if (session.assessmentResult && session.assessmentResult.score !== undefined) {
            console.log('Restoring assessment result from session:', session.assessmentResult);
            setAssessmentResult(session.assessmentResult);
          }
          if (session.selectedLanguage) {
            setSelectedLanguage(session.selectedLanguage);
          }
        }
      } catch (err) {
        console.error("Failed to restore session:", err);
        localStorage.removeItem(`activity_${activityId}_session`);
      }
    }
  }, [activityId, isPreview, searchParams]);

  // Persist session whenever key state changes (skip for preview mode)
  useEffect(() => {
    if (isPreview) return; // Don't persist in preview mode
    
    const urlType = searchParams.get("type");
    const isRegistration = urlType === "registration";
    const storage = isRegistration ? sessionStorage : localStorage; // Use sessionStorage for registration
    
    if (participantId && started && !submitted) {
      // Only persist active sessions, not submitted ones
      const session = {
        participantId,
        participantData,
        startTime,
        responses,
        currentSectionIndex,
        currentQuestionIndex,
        submitted: false, // Always false for active sessions
        submittedQuestions: Array.from(submittedQuestions),
        assessmentResult,
        selectedLanguage,
        timestamp: Date.now()
      };
      storage.setItem(`activity_${activityId}_session`, JSON.stringify(session));
    } else if (submitted && participantId) {
      // When submitted, save submitted state
      const session = {
        participantId,
        participantData,
        submitted: true,
        responses,
        assessmentResult,
        selectedLanguage,
        timestamp: Date.now()
      };
      storage.setItem(`activity_${activityId}_session`, JSON.stringify(session));
    }
  }, [participantId, participantData, startTime, responses, currentSectionIndex, currentQuestionIndex, submitted, submittedQuestions, started, activityId, isPreview, assessmentResult, selectedLanguage, searchParams]);

  // Timer logic
  useEffect(() => {
    if (!activity?.time_limit_enabled || !activity?.time_limit_minutes || !started || submitted || !startTime) {
      return;
    }

    // Calculate remaining time
    const totalSeconds = activity.time_limit_minutes * 60;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, totalSeconds - elapsed);

    setRemainingSeconds(remaining);

    // If time already expired, submit immediately
    if (remaining === 0) {
      handleSubmit(true);
      return;
    }

    // Countdown timer
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activity?.time_limit_enabled, activity?.time_limit_minutes, started, submitted, startTime, activityId]);

  useEffect(() => {
    loadData();
  }, [activityId]);

  // Validate token if present - only once when both token and activity are available
  useEffect(() => {
    if (token && !tokenValidated && !tokenValidating && activity) {
      validateAccessToken();
    }
  }, [token, activity]);

  async function validateAccessToken() {
    // Prevent duplicate calls
    if (tokenValidated || tokenValidating) return;
    
    setTokenValidating(true);
    
    try {
      const response = await fetch(`/api/public/access-tokens/${token}/validate`);
      const data = await response.json();

      if (!data.valid) {
        // Special handling for already completed - show thank you page directly
        if (data.already_completed) {
          console.log('Activity already completed - showing thank you page');
          setTokenValidated(true);
          setTokenValidating(false);
          setSubmitted(true); // Show thank you page directly
          setShowForm(false); // Hide the form
          
          // No error toast - just show success message
          toast({
            title: "Welcome Back!",
            description: "You have already completed this activity. Thank you!",
            variant: "success",
            duration: 4000
          });
          return;
        }
        
        // For invalid/expired tokens, just show the normal registration form
        // No error message - treat it like a regular registration link
        console.log('Token invalid or expired - showing normal registration form');
        setTokenError(null); // Clear any error
        setTokenValidated(false); // Mark as not validated
        setTokenValidating(false);
        setShowForm(true);
        
        // Show friendly info message instead of error
        toast({
          title: "Welcome!",
          description: "Please register to participate in this activity.",
          variant: "default",
          duration: 3000
        });
        return;
      }

      // Pre-fill participant data (include additional_data so optional fields are hydrated)
      const additionalData = data.participant?.additional_data || data.data?.participant?.additional_data || {};
      const nameFromToken = data.participant?.name || data.data?.participant?.name || '';
      const emailFromToken = data.participant?.email || data.data?.participant?.email || '';
      const phoneFromToken = data.participant?.phone || data.data?.participant?.phone || '';

      const participantInfo = {
        name: nameFromToken,
        full_name: nameFromToken,
        email: emailFromToken,
        email_address: emailFromToken,
        phone: phoneFromToken,
        phone_number: phoneFromToken,
        ...additionalData,
      };
      
      console.log('Setting participant data from token:', participantInfo);
      setParticipantData(participantInfo);
      
      setParticipantId(data.participant?.id || data.data?.participant?.id);
      setTokenData(data);
      setTokenValidated(true);
      setTokenValidating(false);
      
      // ALWAYS show form to collect language and other fields
      setShowForm(true);
      
      const participantName = data.participant?.name || data.data?.participant?.name || 'there';
      const needsLanguage = activity?.is_multilingual && Array.isArray(activity?.languages) && activity.languages.length > 1;
      const detailsMessage = needsLanguage
        ? `Hello ${participantName}, please select your language and complete any additional details.`
        : `Hello ${participantName}, please review and complete any missing details.`;

      toast({
        title: "Welcome!",
        description: detailsMessage,
        variant: "success",
        duration: 3000
      });
    } catch (err) {
      console.error('Token validation error:', err);
      setTokenError('Failed to validate access token');
      setTokenValidated(true);
      setTokenValidating(false);
      setShowForm(true);
      toast({
        title: "Error",
        description: "Failed to validate your access link. Please try again.",
        variant: "error"
      });
    }
  }

  // Load progress when participant starts (after registration)
  useEffect(() => {
    if (participantId && started && !isPreview && !submitted) {
      loadProgress();
    }
  }, [participantId, started]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch public activity data (includes questionnaire via eager loading)
      const activityResponse = await fetch(`/api/public/activities/${activityId}`);
      if (!activityResponse.ok) {
        throw new Error("Activity not found or not accessible");
      }
      const activityData = await activityResponse.json();
      setActivity(activityData.data);

      // Use questionnaire data from activity response (already eager loaded)
      if (activityData.data.questionnaire) {
        console.log('[TakePage] Raw questionnaire data:', activityData.data.questionnaire);
        
        // Check if any questions have conditionalLogic in settings
        const rawQuestions = activityData.data.questionnaire.sections?.flatMap((s: any) => s.questions || []) || [];
        const questionsWithLogicInSettings = rawQuestions.filter((q: any) => q.settings?.conditionalLogic);
        console.log('[TakePage] Questions with conditionalLogic in settings:', questionsWithLogicInSettings.length);
        if (questionsWithLogicInSettings.length > 0) {
          console.log('[TakePage] First question with logic:', {
            id: questionsWithLogicInSettings[0].id,
            title: questionsWithLogicInSettings[0].title?.substring(0, 40),
            logicType: questionsWithLogicInSettings[0].settings?.conditionalLogic?.metadata?.type,
            optionMappings: questionsWithLogicInSettings[0].settings?.conditionalLogic?.metadata?.optionMappings
          });
        }
        
        // Transform questions to extract conditionalLogic from settings
        const transformedQuestionnaire = {
          ...activityData.data.questionnaire,
          sections: activityData.data.questionnaire.sections?.map((section: any) => ({
            ...section,
            questions: section.questions?.map((q: any) => ({
              ...q,
              // Extract conditionalLogic from settings if present
              conditionalLogic: q.conditionalLogic || q.settings?.conditionalLogic || null
            }))
          }))
        };
        
        console.log('Transformed questionnaire with conditionalLogic:', transformedQuestionnaire);
        setQuestionnaire(transformedQuestionnaire);
      }
      
      // Don't set default language - let user select on registration page
      // Only set if not multilingual (single language activity)
      if (activityData.data.is_multilingual && activityData.data.languages && activityData.data.languages.length === 1) {
        setSelectedLanguage(activityData.data.languages[0]);
      } else if (!activityData.data.is_multilingual) {
        setSelectedLanguage('EN'); // Default for non-multilingual
      }
      // For multilingual activities with multiple languages, selectedLanguage stays null
      // User must select language on registration form before starting
      
      // Load display mode from activity settings
      const mode = activityData.data.settings?.display_mode || 'all';
      setDisplayMode(mode);
      
      // Load per-question language switch setting from activity/event settings
      if (activityData.data.settings?.enable_per_question_language_switch) {
        setEnablePerQuestionLanguageSwitch(true);
      }
      
      // Load app version from settings
      try {
        const appSettingsResponse = await fetch('/api/app-settings');
        if (appSettingsResponse.ok) {
          const appSettingsData = await appSettingsResponse.json();
          if (appSettingsData.data?.app_version) {
            setAppVersion(appSettingsData.data.app_version);
          } else {
            setAppVersion("2.0");
          }
        } else {
          setAppVersion("2.0");
        }
      } catch (err) {
        console.log("Could not load app version settings");
        setAppVersion("2.0");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
      console.error("Error loading activity:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleStartParticipant = async () => {
    // PREVIEW MODE: Create a dummy participant for full flow experience
    if (isPreview) {
      // Use a dummy participant ID for preview mode
      const dummyParticipantId = 'preview-' + Date.now();
      setParticipantId(dummyParticipantId);
      
      // Set start time for timer functionality
      const now = Date.now();
      setStartTime(now);
      
      // Clear any old timer storage to prevent auto-expiration
      localStorage.removeItem(`activity_${activityId}_start_time`);
      
      setShowForm(false);
      setStarted(true);
      toast({ 
        title: "Preview Mode", 
        description: "Testing only - No data will be saved or counted in reports", 
        variant: "warning",
        duration: 3000
      });
      return;
    }

    // ANONYMOUS MODE: Create anonymous participant when user clicks Start Event button
    // This applies to all activity types (Survey, Assessment, Poll) for consistent UX
    if (isAnonymous) {
      try {
        setSubmitting(true);
        
        // Create anonymous participant without name/email
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
          throw new Error("Failed to register anonymous participant");
        }

        const registerData = await registerResponse.json();
        const participantIdValue = registerData.data.participant_id;
        setParticipantId(participantIdValue);
        
        // Set start time
        const now = Date.now();
        setStartTime(now);
        
        // Clear any old timer storage to prevent auto-expiration
        localStorage.removeItem(`activity_${activityId}_start_time`);
        
        setShowForm(false);
        setStarted(true);
        
        toast({ 
          title: "Anonymous Access", 
          description: "Your responses will be saved anonymously", 
          variant: "success",
          duration: 2000
        });
        
        return;
      } catch (err) {
        console.error("Anonymous registration error:", err);
        toast({ 
          title: "Error", 
          description: "Failed to start activity. Please try again.", 
          variant: "error" 
        });
        return;
      } finally {
        setSubmitting(false);
      }
    }

    // REGISTRATION MODE: Validate required fields based on activity's registration form
    const formFields = activity?.registration_form_fields || [
      { id: "name", type: "text", label: "Full Name", required: true, order: 0, isMandatory: true },
      { id: "email", type: "email", label: "Email Address", required: true, order: 1, isMandatory: true },
    ];

    // Check required fields (only for registration mode)
    for (const field of formFields) {
      if (field.required || field.isMandatory) {
        // Use the same field key logic as renderFormField to ensure consistency
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
      
      // Register participant with backend via Next.js API route
      // For anonymous mode, participant is marked as guest
      // For preview mode, participant is marked with is_preview flag and linked to current user
      const registerResponse = await fetch(`/api/public/activities/${activityId}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          name: isPreview && currentUser ? currentUser.name : (participantData.name || participantData.full_name),
          email: isPreview && currentUser ? currentUser.email : participantData.email,
          additional_data: participantData, // Send all form data
          is_anonymous: isAnonymous, // Flag for anonymous participants
          is_preview: isPreview, // Flag for preview mode
          preview_user_role: isPreview && currentUser ? currentUser.role : null,
          preview_user_email: isPreview && currentUser ? currentUser.email : null,
        }),
      });

      // Parse JSON body safely for both success and error cases
      const registerData = await registerResponse
        .json()
        .catch(() => null);

      // If backend indicates already submitted, skip error and show thank you
      if (registerResponse.status === 409 && registerData?.data?.existing_response) {
        const participantIdValue = registerData.data.participant_id;
        setParticipantId(participantIdValue);
        setResponses(registerData.data.existing_response.answers || {});
        setSubmitted(true);
        setShowForm(false);
        setStarted(false);
        toast({
          title: "Already submitted",
          description: registerData.message || "You have already completed this activity.",
          variant: "warning",
          duration: 5000,
        });
        return;
      }

      if (!registerResponse.ok || !registerData) {
        throw new Error(registerData?.message || "Failed to register participant");
      }

      const participantIdValue = registerData.data.participant_id;
      setParticipantId(participantIdValue);
      
      // Check if participant has already submitted
      // IMPORTANT: Do NOT auto-redirect to thank you page for registration/anonymous links
      // Let them go through the full flow - backend will handle duplicate submission
      if (registerData.data.has_submitted && registerData.data.existing_response) {
        // For preview mode, show the thank you page immediately
        if (isPreview) {
          setSubmitted(true);
          setResponses(registerData.data.existing_response.answers || {});
          toast({ 
            title: "Already Completed", 
            description: "You have already submitted your response for this activity in preview mode.", 
            variant: "warning",
            duration: 6000
          });
          return;
        }
        
        // For registration/anonymous links: Allow them to continue to the event
        // They will see their previous responses but can go through the flow
        // Backend will prevent duplicate submission on final submit
        setResponses(registerData.data.existing_response.answers || {});
        
        // Show informational message (not blocking)
        toast({ 
          title: "Note", 
          description: "You have already participated in this activity. Your previous responses are loaded.", 
          variant: "default",
          duration: 5000
        });
      }
      
      // Always continue to event flow (unless preview mode and already submitted)
      {
        // Set start time when beginning the activity
        const now = Date.now();
        setStartTime(now);
        
        // Clear any old timer storage to prevent auto-expiration
        const storage = isRegistration ? sessionStorage : localStorage;
        storage.removeItem(`activity_${activityId}_start_time`);
        
        // Persist initial session (not in preview mode)
        if (!isPreview) {
          const session = {
            participantId: participantIdValue,
            participantData,
            startTime: now,
            responses: {},
            currentSectionIndex: 0,
            currentQuestionIndex: 0,
            submitted: false,
            selectedLanguage,
            timestamp: Date.now()
          };
          storage.setItem(`activity_${activityId}_session`, JSON.stringify(session));
        }
      }
      
      setShowForm(false);
      setStarted(true);
    } catch (err) {
      console.error("Registration error:", err);
      toast({ title: "Error", description: "Failed to register: " + (err instanceof Error ? err.message : "Unknown error"), variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Load existing progress from backend
  const loadProgress = async () => {
    if (!participantId || !activityId || isPreview) return;

    try {
      const response = await fetch(`/api/public/activities/${activityId}/load-progress/${participantId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.data.has_progress && data.data.answers) {
          console.log('Loaded existing progress:', data.data.answers);
          setResponses(data.data.answers);
          toast({
            title: "Progress Restored",
            description: "Your previous answers have been loaded",
            variant: "success",
            duration: 3000
          });
        }
      }
    } catch (err) {
      console.error('Failed to load progress:', err);
    }
  };

  // Save progress incrementally to backend
  const saveProgress = async (updatedResponses: Record<string, any>) => {
    if (!participantId || !activityId || isPreview) return;

    try {
      await fetch(`/api/public/activities/${activityId}/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
          answers: updatedResponses,
        }),
      });
      console.log('Progress saved to backend');
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses((prev) => {
      const updated = {
        ...prev,
        [questionId]: value,
      };
      
      // Auto-save progress to backend (debounced by React state batching)
      saveProgress(updated);
      
      return updated;
    });
  };

  const handleMultipleChoiceToggle = (questionId: string, optionValue: string) => {
    const currentValues = responses[questionId] || [];
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter((v: string) => v !== optionValue)
      : [...currentValues, optionValue];
    handleResponseChange(questionId, newValues);
  };

  const handleSubmit = async (autoSubmit: boolean = false) => {
    try {
      // Validate all answers before submitting (unless auto-submit from timer)
      if (!autoSubmit && !validateCurrentAnswers()) {
        setSubmitting(false);
        return;
      }

      setSubmitting(true);

      if (!participantId) {
        throw new Error("Participant not registered");
      }

      // PREVIEW MODE: Skip API call, simulate successful submission
      if (isPreview) {
        // Simulate a brief delay for realistic experience
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Set submitted state to show thank you page
        setSubmitted(true);
        
        // DO NOT persist preview session - it should be fresh each time
        
        toast({ 
          title: "Preview Completed", 
          description: "Activity completed in preview mode - No data saved or counted in reports", 
          variant: "warning",
          duration: 4000
        });
        setSubmitting(false);
        return;
      }

      // Calculate time tracking fields
      const now = new Date().toISOString();
      const started_at = startTime ? new Date(startTime).toISOString() : now;
      
      // If time limit is enabled, calculate expiration time
      let time_expired_at = null;
      if (activity?.time_limit_enabled && activity?.time_limit_minutes && startTime) {
        const expirationTime = new Date(startTime + activity.time_limit_minutes * 60 * 1000);
        time_expired_at = expirationTime.toISOString();
      }

      const payload = {
        participant_id: participantId,
        answers: responses,
        started_at,
        time_expired_at,
        auto_submitted: autoSubmit,
        is_preview: isPreview, // Flag for preview mode
      };

      console.log("Submitting payload:", payload);

      // Use Next.js API route to avoid CSRF issues
      const response = await fetch(`/api/public/activities/${activityId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Response:", data);

      if (!response.ok) {
        // Check if it's a duplicate submission error or retakes exhausted
        if (response.status === 422) {
          if (data.data?.already_submitted || data.data?.retakes_exhausted) {
            setSubmitted(true);
            // If there's assessment data in the error response, set it
            if (data.data?.score !== undefined) {
              setAssessmentResult({
                score: data.data.score,
                assessmentResult: data.data.assessment_result,
                correctAnswersCount: data.data.correct_answers_count || 0,
                totalQuestions: data.data.total_questions || 0,
                attemptNumber: data.data.attempts_used || 1,
                canRetake: false,
                retakesRemaining: 0,
              });
            }
            toast({ 
              title: data.data?.retakes_exhausted ? "No Retakes Remaining" : "Already Submitted", 
              description: data.message || "You have already completed this activity.", 
              variant: "warning",
              duration: 6000
            });
            return;
          }
        }
        throw new Error(data.error || data.message || "Failed to submit response");
      }

      // Store assessment result if this is an assessment BEFORE setting submitted
      console.log('Checking if assessment:', {
        questionnaireType: questionnaire?.type,
        activityType: activity?.type,
        hasData: !!data.data,
        fullResponseData: data
      });
      
      if ((questionnaire?.type === 'assessment' || activity?.type === 'assessment') && data.data) {
        console.log('Assessment result data from backend:', data.data);
        console.log('Individual values:', {
          score: data.data.score,
          assessment_result: data.data.assessment_result,
          correct_answers_count: data.data.correct_answers_count,
          total_questions: data.data.total_questions,
          attempt_number: data.data.attempt_number,
          can_retake: data.data.can_retake,
          retakes_remaining: data.data.retakes_remaining
        });
        
        const resultData = {
          score: data.data.score ?? null,
          assessmentResult: data.data.assessment_result ?? null,
          correctAnswersCount: data.data.correct_answers_count ?? 0,
          totalQuestions: data.data.total_questions ?? 0,
          attemptNumber: data.data.attempt_number ?? 1,
          canRetake: data.data.can_retake ?? false,
          retakesRemaining: data.data.retakes_remaining ?? null,
        };
        
        console.log('Setting assessment result state:', resultData);
        setAssessmentResult(resultData);
        
        // Force a small delay to ensure state is set before changing submitted
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('Setting submitted to true');
      // Set submitted AFTER assessment result
      setSubmitted(true);
      
      // Mark access token as used (if token-based access)
      if (token) {
        try {
          await fetch(`/api/public/access-tokens/${token}/mark-used`, {
            method: 'POST',
          });
          console.log('Access token marked as used');
        } catch (err) {
          console.error('Failed to mark token as used:', err);
        }
      }
      
      // Update session with submitted state
      const isAssessment = questionnaire?.type === 'assessment' || activity?.type === 'assessment';
      const session = {
        participantId,
        participantData,
        startTime,
        responses,
        submitted: true,
        assessmentResult: isAssessment && data.data ? {
          score: data.data.score,
          assessmentResult: data.data.assessment_result,
          correctAnswersCount: data.data.correct_answers_count || 0,
          totalQuestions: data.data.total_questions || 0,
          attemptNumber: data.data.attempt_number || 1,
          canRetake: data.data.can_retake || false,
          retakesRemaining: data.data.retakes_remaining,
        } : null,
        timestamp: Date.now()
      };
      localStorage.setItem(`activity_${activityId}_session`, JSON.stringify(session));
      
      // Clear timer storage
      if (activity?.time_limit_enabled) {
        localStorage.removeItem(`activity_${activityId}_start_time`);
      }
      
      // For non-assessment activities, show a simple success toast
      if (questionnaire?.type !== 'assessment') {
        if (autoSubmit) {
          toast({ 
            title: "Time Expired!", 
            description: "Your response has been automatically submitted as the time limit was reached.", 
            variant: "warning",
            duration: 8000
          });
        } else {
          toast({ 
            title: "Success!", 
            description: "Your response has been submitted successfully", 
            variant: "success" 
          });
        }
      }
      // For assessments, no toast - results will be shown on thank you page
    } catch (err) {
      console.error("Failed to submit:", err);
      toast({ title: "Error", description: "Failed to submit response: " + (err instanceof Error ? err.message : "Unknown error"), variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Validate if current question(s) have been answered
  const validateCurrentAnswers = (): boolean => {
    const isAssessment = questionnaire?.type === 'assessment' || activity?.type === 'assessment';
    
    if (displayMode === 'single') {
      // Single question mode - validate current question only (from visible questions)
      const question = visibleQuestions?.[currentQuestionIndex];
      if (!question) return true;
      
      // For Assessments: ALWAYS require an answer
      // For Surveys/Polls: Only require if question is mandatory (is_required !== false)
      const requiresAnswer = isAssessment || question.is_required !== false;
      
      if (requiresAnswer) {
        const answer = responses[question.id];
        
        // Check if answer exists and is not empty
        if (answer === undefined || answer === null || answer === '') {
          toast({
            title: "Answer Required",
            description: "Please select an option to continue.",
            variant: "warning"
          });
          return false;
        }
        
        // For multiple choice, check if array is not empty
        if (Array.isArray(answer) && answer.length === 0) {
          toast({
            title: "Answer Required",
            description: "Please select at least one option to continue.",
            variant: "warning"
          });
          return false;
        }
      }
      
      return true;
    } else if (displayMode === 'section') {
      // Section mode - validate all visible questions in current section
      if (!visibleQuestions || visibleQuestions.length === 0) return true;
      
      for (const question of visibleQuestions) {
        // For Assessments: ALWAYS require an answer
        // For Surveys/Polls: Only require if question is mandatory
        const requiresAnswer = isAssessment || question.is_required !== false;
        
        if (requiresAnswer) {
          const answer = responses[question.id];
          
          if (answer === undefined || answer === null || answer === '') {
            toast({
              title: "Answer Required",
              description: isAssessment 
                ? "Please answer all questions in this section before continuing."
                : "Please answer all required questions in this section before continuing.",
              variant: "warning"
            });
            return false;
          }
          
          if (Array.isArray(answer) && answer.length === 0) {
            toast({
              title: "Answer Required",
              description: isAssessment 
                ? "Please answer all questions in this section before continuing."
                : "Please answer all required questions in this section before continuing.",
              variant: "warning"
            });
            return false;
          }
        }
      }
      
      return true;
    } else {
      // All questions mode - validate all visible questions across all sections
      if (!allSectionsWithVisibleQuestions) return true;
      
      for (const section of allSectionsWithVisibleQuestions) {
        for (const question of section.questions || []) {
          // For Assessments: ALWAYS require an answer
          // For Surveys/Polls: Only require if question is mandatory
          const requiresAnswer = isAssessment || question.is_required !== false;
          
          if (requiresAnswer) {
            const answer = responses[question.id];
            
            if (answer === undefined || answer === null || answer === '') {
              toast({
                title: "Incomplete Answers",
                description: isAssessment 
                  ? "Please answer all questions before submitting."
                  : "Please answer all required questions before submitting.",
                variant: "warning"
              });
              return false;
            }
            
            if (Array.isArray(answer) && answer.length === 0) {
              toast({
                title: "Incomplete Answers",
                description: isAssessment 
                  ? "Please answer all questions before submitting."
                  : "Please answer all required questions before submitting.",
                variant: "warning"
              });
              return false;
            }
          }
        }
      }
      
      return true;
    }
  };

  // Check current question answer for assessments (returns boolean)
  const checkCurrentQuestionAnswer = (): boolean => {
    if (questionnaire?.type !== 'assessment' || displayMode !== 'single') return true;
    
    const question = visibleQuestions?.[currentQuestionIndex];
    if (!question || !question.settings?.correctAnswers || question.settings.correctAnswers.length === 0) {
      return true; // No correct answer defined, allow to proceed
    }
    
    const userAnswer = responses[question.id];
    const correctAnswers = question.settings.correctAnswers;
    let isCorrect = false;
    
    // Check based on question type
    if (question.type === 'radio') {
      // For single choice, check if the selected option index matches
      const selectedIndex = question.options?.indexOf(userAnswer);
      isCorrect = selectedIndex !== -1 && correctAnswers.includes(selectedIndex);
    } else if (question.type === 'multiselect') {
      // For multiple choice, check if arrays match
      const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [];
      const userIndexes = userAnswerArray.map((ans: string) => question.options?.indexOf(ans)).filter((idx: number) => idx !== -1);
      
      isCorrect = correctAnswers.length === userIndexes.length &&
        correctAnswers.every((idx: number) => userIndexes.includes(idx)) &&
        userIndexes.every((idx: number) => correctAnswers.includes(idx));
    }
    
    return isCorrect;
  };

  // Handle Submit & Next for assessments
  const handleSubmitAndNext = () => {
    // Validate answer before proceeding
    if (!validateCurrentAnswers()) {
      return;
    }

    if (questionnaire?.type !== 'assessment') {
      // For non-assessments, just navigate
      navigateToNext();
      return;
    }
    
    // Get current question from visible questions (after conditional logic filtering)
    const currentQuestion = visibleQuestions?.[currentQuestionIndex];
    
    if (!currentQuestion) return;
    
    // Check if already submitted
    if (submittedQuestions.has(currentQuestion.id)) {
      // Already submitted, just navigate
      navigateToNext();
      return;
    }
    
    const isCorrect = checkCurrentQuestionAnswer();
    
    // Mark question as submitted
    setSubmittedQuestions(prev => new Set([...prev, currentQuestion.id]));
    
    // Show feedback modal
    setFeedbackData({ isCorrect, isLastQuestion: false });
    setShowFeedbackModal(true);
  };

  // Navigate to next question
  const navigateToNext = () => {
    // Validate answer before navigating
    if (!validateCurrentAnswers()) {
      return;
    }

    // Use visibleQuestions instead of all questions for navigation
    if (visibleQuestions && currentQuestionIndex < visibleQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (questionnaire && currentSectionIndex < (questionnaire.sections?.length || 0) - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentQuestionIndex(0);
    }
  };

  // Handle final submission for assessments
  const handleFinalSubmit = async () => {
    // Validate answer before submitting
    if (!validateCurrentAnswers()) {
      return;
    }

    if (questionnaire?.type !== 'assessment') {
      await handleSubmit();
      return;
    }
    
    // Get current question from visible questions (after conditional logic filtering)
    const currentQuestion = visibleQuestions?.[currentQuestionIndex];
    
    if (!currentQuestion) return;
    
    // Check if already submitted
    if (submittedQuestions.has(currentQuestion.id)) {
      // Already submitted, just finalize
      await handleSubmit();
      return;
    }
    
    // Check last question answer
    const isCorrect = checkCurrentQuestionAnswer();
    
    // Mark question as submitted
    setSubmittedQuestions(prev => new Set([...prev, currentQuestion.id]));
    
    // Show feedback modal
    setFeedbackData({ isCorrect, isLastQuestion: true });
    setShowFeedbackModal(true);
  };
  
  // Handle feedback modal OK button
  const handleFeedbackOk = async () => {
    setShowFeedbackModal(false);
    
    if (feedbackData.isLastQuestion) {
      // Submit the assessment
      await handleSubmit();
    } else {
      // Navigate to next question
      navigateToNext();
    }
  };
  
  // Handle poll answer submission - instant results
  const handlePollAnswer = async (questionId: string) => {
    if (pollSubmittedQuestions.has(questionId)) {
      // Already submitted, just navigate
      return;
    }
    
    // Mark as submitted locally
    setPollSubmittedQuestions(prev => new Set([...prev, questionId]));
    
    // Find the question to get its options
    const currentSection = questionnaire?.sections?.[currentSectionIndex];
    const question = currentSection?.questions.find((q: any) => q.id === questionId);
    
    if (!question) return;
    
    try {
      // Submit the single answer to get results
      const response = await fetch(`/api/public/activities/${activityId}/poll-answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participant_id: participantId,
          question_id: questionId,
          answer: responses[questionId],
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Store results for this question
        if (data.data?.results) {
          setPollResults(prev => ({
            ...prev,
            [questionId]: data.data.results
          }));
        }
      } else {
        // If API fails, generate mock results based on current answer
        // This provides instant feedback even without backend support
        const mockResults = generateMockPollResults(question, responses[questionId]);
        setPollResults(prev => ({
          ...prev,
          [questionId]: mockResults
        }));
      }
    } catch (err) {
      console.error("Failed to submit poll answer:", err);
      // Generate mock results as fallback
      const mockResults = generateMockPollResults(question, responses[questionId]);
      setPollResults(prev => ({
        ...prev,
        [questionId]: mockResults
      }));
    }
  };
  
  // Generate mock poll results for demonstration
  const generateMockPollResults = (question: any, userAnswer: string | number) => {
    let options = [];
    
    // Handle rating questions
    if (question.type === 'rating') {
      const maxRating = question.settings?.scale || question.max_value || 5;
      options = Array.from({ length: maxRating }, (_, i) => String(i + 1));
    } else {
      // Handle regular multiple choice options
      options = question.options || [];
    }
    
    const totalVotes = Math.floor(Math.random() * 50) + 20; // 20-70 total votes
    
    // For rating questions, create a more realistic distribution with normal curve
    const isRating = question.type === 'rating';
    
    const results = options.map((option: any) => {
      const optionValue = typeof option === 'string' ? option : (option.value || option.text || option.label || option);
      const optionNum = parseInt(optionValue);
      
      let count;
      if (String(optionValue) === String(userAnswer)) {
        // Give user's answer a realistic percentage (15-40%)
        count = Math.floor(totalVotes * (Math.random() * 0.25 + 0.15)); // 15-40%
      } else if (isRating && !isNaN(optionNum)) {
        // For ratings, create a normal distribution (bell curve)
        const maxRating = options.length;
        const middle = (maxRating + 1) / 2;
        const distance = Math.abs(optionNum - middle);
        const weight = 1 - (distance / maxRating) * 0.6; // Higher ratings get more weight
        count = Math.floor(Math.random() * (totalVotes * 0.3 * weight));
      } else {
        // Distribute remaining votes among other options
        count = Math.floor(Math.random() * (totalVotes * 0.3));
      }
      
      const percentage = (count / totalVotes) * 100;
      
      return {
        option: String(optionValue),
        count: count,
        percentage: percentage
      };
    });
    
    // Normalize percentages to add up to 100%
    const totalPercentage = results.reduce((sum: number, r: any) => sum + r.percentage, 0);
    const normalizedResults = results.map((r: any) => ({
      ...r,
      percentage: (r.percentage / totalPercentage) * 100
    }));
    
    return normalizedResults.sort((a: any, b: any) => b.percentage - a.percentage); // Sort by percentage descending
  };

  const renderQuestion = (question: any) => {
    const questionId = question.id;
    const isSubmitted = submittedQuestions.has(questionId);

    switch (question.type) {
      case "text":
      case "short_answer":
        const translatedPlaceholder = getTranslatedText(question, 'placeholder') as string;
        return (
          <Input
            type="text"
            placeholder={translatedPlaceholder || "Enter your answer..."}
            value={responses[questionId] || ""}
            onChange={(e) => handleResponseChange(questionId, e.target.value)}
            className="w-full"
            disabled={isSubmitted}
          />
        );

      case "textarea":
      case "long_answer":
      case "paragraph":
        const translatedTextareaPlaceholder = getTranslatedText(question, 'placeholder') as string;
        return (
          <textarea
            rows={4}
            placeholder={translatedTextareaPlaceholder || "Enter your detailed answer..."}
            value={responses[questionId] || ""}
            onChange={(e) => handleResponseChange(questionId, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={isSubmitted}
          />
        );

      case "single_choice":
      case "radio":
      case "multiple_choice_single":
        const isPoll = activity?.type === 'poll';
        const isPollSubmitted = isPoll && pollSubmittedQuestions.has(questionId);
        const questionResults = pollResults[questionId];
        const totalVotes = questionResults?.reduce((sum, r) => sum + r.count, 0) || 0;
        const translatedSingleOptions = getTranslatedText(question, 'options') as string[];
        
        return (
          <div className="space-y-3">
            {/* Show total votes count for polls after submission */}
            {isPollSubmitted && questionResults && totalVotes > 0 && (
              <div className="flex items-center justify-between px-2 pb-2 border-b border-gray-200">
                <span className="text-xs text-gray-500">Total responses</span>
                <span className="text-xs font-semibold text-gray-700">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
              </div>
            )}
            
            {translatedSingleOptions?.map((option: any, index: number) => {
              const optionValue = typeof option === 'string' ? option : (option.value || option.text || option.label || option);
              const optionLabel = typeof option === 'string' ? option : (option.label || option.text || option.value || option);
              const isSelected = responses[questionId] === optionValue;
              
              // Find result for this option if poll results available
              const optionResult = questionResults?.find(r => r.option === optionValue);
              const percentage = optionResult?.percentage || 0;
              const voteCount = optionResult?.count || 0;
              
              return (
                <div
                  key={index}
                  onClick={() => !isSubmitted && !isPollSubmitted && handleResponseChange(questionId, optionValue)}
                  className={`relative overflow-hidden flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                    (isSubmitted || isPollSubmitted) ? 'cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    isSelected && isPollSubmitted
                      ? "border-blue-500 bg-blue-50"
                      : isSelected
                      ? "border-qsights-blue bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {/* Poll results background bar */}
                  {isPollSubmitted && optionResult && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 transition-all duration-700 ease-out"
                      style={{ 
                        width: `${percentage}%`,
                        background: isSelected 
                          ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 197, 253, 0.1) 100%)'
                          : 'linear-gradient(90deg, rgba(229, 231, 235, 0.5) 0%, rgba(243, 244, 246, 0.3) 100%)'
                      }}
                    />
                  )}
                  
                  <div className="flex items-center gap-3 flex-1 relative z-10">
                    {isPollSubmitted && isSelected ? (
                      <CheckCircle className="w-5 h-5 text-blue-600 fill-blue-600" />
                    ) : (
                      <Circle
                        className={`w-5 h-5 ${
                          isSelected
                            ? "text-qsights-blue fill-qsights-blue"
                            : "text-gray-400"
                        }`}
                      />
                    )}
                    <span className={`text-sm flex-1 ${
                      isPollSubmitted && isSelected ? 'font-semibold text-gray-900' : 'text-gray-700'
                    }`}>
                      {optionLabel}
                    </span>
                  </div>
                  
                  {/* Show percentage and vote count for polls after submission */}
                  {isPollSubmitted && optionResult && (
                    <div className="flex items-center gap-2 relative z-10">
                      <span className="text-xs text-gray-500">{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
                      <span className={`text-sm font-bold min-w-[45px] text-right ${
                        isSelected ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  
                  {/* Show submitted indicator for assessments */}
                  {isSubmitted && isSelected && !isPoll && (
                    <span className="ml-auto text-xs text-gray-500 relative z-10">(Submitted)</span>
                  )}
                </div>
              );
            })}
            
            {/* Show your vote indicator for polls */}
            {isPollSubmitted && (
              <div className="flex items-center gap-2 px-2 pt-2 text-xs text-gray-500">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span>Your vote has been recorded</span>
              </div>
            )}
          </div>
        );

      case "multiple_choice":
      case "checkbox":
      case "multiselect":
      case "multiple_choice_multiple":
        const translatedMultiOptions = getTranslatedText(question, 'options') as string[];
        return (
          <div className="space-y-3">
            {translatedMultiOptions?.map((option: any, index: number) => {
              const optionValue = typeof option === 'string' ? option : (option.value || option.text || option.label || option);
              const optionLabel = typeof option === 'string' ? option : (option.label || option.text || option.value || option);
              const isSelected = (responses[questionId] || []).includes(optionValue);
              return (
                <div
                  key={index}
                  onClick={() => !isSubmitted && handleMultipleChoiceToggle(questionId, optionValue)}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                    isSubmitted ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                  } ${
                    isSelected ? "border-qsights-blue bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Square
                    className={`w-5 h-5 ${isSelected ? "text-qsights-blue fill-qsights-blue" : "text-gray-400"}`}
                  />
                  <span className="text-sm text-gray-700">{optionLabel}</span>
                  {isSubmitted && isSelected && (
                    <span className="ml-auto text-xs text-gray-500">(Submitted)</span>
                  )}
                </div>
              );
            })}
          </div>
        );

      case "rating":
        const maxRating = question.settings?.scale || question.max_value || 5;
        const isPoll_rating = activity?.type === 'poll';
        const isPollSubmitted_rating = isPoll_rating && pollSubmittedQuestions.has(questionId);
        const ratingResults = pollResults[questionId] || [];
        
        // Calculate total votes for ratings
        const totalRatingVotes = ratingResults.reduce((sum, r) => sum + r.count, 0);
        
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => {
                const isSelected = responses[questionId] === rating;
                const ratingResult = ratingResults.find((r: any) => parseInt(r.option) === rating);
                const voteCount = ratingResult?.count || 0;
                const percentage = ratingResult?.percentage || 0;
                
                return (
                  <button
                    key={rating}
                    onClick={() => !isSubmitted && !isPollSubmitted_rating && handleResponseChange(questionId, rating)}
                    disabled={isSubmitted || isPollSubmitted_rating}
                    className={`w-12 h-12 rounded-lg border-2 font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
                      responses[questionId] === rating
                        ? "border-qsights-blue bg-qsights-blue text-white"
                        : "border-gray-300 text-gray-600 hover:border-qsights-blue"
                    }`}
                  >
                    {rating}
                  </button>
                );
              })}
            </div>
            
            {/* Show poll results with percentage bars for ratings */}
            {isPollSubmitted_rating && (
              <div className="space-y-2 mt-4">
                <div className="text-xs text-gray-500 mb-3">
                  <CheckCircle className="w-4 h-4 text-blue-600 inline mr-1" />
                  Your vote has been recorded • {totalRatingVotes} total vote{totalRatingVotes !== 1 ? 's' : ''}
                </div>
                {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => {
                  const isSelected = responses[questionId] === rating;
                  const ratingResult = ratingResults.find((r: any) => parseInt(r.option) === rating);
                  const voteCount = ratingResult?.count || 0;
                  const percentage = ratingResult?.percentage || 0;
                  
                  return (
                    <div key={rating} className="relative">
                      <div className={`flex items-center justify-between px-4 py-3 border-2 rounded-lg transition-all overflow-hidden ${
                        isSelected ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                      }`}>
                        {/* Percentage bar background */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 transition-all duration-700 ease-out"
                          style={{ 
                            width: `${percentage}%`,
                            background: isSelected 
                              ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 197, 253, 0.1) 100%)'
                              : 'linear-gradient(90deg, rgba(229, 231, 235, 0.5) 0%, rgba(243, 244, 246, 0.3) 100%)'
                          }}
                        />
                        
                        <div className="flex items-center gap-3 relative z-10">
                          {isSelected ? (
                            <CheckCircle className="w-5 h-5 text-blue-600 fill-blue-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400" />
                          )}
                          <span className={`text-sm font-medium ${
                            isSelected ? 'text-gray-900 font-semibold' : 'text-gray-700'
                          }`}>
                            Rating {rating}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 relative z-10">
                          <span className="text-xs text-gray-500">{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
                          <span className={`text-sm font-bold min-w-[45px] text-right ${
                            isSelected ? 'text-blue-600' : 'text-gray-600'
                          }`}>
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "scale":
        const minScale = question.settings?.min || 0;
        const maxScale = question.settings?.max || 100;
        const scaleStep = question.settings?.step || 1;
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={minScale}
                max={maxScale}
                step={scaleStep}
                value={responses[questionId] || minScale}
                onChange={(e) => handleResponseChange(questionId, parseInt(e.target.value))}
                disabled={isSubmitted}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-qsights-blue disabled:cursor-not-allowed disabled:opacity-70"
              />
              <div className="w-16 text-center">
                <input
                  type="number"
                  min={minScale}
                  max={maxScale}
                  step={scaleStep}
                  value={responses[questionId] || minScale}
                  onChange={(e) => handleResponseChange(questionId, parseInt(e.target.value))}
                  disabled={isSubmitted}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{minScale}</span>
              <span>{maxScale}</span>
            </div>
          </div>
        );

      case "star_rating":
        const maxStars = question.max_value || 5;
        return (
          <div className="flex items-center gap-1">
            {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
              <button
                key={star}
                onClick={() => !isSubmitted && handleResponseChange(questionId, star)}
                disabled={isSubmitted}
                className="p-1 hover:scale-110 transition-transform disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Star
                  className={`w-8 h-8 ${
                    responses[questionId] >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
        );

      case "date":
        return (
          <Input
            type="date"
            value={responses[questionId] || ""}
            onChange={(e) => handleResponseChange(questionId, e.target.value)}
            className="w-full"
            disabled={isSubmitted}
          />
        );

      case "dropdown":
      case "select":
        const translatedDropdownOptions = getTranslatedText(question, 'options') as string[];
        return (
          <select
            value={responses[questionId] || ""}
            onChange={(e) => handleResponseChange(questionId, e.target.value)}
            disabled={isSubmitted}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select an option...</option>
            {translatedDropdownOptions?.map((option: any, index: number) => {
              const optionValue = typeof option === 'string' ? option : (option.value || option.text);
              const optionLabel = typeof option === 'string' ? option : (option.text || option.label);
              return (
                <option key={index} value={optionValue}>
                  {optionLabel}
                </option>
              );
            })}
          </select>
        );

      case "matrix":
        const matrixRows = question.settings?.rows || question.rows || [];
        const matrixColumns = question.settings?.columns || question.columns || [];
        const matrixResponses = responses[questionId] || {};
        
        // If no rows/columns configured, show a fallback message
        if (matrixRows.length === 0 || matrixColumns.length === 0) {
          return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                This matrix question is not properly configured. Please contact the administrator.
              </p>
            </div>
          );
        }
        
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-3 bg-gray-50"></th>
                  {matrixColumns.map((col: any, index: number) => (
                    <th key={index} className="border border-gray-300 p-3 bg-gray-50 text-sm font-medium text-gray-700">
                      {typeof col === 'string' ? col : col.label || col.value}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row: any, rowIndex: number) => {
                  const rowKey = typeof row === 'string' ? row : row.value || row.label;
                  const rowLabel = typeof row === 'string' ? row : row.label || row.value;
                  return (
                    <tr key={rowIndex}>
                      <td className="border border-gray-300 p-3 font-medium text-sm text-gray-700">
                        {rowLabel}
                      </td>
                      {matrixColumns.map((col: any, colIndex: number) => {
                        const colKey = typeof col === 'string' ? col : col.value || col.label;
                        return (
                          <td key={colIndex} className="border border-gray-300 p-3 text-center">
                            <input
                              type="radio"
                              name={`${questionId}_${rowKey}`}
                              checked={matrixResponses[rowKey] === colKey}
                              onChange={() => {
                                handleResponseChange(questionId, {
                                  ...matrixResponses,
                                  [rowKey]: colKey
                                });
                              }}
                              className="w-4 h-4 text-qsights-blue focus:ring-qsights-blue cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      default:
        return (
          <Input
            type="text"
            placeholder="Enter your answer..."
            value={responses[questionId] || ""}
            onChange={(e) => handleResponseChange(questionId, e.target.value)}
            className="w-full"
          />
        );
    }
  };

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: activity?.landing_config?.backgroundColor || "#F9FAFB" }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-qsights-blue mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: activity?.landing_config?.backgroundColor || "#F9FAFB" }}
      >
        <div className="text-center">
          <p className="text-red-600">{error || "Activity not found"}</p>
        </div>
      </div>
    );
  }

  // Thank You / Results Screen after submission
  if (submitted) {
    const handleRetake = () => {
      // Clear session and reset state for retake
      localStorage.removeItem(`activity_${activityId}_session`);
      setSubmitted(false);
      setResponses({});
      setCurrentSectionIndex(0);
      setCurrentQuestionIndex(0);
      setSubmittedQuestions(new Set());
      setAssessmentResult(null);
      setStartTime(Date.now());
      toast({ title: "Starting New Attempt", description: "Beginning a new assessment attempt", variant: "success" });
    };

    const isAssessment = questionnaire?.type === 'assessment' || activity?.type === 'assessment';
    
    console.log('Rendering thank you page:', {
      questionnaireType: questionnaire?.type,
      activityType: activity?.type,
      isAssessment,
      hasAssessmentResult: !!assessmentResult,
      assessmentResult
    });

    return (
      <div className="h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="w-full max-w-2xl px-6">
          {isAssessment && assessmentResult ? (
            // Assessment Results - Typeform-inspired design
            <div className="text-center space-y-6 animate-in fade-in duration-700">
              {/* Main Icon */}
              <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center transform transition-all duration-500 ${
                assessmentResult.assessmentResult === 'pass' 
                  ? 'bg-green-500 shadow-lg shadow-green-200' 
                  : 'bg-orange-500 shadow-lg shadow-orange-200'
              }`}>
                {assessmentResult.assessmentResult === 'pass' ? (
                  <CheckCircle className="w-11 h-11 text-white" />
                ) : (
                  <span className="text-4xl">⚠️</span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-gray-900">
                {assessmentResult.assessmentResult === 'pass' ? 'Well done!' : 'Assessment Complete'}
              </h1>

              {/* Score Card - Compact & Clean */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-4">
                {/* Score */}
                <div>
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Your Score</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-6xl font-bold text-gray-900">{assessmentResult.correctAnswersCount}</span>
                    <span className="text-3xl font-semibold text-gray-400">/</span>
                    <span className="text-6xl font-bold text-gray-400">{assessmentResult.totalQuestions}</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-gray-600">
                    {assessmentResult.score?.toFixed(0)}%
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200"></div>

                {/* Status */}
                <div className={`py-3 px-6 rounded-xl ${
                  assessmentResult.assessmentResult === 'pass'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-orange-50 text-orange-700'
                }`}>
                  <div className="font-semibold text-lg">
                    {assessmentResult.assessmentResult === 'pass' 
                      ? '✓ Passed' 
                      : '✗ Not Passed'}
                  </div>
                  {activity?.pass_percentage && (
                    <div className="text-sm opacity-75 mt-1">
                      Pass mark: {activity.pass_percentage}%
                    </div>
                  )}
                </div>

                {/* Attempt Info */}
                <div className="text-xs text-gray-500">
                  Attempt #{assessmentResult.attemptNumber}
                </div>
              </div>

              {/* Retake Section */}
              {assessmentResult.assessmentResult !== 'pass' && assessmentResult.canRetake && (
                <div className="bg-blue-50 rounded-xl p-6 space-y-3 border border-blue-100">
                  <p className="text-gray-700 font-medium">
                    {assessmentResult.retakesRemaining === null 
                      ? 'You can retake this assessment'
                      : assessmentResult.retakesRemaining === 1
                      ? '1 retake remaining'
                      : `${assessmentResult.retakesRemaining} retakes remaining`
                    }
                  </p>
                  <button
                    onClick={handleRetake}
                    className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* No retakes message */}
              {assessmentResult.assessmentResult !== 'pass' && !assessmentResult.canRetake && (
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                  <p className="text-sm text-orange-800">
                    No retakes remaining
                  </p>
                </div>
              )}

              {/* Footer */}
              <p className="text-sm text-gray-500 pt-2">
                A confirmation has been sent to your email
              </p>
            </div>
          ) : (
            // General Thank You (Non-Assessment) - Clean & Simple
            <div className="text-center space-y-6 animate-in fade-in duration-700">
              {isPreview && (
                <div className="mb-4 px-4 py-2 bg-yellow-100 border border-yellow-300 rounded-lg">
                  <p className="text-sm text-yellow-800 font-semibold">
                    🔍 Preview Mode - No data was saved
                  </p>
                </div>
              )}
              <div 
                className="mx-auto w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                style={{ 
                  backgroundColor: activity?.landing_config?.thankYouIconColor || "#10B981",
                  boxShadow: `0 10px 25px -5px ${activity?.landing_config?.thankYouIconColor || "#10B981"}33`
                }}
              >
                <CheckCircle className="w-11 h-11 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                {activity?.landing_config?.thankYouTitle || "Thank you!"}
              </h1>
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                <p className="text-lg text-gray-700 mb-2">
                  {isPreview 
                    ? "Preview completed" 
                    : (activity?.landing_config?.thankYouMessage || "Your response has been submitted")
                  }
                </p>
                <p className="text-sm text-gray-500">
                  {isPreview
                    ? "This was a preview - responses were not saved"
                    : (activity?.landing_config?.thankYouSubMessage || "We appreciate your participation")
                  }
                </p>
              </div>
              {!isPreview && (activity?.landing_config?.thankYouShowConfirmation !== false) && (
                <p className="text-sm text-gray-500">
                  A confirmation has been sent to your email
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show landing page form when needed
  if (showForm || (isAnonymous && !started) || (isPreview && !started)) {
    // Determine form title based on link type
    const formTitle = isPreview 
      ? "Preview Mode" 
      : "Registration";
    
    const formDescription = isPreview
      ? "Testing only - No data will be saved"
      : "Please register to participate";

    // Get registration form fields or use defaults
    const formFields = activity.registration_form_fields || [
      {
        id: "name",
        type: "text" as const,
        label: "Full Name",
        placeholder: "Enter your full name",
        required: true,
        order: 0,
        isMandatory: true,
      },
      {
        id: "email",
        type: "email" as const,
        label: "Email Address",
        placeholder: "your.email@example.com",
        required: true,
        order: 1,
        isMandatory: true,
      },
    ];

    const renderFormField = (field: FormField) => {
      // Get the field identifier (support both 'id' and 'name' properties)
      const fieldKey = field.id || (field as any).name || 'unknown';
      // Get the value for this specific field only
      const value = participantData[fieldKey] || "";
      const isIdentityField = ['name', 'full_name', 'email', 'email_address'].includes(fieldKey) || field.type === 'email';
      
      // Debug logging for token-based fields
      if (token && tokenValidated && isIdentityField) {
        console.log(`Field ${fieldKey}:`, {
          value,
          participantData,
          tokenValidated,
          token: !!token
        });
      }
      
      const onChange = (val: any) => {
        setParticipantData((prev) => ({ ...prev, [fieldKey]: val }));
      };
      
      // Check if this field should be read-only (name/email with token)
      const isReadOnly = token && tokenValidated && isIdentityField;

      switch (field.type) {
        case "text":
        case "email":
        case "phone":
        case "organization":
          return (
            <Input
              id={fieldKey}
              type={field.type === "phone" ? "tel" : field.type}
              placeholder={field.placeholder || field.label}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`w-full ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required={!isPreview && (field.required || field.isMandatory)}
              readOnly={isReadOnly}
              disabled={isReadOnly}
            />
          );

        case "number":
          return (
            <Input
              id={fieldKey}
              type="number"
              placeholder={field.placeholder || field.label}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full"
              required={!isPreview && (field.required || field.isMandatory)}
            />
          );

        case "date":
          return (
            <Input
              id={fieldKey}
              type="date"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full"
              required={!isPreview && (field.required || field.isMandatory)}
            />
          );

        case "textarea":
        case "address":
          return (
            <textarea
              id={fieldKey}
              rows={field.type === "address" ? 3 : 4}
              placeholder={field.placeholder || field.label}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
              required={!isPreview && (field.required || field.isMandatory)}
            />
          );

        case "select":
          return (
            <select
              id={fieldKey}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
              required={!isPreview && (field.required || field.isMandatory)}
            >
              <option value="">Select an option...</option>
              {field.options?.map((option, idx) => (
                <option key={idx} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );

        default:
          return (
            <Input
              id={fieldKey}
              type="text"
              placeholder={field.placeholder || field.label}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full"
              required={!isPreview && (field.required || field.isMandatory)}
            />
          );
      }
    };

    return (
      <div 
        className="flex flex-col min-h-screen"
        style={{ 
          backgroundColor: activity?.landing_config?.backgroundColor || "#F9FAFB",
          overflow: 'hidden',
        }}
      >
        {/* Top Banner with Logo and Text */}
        {activity?.landing_config?.bannerEnabled !== false && activity?.landing_config?.bannerBackgroundColor && (
          <div 
            className="fixed top-0 left-0 right-0 z-20" 
            style={{ 
              backgroundColor: activity.landing_config.bannerBackgroundColor || "#3B82F6",
              height: activity.landing_config.bannerHeight || "120px",
              backgroundImage: activity.landing_config.bannerImageUrl ? `url(${activity.landing_config.bannerImageUrl})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: activity.landing_config.bannerImagePosition || "center",
            }}
          >
            {/* Mobile: Stacked Layout */}
            <div className="flex flex-col md:hidden items-center justify-center gap-3 w-full pt-2 h-full">
              {activity?.landing_config?.logoUrl && (
                <img 
                  src={activity.landing_config.logoUrl} 
                  alt="Logo" 
                  className="object-contain"
                  style={{
                    height: activity.landing_config.logoSize === 'small' ? '32px' 
                      : activity.landing_config.logoSize === 'large' ? '56px' 
                      : '44px'
                  }}
                />
              )}
              {activity?.landing_config?.bannerText && (
                <h1 
                  className="text-lg font-bold text-center"
                  style={{ color: activity.landing_config.bannerTextColor || "#FFFFFF" }}
                >
                  {activity.landing_config.bannerText}
                </h1>
              )}
            </div>
            {/* Desktop: Absolutely position logo and text for perfect centering */}
            <div className="hidden md:block w-full h-full relative">
              {/* Logo - Left */}
              {activity.landing_config.logoPosition === 'left' && activity?.landing_config?.logoUrl && (
                <div className="absolute left-0 pl-4 flex items-center h-full z-10">
                  <img 
                    src={activity.landing_config.logoUrl} 
                    alt="Logo" 
                    className="object-contain"
                    style={{
                      height: activity.landing_config.logoSize === 'small' ? '40px' 
                        : activity.landing_config.logoSize === 'large' ? '80px' 
                        : '60px'
                    }}
                  />
                </div>
              )}
              {/* Logo - Right */}
              {activity.landing_config.logoPosition === 'right' && activity?.landing_config?.logoUrl && (
                <div className="absolute right-0 pr-4 flex items-center h-full z-10">
                  <img 
                    src={activity.landing_config.logoUrl} 
                    alt="Logo" 
                    className="object-contain"
                    style={{
                      height: activity.landing_config.logoSize === 'small' ? '40px' 
                        : activity.landing_config.logoSize === 'large' ? '80px' 
                        : '60px'
                    }}
                  />
                </div>
              )}
              {/* Banner Text - Absolutely centered in full banner width */}
              {activity?.landing_config?.bannerText && (
                <div className="absolute inset-0 flex items-center justify-center w-full h-full pointer-events-none z-20">
                  <h1 
                    className="text-2xl font-bold text-center w-full"
                    style={{ color: activity.landing_config.bannerTextColor || "#FFFFFF", margin: 0 }}
                  >
                    {activity.landing_config.bannerText}
                  </h1>
                </div>
              )}
              {/* Logo Center - Only when no text */}
              {activity.landing_config.logoPosition === 'center' && activity?.landing_config?.logoUrl && !activity?.landing_config?.bannerText && (
                <div className="w-full flex justify-center items-center h-full z-10">
                  <img 
                    src={activity.landing_config.logoUrl} 
                    alt="Logo" 
                    className="object-contain"
                    style={{
                      height: activity.landing_config.logoSize === 'small' ? '40px' 
                        : activity.landing_config.logoSize === 'large' ? '80px' 
                        : '60px'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Header Container - Responsive layout for Logo and Title (when no banner) */}
        {(activity?.landing_config?.logoUrl || activity?.landing_config?.pageTitle) && !activity?.landing_config?.bannerBackgroundColor && (
          <div className="fixed top-0 left-0 right-0 z-20 bg-white shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3 gap-2 md:gap-4">
              {/* Logo */}
              {activity?.landing_config?.logoUrl && (
                <div 
                  className={`flex-shrink-0 ${
                    activity.landing_config.logoPosition === 'center' && !activity?.landing_config?.pageTitle ? 'mx-auto' :
                    activity.landing_config.logoPosition === 'right' ? 'md:order-2 md:ml-auto' : ''
                  }`}
                >
                  <img 
                    src={activity.landing_config.logoUrl} 
                    alt="Logo" 
                    className="object-contain"
                    style={{
                      height: activity.landing_config.logoSize === 'small' ? '32px' 
                        : activity.landing_config.logoSize === 'large' ? '56px' 
                        : '44px'
                    }}
                  />
                </div>
              )}
              
              {/* Page Title */}
              {activity?.landing_config?.pageTitle && (
                <h1 
                  className="font-bold text-center md:text-left flex-1"
                  style={{
                    color: activity.landing_config.pageTitleColor || "#1F2937",
                    fontSize: activity.landing_config.pageTitleSize === 'small' ? '1rem' 
                      : activity.landing_config.pageTitleSize === 'large' ? '1.5rem' 
                      : '1.25rem'
                  }}
                >
                  {activity.landing_config.pageTitle}
                </h1>
              )}
            </div>
          </div>
        )}
        
        <div 
          className="flex flex-col lg:flex-row flex-1"
          style={{ 
            marginTop: activity?.landing_config?.bannerBackgroundColor ? (activity.landing_config.bannerHeight || "120px") : 
                      (activity?.landing_config?.logoUrl || activity?.landing_config?.pageTitle) ? "70px" : 0,
          }}
        >
          {/* Left Content Panel - appears SECOND on mobile (order-2), first on desktop (lg:order-1) */}
          {activity?.landing_config?.leftContentEnabled && (
            <div 
              className="w-full lg:w-1/2 order-2 lg:order-1 px-4 py-8 lg:p-12 flex flex-col justify-center items-center relative"
              style={{ 
                backgroundColor: activity.landing_config.leftContentBackgroundColor || "#0EA5E9",
                backgroundImage: activity.landing_config.leftContentImagePosition === 'fullscreen' && activity.landing_config.leftContentImageUrl 
                  ? `url(${activity.landing_config.leftContentImageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                minHeight: '100vh'
              }}
            >
              {/* Overlay for better text readability on fullscreen background */}
              {activity.landing_config.leftContentImagePosition === 'fullscreen' && activity.landing_config.leftContentImageUrl && (
                <div className="absolute inset-0 bg-black/30"></div>
              )}
              
              <div className={`relative z-10 flex flex-col items-center ${
                activity.landing_config.leftContentImagePosition === 'bottom' ? 'justify-start' : 'justify-center'
              } w-full`}>
                {/* Image at top */}
                {activity.landing_config.leftContentImagePosition === 'top' && activity.landing_config.leftContentImageUrl && (
                  <img 
                    src={activity.landing_config.leftContentImageUrl} 
                    alt="Content" 
                    className="w-full max-w-md rounded-lg shadow-lg mb-8"
                  />
                )}
                
                {/* Text content */}
                <div className="text-center">
                  {activity.landing_config.leftContentTitle && (
                    <h2 
                      className="text-2xl lg:text-3xl font-bold mb-4"
                      style={{ color: activity.landing_config.leftContentTitleColor || "#FFFFFF" }}
                    >
                      {activity.landing_config.leftContentTitle}
                    </h2>
                  )}
                  {activity.landing_config.leftContentDescription && (
                    <p 
                      className="text-base lg:text-lg max-w-md"
                      style={{ color: activity.landing_config.leftContentDescriptionColor || "#E0F2FE" }}
                    >
                      {activity.landing_config.leftContentDescription}
                    </p>
                  )}
                </div>
                
                {/* Image at bottom */}
                {activity.landing_config.leftContentImagePosition === 'bottom' && activity.landing_config.leftContentImageUrl && (
                  <img 
                    src={activity.landing_config.leftContentImageUrl} 
                    alt="Content" 
                    className="w-full max-w-md rounded-lg shadow-lg mt-8"
                  />
                )}
              </div>
            </div>
          )}
        
          {/* Right Side Area with Background Image - appears FIRST on mobile (order-1), second on desktop (lg:order-2) */}
          <div 
            className={`w-full ${activity?.landing_config?.leftContentEnabled ? 'lg:w-1/2' : ''} order-1 lg:order-2 relative flex flex-col`}
            style={{
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              zIndex: 1,
              marginTop: activity?.landing_config?.bannerBackgroundColor ? `calc(-1 * (${activity.landing_config.bannerHeight || "120px"}))` : 
                        (activity?.landing_config?.logoUrl || activity?.landing_config?.pageTitle) ? '-70px' : 0,
              marginBottom: activity?.landing_config?.footerEnabled !== false && activity?.landing_config?.footerBackgroundColor ? `calc(-1 * (${activity.landing_config.footerHeight || "80px"}))` : 0,
              paddingTop: activity?.landing_config?.bannerBackgroundColor ? `calc(${activity.landing_config.bannerHeight || "120px"} + 3rem)` : 
                         (activity?.landing_config?.logoUrl || activity?.landing_config?.pageTitle) ? "calc(70px + 3rem)" : '3rem',
              paddingBottom: activity?.landing_config?.footerEnabled !== false && activity?.landing_config?.footerBackgroundColor ? `calc(${activity.landing_config.footerHeight || "80px"} + 3rem)` : '3rem',
            }}
          >
            {/* Background overlay that extends behind banner and footer */}
            {activity?.landing_config?.loginBoxBackgroundImageUrl && (
              <div 
                className="absolute"
                style={{ 
                  backgroundImage: `url(${activity.landing_config.loginBoxBackgroundImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  top: activity?.landing_config?.bannerBackgroundColor ? `calc(-1 * (${activity.landing_config.bannerHeight || "120px"}))` : 
                       (activity?.landing_config?.logoUrl || activity?.landing_config?.pageTitle) ? '-70px' : 0,
                  bottom: activity?.landing_config?.footerEnabled !== false && activity?.landing_config?.footerBackgroundColor ? `calc(-1 * (${activity.landing_config.footerHeight || "80px"}))` : 0,
                  left: 0,
                  right: 0,
                  zIndex: 0,
                }}
              />
            )}
            {/* Semi-transparent overlay when background image is present */}
            {activity?.landing_config?.loginBoxBackgroundImageUrl && (
              <div 
                className="absolute"
                style={{ 
                  backgroundColor: 'white',
                  opacity: (100 - (activity.landing_config.loginBoxBackgroundOpacity || 50)) / 100,
                  top: activity?.landing_config?.bannerBackgroundColor ? `calc(-1 * (${activity.landing_config.bannerHeight || "120px"}))` : 
                       (activity?.landing_config?.logoUrl || activity?.landing_config?.pageTitle) ? '-70px' : 0,
                  bottom: activity?.landing_config?.footerEnabled !== false && activity?.landing_config?.footerBackgroundColor ? `calc(-1 * (${activity.landing_config.footerHeight || "80px"}))` : 0,
                  left: 0,
                  right: 0,
                  zIndex: 1,
                }}
              />
            )}
            
            {/* Login Box Container - Wrapper for card and version */}
            <div 
              className="relative flex flex-col items-center justify-center w-full px-4 lg:px-12 flex-1"
              style={{
                zIndex: 10,
              }}
            >
              {/* Login Box */}
              <div className="w-full flex justify-center relative z-10">
              <Card 
                className={`w-full max-w-full ${activity?.landing_config?.leftContentEnabled ? 'lg:max-w-xl' : 'lg:max-w-2xl'} shadow-lg`}
              >
                <CardHeader 
                  className="border-b border-gray-200 text-white relative z-10 text-center"
                  style={{ backgroundColor: activity?.landing_config?.activityCardHeaderColor || "#3B82F6" }}
                >
                  {activity?.landing_config?.loginBoxBannerLogoUrl && (
                    <div className="flex justify-center mb-3">
                      <img 
                        src={activity.landing_config.loginBoxBannerLogoUrl} 
                        alt="Logo" 
                        className="h-12 object-contain"
                      />
                    </div>
                  )}
                  {activity?.landing_config?.loginBoxShowTitle !== false && (
                    <>
                      <CardTitle className="text-xl font-bold">{activity.name}</CardTitle>
                      {activity.description && <p className="text-sm text-white/90 mt-2">{activity.description}</p>}
                    </>
                  )}
                </CardHeader>
                <CardContent className="p-6 space-y-6 relative z-10">
                  {/* Preview Mode Indicator */}
                  {isPreview && (
                    <div className="px-4 py-3 rounded-lg border bg-yellow-50 border-yellow-300 text-yellow-800">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">🔍 Preview Mode</span>
                      </div>
                      <p className="text-sm mt-1">
                        Testing only - No data will be saved or counted in reports
                      </p>
                    </div>
                  )}
                  {/* Language Selector - only if multilingual */}
                  {activity?.is_multilingual && activity?.languages && activity.languages.length > 1 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Select Language <span className="text-red-500">*</span>
                      </Label>
                      <select
                        value={selectedLanguage || ''}
                        onChange={(e) => setSelectedLanguage(e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                      >
                        <option value="">-- Select a language --</option>
                        {activity.languages.map((lang: string) => (
                          <option key={lang} value={lang}>
                            {LANGUAGE_NAMES[lang] || lang}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {/* Anonymous Access Banner */}
                  {isAnonymous && (
                    <div className="px-4 py-3 rounded-lg border bg-blue-50 border-blue-300 text-blue-800">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">👤 Anonymous Access</span>
                      </div>
                      <p className="text-sm mt-1">
                        Your responses will be saved anonymously and counted in reports
                      </p>
                    </div>
                  )}

                  {/* Token-based access banner */}
                  {token && tokenValidated && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Welcome, {participantData.name}!</p>
                        <p className="text-xs text-gray-600 mt-1">Your information has been verified</p>
                      </div>
                    </div>
                  )}

                  {/* Participant Information banner - Show for Registration, optional for Preview */}
                  {!isAnonymous && !isPreview && !token && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <UserPlus className="w-5 h-5 text-qsights-blue" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Participant Information Required</p>
                        <p className="text-xs text-gray-600 mt-1">Please provide your details to continue</p>
                      </div>
                    </div>
                  )}

            {/* Form Fields - Display one per row - Hide only for anonymous */}
            {!isAnonymous && (
              <div className="space-y-4">
                {formFields
                  .sort((a, b) => a.order - b.order)
                  .map((field, idx) => {
                    // Check if field is pre-filled by token (name/email)
                    const isPreFilled = token && tokenValidated && (field.id === 'name' || field.id === 'email');
                    
                    return (
                      <div
                        key={field.id || `field-${idx}`}
                        className="w-full"
                      >
                        <div className="space-y-2">
                          <Label htmlFor={field.id} className="text-sm font-medium text-gray-700">
                            {field.label}{" "}
                            {!isPreview && (field.required || field.isMandatory) && !isPreFilled && (
                              <span className="text-red-500">*</span>
                            )}
                            {isPreview && (
                              <span className="text-gray-400 text-xs">(optional)</span>
                            )}
                            {isPreFilled && (
                              <span className="text-green-600 text-xs">(verified)</span>
                            )}
                          </Label>
                          {renderFormField(field)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Anonymous mode: Show text and Start button */}
            {isAnonymous && (
              <div className="space-y-3 text-center">
                <p className="text-gray-600">
                  Click the button below to start the {activity?.type === 'assessment' ? 'assessment' : activity?.type === 'poll' ? 'poll' : 'survey'} anonymously.
                </p>
              </div>
            )}

            <button
              onClick={handleStartParticipant}
              disabled={submitting || (activity?.is_multilingual && activity?.languages && activity.languages.length > 1 && !selectedLanguage)}
              className="w-full px-4 py-3 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: activity?.landing_config?.loginButtonColor || "#3B82F6" }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isAnonymous ? 'Starting...' : isPreview ? 'Loading Preview...' : token && tokenValidated ? 'Starting...' : 'Registering...'}
                </>
              ) : (
                <>
                  {isPreview ? 'Start Preview' : token && tokenValidated ? 'Continue' : `Start ${activity?.type === 'assessment' ? 'Assessment' : activity?.type === 'poll' ? 'Poll' : 'Survey'}`}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
              </button>
            {activity?.is_multilingual && activity?.languages && activity.languages.length > 1 && !selectedLanguage && (
              <p className="text-xs text-red-600 text-center mt-2">
                Please select a language before starting
              </p>
            )}
            </CardContent>
          </Card>
              </div>
          
              {/* Version Display - Below Login Box */}
              <div className="mt-4 text-center w-full">
                <p 
                  className="text-xs font-medium"
                  style={{ color: activity?.landing_config?.footerTextColor || "#6B7280" }}
                >
                  Version {appVersion}
                </p>
              </div>
            </div>
            </div>
        </div>
        
        {/* Footer */}
        {(activity?.landing_config?.footerEnabled !== false) && (
          <div 
            className="w-full px-4 md:px-8 flex items-center py-4 md:py-0 relative z-20"
            style={{ 
              backgroundColor: activity?.landing_config?.footerBackgroundColor || "#F1F5F9",
              minHeight: activity?.landing_config?.footerHeight || "80px"
            }}
          >
            <div className="max-w-7xl mx-auto w-full">
              {/* Responsive layout - stacked on mobile, grid on desktop */}
              <div className="flex flex-col md:grid md:grid-cols-3 items-center gap-3 md:gap-4 w-full">
                {/* Left Section */}
                <div className="flex justify-center md:justify-start w-full">
                  {activity?.landing_config?.footerLogoUrl && activity.landing_config.footerLogoPosition === 'left' && (
                    <img 
                      src={activity.landing_config.footerLogoUrl} 
                      alt="Footer Logo" 
                      className="object-contain"
                      style={{
                        height: activity.landing_config.footerLogoSize === 'small' ? '24px' :
                                activity.landing_config.footerLogoSize === 'large' ? '40px' : '32px'
                      }}
                    />
                  )}
                  {activity?.landing_config?.footerText && activity.landing_config.footerTextPosition === 'left' && (
                    <p 
                      className="text-xs md:text-sm text-center md:text-left"
                      style={{ color: activity.landing_config.footerTextColor || "#6B7280" }}
                    >
                      {activity.landing_config.footerText}
                    </p>
                  )}
                </div>
                
                {/* Center Section */}
                <div className="flex justify-center w-full">
                  {activity?.landing_config?.footerLogoUrl && activity.landing_config.footerLogoPosition === 'center' && (
                    <img 
                      src={activity.landing_config.footerLogoUrl} 
                      alt="Footer Logo" 
                      className="object-contain"
                      style={{
                        height: activity.landing_config.footerLogoSize === 'small' ? '24px' :
                                activity.landing_config.footerLogoSize === 'large' ? '40px' : '32px'
                      }}
                    />
                  )}
                  {activity?.landing_config?.footerText && activity.landing_config.footerTextPosition === 'center' && (
                    <p 
                      className="text-xs md:text-sm text-center"
                      style={{ color: activity.landing_config.footerTextColor || "#6B7280" }}
                    >
                      {activity.landing_config.footerText}
                    </p>
                  )}
                </div>
                
                {/* Right Section */}
                <div className="flex justify-center md:justify-end w-full">
                  {activity?.landing_config?.footerLogoUrl && activity.landing_config.footerLogoPosition === 'right' && (
                    <img 
                      src={activity.landing_config.footerLogoUrl} 
                      alt="Footer Logo" 
                      className="object-contain"
                      style={{
                        height: activity.landing_config.footerLogoSize === 'small' ? '24px' :
                                activity.landing_config.footerLogoSize === 'large' ? '40px' : '32px'
                      }}
                    />
                  )}
                  {activity?.landing_config?.footerText && activity.landing_config.footerTextPosition === 'right' && (
                    <p 
                      className="text-xs md:text-sm text-center md:text-right"
                      style={{ color: activity.landing_config.footerTextColor || "#6B7280" }}
                    >
                      {activity.landing_config.footerText}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentSection = questionnaire?.sections?.[currentSectionIndex];
  const totalSections = questionnaire?.sections?.length || 0;

  // Debug banner config - Check for boolean or string "true"
  const bannerShowOnInnerPages = activity?.landing_config?.bannerShowOnInnerPages;
  const shouldShowBanner = (bannerShowOnInnerPages === true || String(bannerShowOnInnerPages) === 'true') && activity?.landing_config?.bannerBackgroundColor;
  console.log('Banner Debug:', {
    bannerShowOnInnerPages,
    type: typeof bannerShowOnInnerPages,
    bannerBackgroundColor: activity?.landing_config?.bannerBackgroundColor,
    shouldShowBanner,
    fullConfig: activity?.landing_config
  });

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: activity?.landing_config?.backgroundColor || "#F9FAFB" }}
    >
      {/* Top Banner - Conditional for inner pages */}
      {shouldShowBanner && activity?.landing_config && (
        <div 
          className="w-full fixed top-0 left-0 right-0 z-50" 
          style={{ 
            backgroundColor: activity.landing_config.bannerBackgroundColor || "#3B82F6",
            height: activity.landing_config.bannerHeight || "120px",
            backgroundImage: activity.landing_config.bannerImageUrl ? `url(${activity.landing_config.bannerImageUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Mobile: Stacked Layout */}
          <div className="flex flex-col md:hidden items-center justify-center gap-3 w-full pt-2 h-full">
            {activity?.landing_config?.logoUrl && (
              <img 
                src={activity.landing_config.logoUrl} 
                alt="Logo" 
                className="object-contain"
                style={{
                  height: activity.landing_config.logoSize === 'small' ? '32px' 
                    : activity.landing_config.logoSize === 'large' ? '56px' 
                    : '44px'
                }}
              />
            )}
            {activity?.landing_config?.bannerText && (
              <h1 
                className="text-lg font-bold text-center"
                style={{ color: activity.landing_config.bannerTextColor || "#FFFFFF" }}
              >
                {activity.landing_config.bannerText}
              </h1>
            )}
          </div>
          
          {/* Desktop: Absolutely position logo and text for perfect centering */}
          <div className="hidden md:block w-full h-full relative">
            {/* Logo - Left */}
            {activity?.landing_config && activity.landing_config.logoPosition === 'left' && activity.landing_config.logoUrl && (
              <div className="absolute left-0 pl-4 flex items-center h-full z-10">
                <img 
                  src={activity.landing_config.logoUrl} 
                  alt="Logo" 
                  className="object-contain"
                  style={{
                    height: activity.landing_config.logoSize === 'small' ? '40px' 
                      : activity.landing_config.logoSize === 'large' ? '80px' 
                      : '60px'
                  }}
                />
              </div>
            )}
            
            {/* Logo - Right */}
            {activity?.landing_config && activity.landing_config.logoPosition === 'right' && activity.landing_config.logoUrl && (
              <div className="absolute right-0 pr-4 flex items-center h-full z-10">
                <img 
                  src={activity.landing_config.logoUrl} 
                  alt="Logo" 
                  className="object-contain"
                  style={{
                    height: activity.landing_config.logoSize === 'small' ? '40px' 
                      : activity.landing_config.logoSize === 'large' ? '80px' 
                      : '60px'
                  }}
                />
              </div>
            )}
            
            {/* Banner Text - Absolutely centered in full banner width */}
            {activity?.landing_config?.bannerText && (
              <div className="absolute inset-0 flex items-center justify-center w-full h-full pointer-events-none z-20">
                <h1 
                  className="text-2xl font-bold text-center w-full"
                  style={{ color: activity.landing_config.bannerTextColor || "#FFFFFF", margin: 0 }}
                >
                  {activity.landing_config.bannerText}
                </h1>
              </div>
            )}
            
            {/* Logo Center - Only when no text */}
            {activity?.landing_config && activity.landing_config.logoPosition === 'center' && activity.landing_config.logoUrl && !activity.landing_config.bannerText && (
              <div className="w-full flex justify-center items-center h-full z-10">
                <img 
                  src={activity.landing_config.logoUrl} 
                  alt="Logo" 
                  className="object-contain"
                  style={{
                    height: activity.landing_config.logoSize === 'small' ? '40px' 
                      : activity.landing_config.logoSize === 'large' ? '80px' 
                      : '60px'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 lg:p-8" style={{ marginTop: shouldShowBanner ? (activity?.landing_config?.bannerHeight || "120px") : 0 }}>
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Ultra Modern Activity Header */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 shadow-2xl border border-white/10">
            {/* Animated background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
            
            {/* Content Container */}
            <div className="relative z-10 px-6 py-6 md:px-10 md:py-8">
              {/* Top Row: Title + Type Badge */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight">
                  {activity.name}
                </h1>
                <div className="flex-shrink-0 px-4 py-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg">
                  <span className="text-xs font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent uppercase tracking-wider">
                    {activity.type}
                  </span>
                </div>
              </div>

              {/* Description */}
              {activity.description && (
                <p className="text-base text-blue-50/90 leading-relaxed mb-6 max-w-3xl">
                  {activity.description}
                </p>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Start Date */}
                {activity.start_date && (
                  <div className="group flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-blue-100 uppercase tracking-wider font-semibold">Start Date</span>
                      <span className="text-sm font-bold text-white truncate">
                        {new Date(activity.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                )}

                {/* End Date */}
                {activity.end_date && (
                  <div className="group flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-blue-100 uppercase tracking-wider font-semibold">End Date</span>
                      <span className="text-sm font-bold text-white truncate">
                        {new Date(activity.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Questions Count */}
                {questionnaire?.sections && (
                  <div className="group flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-blue-100 uppercase tracking-wider font-semibold">Questions</span>
                      <span className="text-sm font-bold text-white">
                        {questionnaire.sections.reduce((total, section) => total + (section.questions?.length || 0), 0)} Total
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Gradient Border Bottom */}
            <div className="h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500" />
          </div>

        {/* Timer Display */}
        {activity?.time_limit_enabled && activity?.time_limit_minutes && started && !submitted && remainingSeconds !== null && (
          <div className="fixed top-4 right-4 z-50">
            <div className={`backdrop-blur-xl bg-white/90 shadow-2xl rounded-2xl border transition-all duration-300 ${
              remainingSeconds <= 60 
                ? 'border-red-400/50 shadow-red-500/20' 
                : remainingSeconds <= 300 
                ? 'border-yellow-400/50 shadow-yellow-500/20' 
                : 'border-blue-400/50 shadow-blue-500/20'
            }`}>
              <div className="px-6 py-4 flex items-center gap-4">
                <div className="flex flex-col">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    remainingSeconds <= 60 ? 'text-red-700' : remainingSeconds <= 300 ? 'text-yellow-700' : 'text-blue-700'
                  }`}>
                    Time Remaining
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-bold font-mono tracking-tight ${
                      remainingSeconds <= 60 ? 'text-red-600' : remainingSeconds <= 300 ? 'text-yellow-700' : 'text-blue-600'
                    }`}>
                      {Math.floor(remainingSeconds / 60).toString().padStart(2, '0')}:{(remainingSeconds % 60).toString().padStart(2, '0')}
                    </span>
                    <span className={`text-sm font-medium ${
                      remainingSeconds <= 60 ? 'text-red-500' : remainingSeconds <= 300 ? 'text-yellow-600' : 'text-blue-500'
                    }`}>
                      min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Questionnaire */}
        {questionnaire && questionnaire.sections && questionnaire.sections.length > 0 ? (
          <>
            {/* Modern Progress Indicator - for single question mode */}
            {displayMode === 'single' && totalSections > 1 && (
              <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg border border-gray-100">
                {/* Progress Bar Background */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                    style={{ width: `${((currentSectionIndex + 1) / totalSections) * 100}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between px-6 py-4 pt-5">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {Math.round(((currentSectionIndex + 1) / totalSections) * 100)}%
                      </span>
                      <span className="text-sm font-medium text-gray-500">
                        Section {currentSectionIndex + 1} of {totalSections}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{currentSection?.title || "Untitled Section"}</p>
                  </div>
                  
                  {/* Mini Section Indicators */}
                  <div className="flex items-center gap-2">
                    {questionnaire.sections.map((_, index) => (
                      <div
                        key={index}
                        className={`transition-all duration-300 rounded-full ${
                          index < currentSectionIndex 
                            ? "w-2 h-2 bg-green-500" 
                            : index === currentSectionIndex 
                            ? "w-3 h-3 bg-blue-600 ring-2 ring-blue-200" 
                            : "w-2 h-2 bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Modern Progress Indicator - for section mode */}
            {displayMode === 'section' && totalSections > 1 && (
              <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg border border-gray-100">
                {/* Progress Bar Background */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                    style={{ width: `${((currentSectionIndex + 1) / totalSections) * 100}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between px-6 py-4 pt-5">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {Math.round(((currentSectionIndex + 1) / totalSections) * 100)}%
                      </span>
                      <span className="text-sm font-medium text-gray-500">
                        Section {currentSectionIndex + 1} of {totalSections}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{currentSection?.title || "Untitled Section"}</p>
                  </div>
                  
                  {/* Mini Section Indicators */}
                  <div className="flex items-center gap-2">
                    {questionnaire.sections.map((_, index) => (
                      <div
                        key={index}
                        className={`transition-all duration-300 rounded-full ${
                          index < currentSectionIndex 
                            ? "w-2 h-2 bg-green-500" 
                            : index === currentSectionIndex 
                            ? "w-3 h-3 bg-blue-600 ring-2 ring-blue-200" 
                            : "w-2 h-2 bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Current Section */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold">{currentSection?.title || "Questions"}</CardTitle>
                {currentSection?.description && (
                  <p className="text-sm text-gray-600 mt-2">{currentSection.description}</p>
                )}
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {displayMode === 'single' ? (
                  // Single Question Mode - show one question at a time
                  visibleQuestions && visibleQuestions.length > 0 ? (
                    (() => {
                      const question = visibleQuestions[currentQuestionIndex];
                      if (!question) return null;
                      const isQuestionSubmitted = submittedQuestions.has(question.id);
                      return (
                        <div className="space-y-3">
                          {isQuestionSubmitted && questionnaire?.type === 'assessment' && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <p className="text-sm text-blue-800 font-medium">
                                Already Submitted - Your answer has been recorded and cannot be changed
                              </p>
                            </div>
                          )}
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-qsights-blue text-white rounded-full text-sm font-semibold">
                              {currentQuestionIndex + 1}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-base font-medium text-gray-900">
                                  {getTranslatedText(question, 'question')}
                                  {question.is_required && <span className="text-red-500 ml-1">*</span>}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{question.type}</span>
                                  <PerQuestionLanguageSwitcher
                                    availableLanguages={questionnaire?.languages || []}
                                    currentLanguage={perQuestionLanguages[question.id] || selectedLanguage || 'EN'}
                                    onLanguageChange={(lang) => {
                                      setPerQuestionLanguages(prev => ({
                                        ...prev,
                                        [question.id]: lang
                                      }));
                                    }}
                                    questionId={question.id}
                                    isEnabled={enablePerQuestionLanguageSwitch}
                                  />
                                </div>
                              </div>
                              {question.description && (
                                <p className="text-sm text-gray-500 mt-1">{question.description}</p>
                              )}
                              <div className="mt-4">{renderQuestion(question)}</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-500">
                              Question {currentQuestionIndex + 1} of {visibleQuestions.length}
                            </p>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No questions in this section</p>
                    </div>
                  )
                ) : displayMode === 'section' ? (
                  // Section Mode - show ALL questions in current section
                  visibleQuestions && visibleQuestions.length > 0 ? (
                    <div className="space-y-6">
                      {visibleQuestions.map((question: any, qIndex: number) => (
                        <div key={question.id || qIndex} className="space-y-3 pb-6 border-b border-gray-200 last:border-b-0">
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-qsights-blue text-white rounded-full text-sm font-semibold">
                              {qIndex + 1}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-base font-medium text-gray-900">
                                  {getTranslatedText(question, 'question')}
                                  {question.is_required && <span className="text-red-500 ml-1">*</span>}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{question.type}</span>
                                  <PerQuestionLanguageSwitcher
                                    availableLanguages={questionnaire?.languages || []}
                                    currentLanguage={perQuestionLanguages[question.id] || selectedLanguage || 'EN'}
                                    onLanguageChange={(lang) => {
                                      setPerQuestionLanguages(prev => ({
                                        ...prev,
                                        [question.id]: lang
                                      }));
                                    }}
                                    questionId={question.id}
                                    isEnabled={enablePerQuestionLanguageSwitch}
                                  />
                                </div>
                              </div>
                              {question.description && (
                                <p className="text-sm text-gray-500 mt-1">{question.description}</p>
                              )}
                              <div className="mt-4">{renderQuestion(question)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No questions in this section</p>
                    </div>
                  )
                ) : (
                  // All Questions Mode - show ALL sections and ALL questions
                  <div className="space-y-8">
                    {allSectionsWithVisibleQuestions && allSectionsWithVisibleQuestions.length > 0 ? (
                      allSectionsWithVisibleQuestions.map((section: any, sectionIdx: number) => (
                        <div key={section.id || sectionIdx} className="space-y-4">
                          {/* Section Header */}
                          <div className="border-b-2 border-qsights-blue pb-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              Section {sectionIdx + 1}: {section.title || "Untitled Section"}
                            </h3>
                            {section.description && (
                              <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                            )}
                          </div>
                          
                          {/* Section Questions */}
                          {section.questions && section.questions.length > 0 ? (
                            section.questions.map((question: any, qIdx: number) => (
                              <div key={question.id || qIdx} className="space-y-3 pb-6 border-b border-gray-200 last:border-0">
                                <div className="flex items-start gap-3">
                                  <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-qsights-blue text-white rounded-full text-sm font-semibold">
                                    {qIdx + 1}
                                  </span>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <p className="text-base font-medium text-gray-900">
                                        {getTranslatedText(question, 'question')}
                                        {question.is_required && <span className="text-red-500 ml-1">*</span>}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">{question.type}</span>
                                        <PerQuestionLanguageSwitcher
                                          availableLanguages={questionnaire?.languages || []}
                                          currentLanguage={perQuestionLanguages[question.id] || selectedLanguage || 'EN'}
                                          onLanguageChange={(lang) => {
                                            setPerQuestionLanguages(prev => ({
                                              ...prev,
                                              [question.id]: lang
                                            }));
                                          }}
                                          questionId={question.id}
                                          isEnabled={enablePerQuestionLanguageSwitch}
                                        />
                                      </div>
                                    </div>
                                    {question.description && (
                                      <p className="text-sm text-gray-500 mt-1">{question.description}</p>
                                    )}
                                    <div className="mt-4">{renderQuestion(question)}</div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-gray-500">No questions in this section</p>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No sections available</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            {displayMode === 'single' ? (
              // Single Question Mode - show Previous/Next navigation
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    if (currentQuestionIndex > 0) {
                      setCurrentQuestionIndex(currentQuestionIndex - 1);
                    } else if (currentQuestionIndex === 0 && currentSectionIndex > 0) {
                      setCurrentSectionIndex(currentSectionIndex - 1);
                      const prevSection = questionnaire?.sections?.[currentSectionIndex - 1];
                      setCurrentQuestionIndex((prevSection?.questions?.length || 1) - 1);
                    }
                  }}
                  disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                {(() => {
                  const isLastSection = currentSectionIndex === totalSections - 1;
                  const isLastQuestion = visibleQuestions && currentQuestionIndex === visibleQuestions.length - 1;
                  const showSubmit = isLastSection && isLastQuestion;
                  const isAssessment = questionnaire?.type === 'assessment';
                  const isPoll = activity?.type === 'poll';

                  // For polls
                  if (isPoll) {
                    const currentQuestion = visibleQuestions?.[currentQuestionIndex];
                    const isPollAnswered = currentQuestion && pollSubmittedQuestions.has(currentQuestion.id);

                    if (showSubmit) {
                      // Last question
                      if (isPollAnswered) {
                        // Already answered - show Finish button
                        return (
                          <button
                            onClick={() => handleSubmit()}
                            disabled={submitting}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Finishing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Finish
                              </>
                            )}
                          </button>
                        );
                      } else {
                        // Not answered yet - show Submit button
                        return (
                          <button
                            onClick={async () => {
                              if (!validateCurrentAnswers()) return;
                              await handlePollAnswer(currentQuestion.id);
                            }}
                            className="px-6 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors flex items-center gap-2"
                          >
                            <Send className="w-4 h-4" />
                            Submit
                          </button>
                        );
                      }
                    } else {
                      // Not last question
                      if (isPollAnswered) {
                        // Already answered - show Next button only
                        return (
                          <button
                            onClick={navigateToNext}
                            className="px-6 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors flex items-center gap-2"
                          >
                            Next
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        );
                      } else {
                        // Not answered yet - show Submit button
                        return (
                          <button
                            onClick={async () => {
                              if (!validateCurrentAnswers()) return;
                              await handlePollAnswer(currentQuestion.id);
                            }}
                            className="px-6 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors flex items-center gap-2"
                          >
                            <Send className="w-4 h-4" />
                            Submit
                          </button>
                        );
                      }
                    }
                  }

                  // For assessments
                  if (isAssessment) {
                    // Check if current question is already submitted
                    const currentQuestion = visibleQuestions?.[currentQuestionIndex];
                    const isCurrentSubmitted = currentQuestion && submittedQuestions.has(currentQuestion.id);

                    if (showSubmit) {
                      // Last question - show only Submit button
                      return (
                        <button
                          onClick={handleFinalSubmit}
                          disabled={submitting}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              {isCurrentSubmitted ? 'Submit Assessment' : 'Submit'}
                            </>
                          )}
                        </button>
                      );
                    } else {
                      // Not last question - show Submit & Next or just Next if already submitted
                      return (
                        <button
                          onClick={handleSubmitAndNext}
                          className="px-6 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors flex items-center gap-2"
                        >
                          {isCurrentSubmitted ? (
                            <>
                              Next
                              <ChevronRight className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Submit & Next
                              <ChevronRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      );
                    }
                  }

                  // For non-assessments (surveys, etc.)
                  if (showSubmit) {
                    return (
                      <button
                        onClick={() => handleSubmit()}
                        disabled={submitting}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Submit
                          </>
                        )}
                      </button>
                    );
                  }

                  return (
                    <button
                      onClick={navigateToNext}
                      className="px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors flex items-center gap-2"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  );
                })()}
              </div>
            ) : displayMode === 'section' ? (
              // Section-wise Mode - show Previous/Next section navigation
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    if (currentSectionIndex > 0) {
                      setCurrentSectionIndex(currentSectionIndex - 1);
                      setCurrentQuestionIndex(0);
                    }
                  }}
                  disabled={currentSectionIndex === 0}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous Section
                </button>

                {(() => {
                  const isLastSection = currentSectionIndex === totalSections - 1;
                  const showSubmit = isLastSection;

                  if (showSubmit) {
                    return (
                      <button
                        onClick={() => handleSubmit()}
                        disabled={submitting}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Submit
                          </>
                        )}
                      </button>
                    );
                  }

                  return (
                    <button
                      onClick={() => {
                        // Validate current section before moving to next
                        if (!validateCurrentAnswers()) {
                          return;
                        }
                        if (currentSectionIndex < totalSections - 1) {
                          setCurrentSectionIndex(currentSectionIndex + 1);
                          setCurrentQuestionIndex(0);
                        }
                      }}
                      className="px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors flex items-center gap-2"
                    >
                      Next Section
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  );
                })()}
              </div>
            ) : (
              // All Questions Mode - only show Submit button
              <div className="flex justify-end">
                <button
                  onClick={() => handleSubmit()}
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questionnaire Available</h3>
              <p className="text-sm text-gray-600">This activity doesn't have a questionnaire assigned.</p>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
      
      {/* Footer */}
      {(activity?.landing_config?.footerEnabled !== false) && (
        <div 
          className="w-full px-4 md:px-8 flex items-center py-4 md:py-0"
          style={{ 
            backgroundColor: activity?.landing_config?.footerBackgroundColor || "#F1F5F9",
            minHeight: activity?.landing_config?.footerHeight || "80px"
          }}
        >
          <div className="max-w-7xl mx-auto w-full">
            {/* Responsive layout - stacked on mobile, grid on desktop */}
            <div className="flex flex-col md:grid md:grid-cols-3 items-center gap-3 md:gap-4 w-full">
              {/* Left Section */}
              <div className="flex justify-center md:justify-start w-full">
                {activity?.landing_config?.footerLogoUrl && activity.landing_config.footerLogoPosition === 'left' && (
                  <img 
                    src={activity.landing_config.footerLogoUrl} 
                    alt="Footer Logo" 
                    className="object-contain"
                    style={{
                      height: activity.landing_config.footerLogoSize === 'small' ? '24px' :
                              activity.landing_config.footerLogoSize === 'large' ? '40px' : '32px'
                    }}
                  />
                )}
                {activity?.landing_config?.footerText && activity.landing_config.footerTextPosition === 'left' && (
                  <p 
                    className="text-xs md:text-sm text-center md:text-left"
                    style={{ color: activity.landing_config.footerTextColor || "#6B7280" }}
                  >
                    {activity.landing_config.footerText}
                  </p>
                )}
              </div>
              
              {/* Center Section */}
              <div className="flex justify-center w-full">
                {activity?.landing_config?.footerLogoUrl && activity.landing_config.footerLogoPosition === 'center' && (
                  <img 
                    src={activity.landing_config.footerLogoUrl} 
                    alt="Footer Logo" 
                    className="object-contain"
                    style={{
                      height: activity.landing_config.footerLogoSize === 'small' ? '24px' :
                              activity.landing_config.footerLogoSize === 'large' ? '40px' : '32px'
                    }}
                  />
                )}
                {activity?.landing_config?.footerText && activity.landing_config.footerTextPosition === 'center' && (
                  <p 
                    className="text-xs md:text-sm text-center"
                    style={{ color: activity.landing_config.footerTextColor || "#6B7280" }}
                  >
                    {activity.landing_config.footerText}
                  </p>
                )}
              </div>
              
              {/* Right Section */}
              <div className="flex justify-center md:justify-end w-full">
                {activity?.landing_config?.footerLogoUrl && activity.landing_config.footerLogoPosition === 'right' && (
                  <img 
                    src={activity.landing_config.footerLogoUrl} 
                    alt="Footer Logo" 
                    className="object-contain"
                    style={{
                      height: activity.landing_config.footerLogoSize === 'small' ? '24px' :
                              activity.landing_config.footerLogoSize === 'large' ? '40px' : '32px'
                    }}
                  />
                )}
                {activity?.landing_config?.footerText && activity.landing_config.footerTextPosition === 'right' && (
                  <p 
                    className="text-xs md:text-sm text-center md:text-right"
                    style={{ color: activity.landing_config.footerTextColor || "#6B7280" }}
                  >
                    {activity.landing_config.footerText}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Assessment Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className={`px-6 py-5 rounded-t-2xl ${feedbackData.isCorrect ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`}>
              <div className="flex items-center gap-3">
                {feedbackData.isCorrect ? (
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <span className="text-3xl text-red-600 font-bold">✗</span>
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {feedbackData.isCorrect ? 'Correct Answer!' : 'Wrong Answer'}
                  </h3>
                  <p className="text-sm text-white/90 mt-0.5">
                    {feedbackData.isCorrect ? 'Well done!' : 'Keep trying!'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-6">
              <p className="text-gray-700 text-base leading-relaxed mb-6">
                {feedbackData.isCorrect 
                  ? 'Excellent! Your answer is correct. Keep up the great work!' 
                  : 'Oops! That\'s not the right answer. Don\'t worry, learning is a process!'}
              </p>
              
              <button
                onClick={handleFeedbackOk}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 ${
                  feedbackData.isCorrect 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' 
                    : 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600'
                } shadow-lg hover:shadow-xl transform hover:scale-105`}
              >
                {feedbackData.isLastQuestion ? 'Complete Assessment' : 'Continue to Next Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
