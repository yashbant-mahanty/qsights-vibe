"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  MessageCircle,
  Bell,
  BellRing,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { filterQuestionsByLogic } from "@/utils/conditionalLogicEvaluator";
import EventContactModal from "@/components/EventContactModal";
import { getFooterHtml, getFooterHyperlinksFromConfig } from "@/lib/footerUtils";
import { generatedLinksApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  SliderScale,
  DialGauge,
  LikertVisual,
  NPSScale,
  StarRating,
  DragDropBucket,
  DEFAULT_SETTINGS,
  getDefaultLabelsForScale,
} from "@/components/questions";
import { createAnswerPayload } from "@/lib/valueDisplayUtils";
import { getPresignedUrl, isS3Url, isPresignedUrl } from '@/lib/s3Utils';
import VideoPlayer from "@/components/VideoPlayer";
import VideoPlayerWithTracking from "@/components/VideoPlayerWithTracking";
import { ReferencesDisplay } from "@/components/ui/references-display";

interface FormField {
  id: string;
  type: "text" | "email" | "phone" | "number" | "date" | "textarea" | "select" | "address" | "organization" | "country";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  order: number;
  isMandatory?: boolean;
}

// Complete list of all countries for the Country field dropdown
const ALL_COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini (fmr. Swaziland)", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Holy See", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait",
  "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (Burma)", "Namibia", "Nauru",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman",
  "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
  "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela",
  "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

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
  contact_us_enabled?: boolean;
  allow_participant_reminders?: boolean;
  landing_config?: {
    logoUrl?: string;
    logoSize?: string;
    pageTitle?: string;
    pageTitleColor?: string;
    bannerTitle?: string;
    bannerTitleColor?: string;
    bannerTitleSize?: string;
    bannerTitlePosition?: string;
    bannerBackgroundColor?: string;
    bannerText?: string;
    bannerTextColor?: string;
    bannerImageUrl?: string;
    bannerHeight?: string;
    bannerTextPosition?: string;
    bannerImagePosition?: string;
    bannerShowOnInnerPages?: boolean;
    bannerEnabled?: boolean;
    backgroundColor?: string;
    backgroundImageUrl?: string;
    backgroundStyle?: string;
    gradientFrom?: string;
    gradientTo?: string;
    backgroundImageOpacity?: number;
    contentHeaderType?: string;
    contentHeaderLogoUrl?: string;
    contentHeaderLogoSize?: string;
    contentHeaderBackgroundStyle?: string;
    contentHeaderBackgroundColor?: string;
    contentHeaderGradientFrom?: string;
    contentHeaderGradientTo?: string;
    contentHeaderCustomTitle?: string;
    contentHeaderCustomSubtitle?: string;
    // Content Header Display Controls
    hideContentHeader?: boolean;
    showContentHeaderTitle?: boolean;
    showContentHeaderStartDate?: boolean;
    showContentHeaderEndDate?: boolean;
    showContentHeaderQuestions?: boolean;
    footerText?: string;
    footerTextColor?: string;
    footerBackgroundColor?: string;
    footerHeight?: string;
    footerEnabled?: boolean;
    footerLogoUrl?: string;
    footerLogoPosition?: string;
    footerLogoSize?: string;
    footerTextPosition?: string;
    footerHyperlinks?: Array<{ text: string; url: string; target: '_blank' | '_self' }>;
    logoPosition?: string;
    leftContentEnabled?: boolean;
    leftContentTitle?: string;
    leftContentTitleColor?: string;
    leftContentDescription?: string;
    leftContentDescriptionColor?: string;
    leftContentImageUrl?: string;
    leftContentImagePosition?: string;
    leftContentBackgroundColor?: string;
    splitScreenLeftBackgroundImageUrl?: string;
    splitScreenLeftBackgroundPosition?: string;
    splitScreenLeftBackgroundVerticalPosition?: string;
    splitScreenLeftBackgroundOpacity?: number;
    splitScreenLeftBackgroundColor?: string;
    splitScreenRightBackgroundImageUrl?: string;
    splitScreenRightBackgroundOpacity?: number;
    splitScreenRightBackgroundColor?: string;
    fullPageBackgroundImageUrl?: string;
    fullPageBackgroundOpacity?: number;
    fullPageBackgroundColor?: string;
    activityCardHeaderColor?: string;
    loginBoxBannerLogoUrl?: string;
    loginButtonColor?: string;
    loginBoxAlignment?: string;
    loginBoxContentType?: string;
    loginBoxLogoUrl?: string;
    loginBoxLogoHorizontalPosition?: string;
    loginBoxLogoVerticalPosition?: string;
    loginBoxCustomTitle?: string;
    loginBoxCustomSubtitle?: string;
    // Thank You Page Settings
    thankYouTitle?: string;
    thankYouMessage?: string;
    thankYouSubMessage?: string;
    thankYouIconColor?: string;
    thankYouShowConfirmation?: boolean;
    thankYouShowBanner?: boolean;
    thankYouShowFooter?: boolean;
    [key: string]: any;
  };
}

interface Questionnaire {
  id: string;
  title: string;
  type?: string;
  languages?: string[];
  settings?: {
    show_header_in_participant_view?: boolean;
    custom_header_text?: string;
    show_section_header?: boolean;
    section_header_format?: 'numbered' | 'titleOnly';
    [key: string]: any;
  };
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
  
  
  // URL parameters - handle both encrypted link tokens (from Copy Event Links) and legacy parameters
  const urlToken = searchParams.get("token"); // Can be encrypted link token OR participant access token
  const legacyType = searchParams.get("type"); // Legacy: 'registration'
  const legacyPreview = searchParams.get("preview") === "true"; // Legacy preview mode
  const legacyMode = searchParams.get("mode"); // Legacy: 'anonymous'
  const submittedParam = searchParams.get("submitted") === "true"; // Coming back from post-submission registration
  
  // State for decrypted link token data
  const [tokenDecrypted, setTokenDecrypted] = useState(false);
  const [tokenLinkType, setTokenLinkType] = useState<string | null>(null);
  
  // State for generated link token and tag
  const [generatedLinkToken, setGeneratedLinkToken] = useState<string | null>(null);
  const [generatedLinkTag, setGeneratedLinkTag] = useState<string | null>(null);
  const [generatedLinkType, setGeneratedLinkType] = useState<string | null>(null); // 'registration' or 'anonymous'
  const [generatedLinkValidated, setGeneratedLinkValidated] = useState(false);
  
  // Ref to prevent duplicate welcome toasts (React Strict Mode can trigger effects twice)
  const hasShownWelcomeToast = useRef(false);
  
  // Determine if this is an encrypted link token (from Copy Event Links)
  // Encrypted tokens are VERY long (>100 chars), access tokens are shorter (typically 64 chars)
  const isEncryptedLinkToken = urlToken && urlToken.length > 100;
  
  // Validate encrypted link token AND generated link token on mount
  useEffect(() => {
    // First, check if the token parameter might be a generated link token
    // Generated link tokens are 64 characters and use the 'token' parameter
    const potentialGeneratedLinkToken = urlToken && !isEncryptedLinkToken ? urlToken : searchParams.get("gltoken");
    
    if (potentialGeneratedLinkToken && !generatedLinkValidated) {
      const validateGeneratedLink = async () => {
        try {
          console.log('[Generated Link] Validating token:', potentialGeneratedLinkToken.substring(0, 20) + '...');
          const result = await generatedLinksApi.validateToken(potentialGeneratedLinkToken);
          
          if (result.valid && result.data) {
            setGeneratedLinkToken(potentialGeneratedLinkToken);
            setGeneratedLinkTag(result.data.tag);
            setGeneratedLinkType(result.data.link_type); // 'registration' or 'anonymous'
            // Store tag in localStorage for post-submission flow
            localStorage.setItem(`generated_link_tag_${activityId}`, result.data.tag);
            console.log('[Generated Link] Token validated successfully, tag:', result.data.tag, 'type:', result.data.link_type);
          } else {
            console.log('[Generated Link] Not a valid generated link token, may be participant access token');
          }
        } catch (error) {
          console.log('[Generated Link] Not a generated link token or validation failed, treating as access token');
        } finally {
          setGeneratedLinkValidated(true);
        }
      };
      validateGeneratedLink();
    } else {
      setGeneratedLinkValidated(true);
    }
    
    // Validate encrypted link token (existing logic)
    if (isEncryptedLinkToken && !tokenDecrypted) {
      const validateLinkToken = async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/activities/validate-link-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: urlToken }),
          });
          
          if (response.ok) {
            const data = await response.json();
            setTokenLinkType(data.type); // 'registration', 'preview', or 'anonymous'
            console.log('Encrypted link token validated:', data.type);
          }
        } catch (error) {
          console.error('Link token validation failed:', error);
        }
        setTokenDecrypted(true);
      };
      
      validateLinkToken();
    } else {
      setTokenDecrypted(true);
    }
  }, [isEncryptedLinkToken, urlToken, tokenDecrypted, searchParams, activityId, generatedLinkValidated]);
  
  // Determine link type (encrypted token takes precedence over legacy params)
  const linkType = tokenLinkType || legacyType;
  const isPreview = tokenLinkType === 'preview' || legacyPreview;
  // Check for anonymous mode from generated link or legacy params
  const mode = generatedLinkType === 'anonymous' ? 'anonymous' : (tokenLinkType === 'anonymous' ? 'anonymous' : legacyMode);
  
  // Access token (for participant validation) - only use non-encrypted tokens AND only if not a generated link
  const token = !isEncryptedLinkToken && !generatedLinkToken ? urlToken : null;
  
  // Set initial form/start state based on link type
  // Anonymous generated links should skip registration
  const isAnonymous = mode === "anonymous" || generatedLinkType === "anonymous";
  const isRegistration = linkType === "registration" || (!isPreview && !isAnonymous && !token && !generatedLinkToken);
  
  // Get current user for preview mode
  const { currentUser } = useAuth();
  
  const [activity, setActivity] = useState<Activity | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true); // ALWAYS show form initially - even with token
  const [started, setStarted] = useState(false); // Start only after user clicks button
  const [submitted, setSubmitted] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

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
  const [questionComments, setQuestionComments] = useState<Record<string, string>>({});

  // Compute filtered sections with conditional logic applied
  const allFilteredSections = useMemo(() => {
    console.log('[PAGE] allFilteredSections useMemo running, questionnaire:', !!questionnaire);
    if (!questionnaire?.sections) return [];
    
    const allQuestions = questionnaire.sections.flatMap((s: any) => 
      (s.questions || []).map((q: any) => ({
        ...q,
        conditionalLogic: q.conditionalLogic || q.settings?.conditionalLogic || null
      }))
    );
    
    return questionnaire.sections.map((section: any) => {
      const transformedQuestions = (section.questions || []).map((q: any) => ({
        ...q,
        conditionalLogic: q.conditionalLogic || q.settings?.conditionalLogic || null
      }));
      const filtered = filterQuestionsByLogic(transformedQuestions, responses, allQuestions);
      console.log('[PAGE] Section filtered:', section.title, 'from', section.questions?.length, 'to', filtered.length);
      return {
        ...section,
        questions: filtered
      };
    });
  }, [questionnaire?.sections, responses]);

  // Get filtered questions for the current section
  const currentSectionFiltered = useMemo(() => {
    const section = allFilteredSections[currentSectionIndex];
    return section?.questions || [];
  }, [allFilteredSections, currentSectionIndex]);
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
  
  // Post-submission registration flow state
  const [isPostSubmissionFlow, setIsPostSubmissionFlow] = useState(false);
  const [tempSessionToken, setTempSessionToken] = useState<string | null>(null);
  const [showRegistrationAfterSubmit, setShowRegistrationAfterSubmit] = useState(false);
  
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

  // Presigned URL state for Content Header logo
  const [presignedContentHeaderLogoUrl, setPresignedContentHeaderLogoUrl] = useState<string | null>(null);
  // Presigned URL state for banner and logo images
  const [presignedBannerUrl, setPresignedBannerUrl] = useState<string | null>(null);
  const [presignedLogoUrl, setPresignedLogoUrl] = useState<string | null>(null);
  // Presigned URL state for footer logo
  const [presignedFooterLogoUrl, setPresignedFooterLogoUrl] = useState<string | null>(null);

  // Video intro state
  const [videoIntro, setVideoIntro] = useState<any>(null);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [videoWatchTime, setVideoWatchTime] = useState(0);
  const [showVideoIntro, setShowVideoIntro] = useState(false);
  const [existingWatchLog, setExistingWatchLog] = useState<any>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumePosition, setResumePosition] = useState(0);

  // Add to Calendar handler
  const handleAddToCalendar = () => {
    if (!activity) return;
    
    const formatDateForGoogle = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const title = encodeURIComponent(activity.name);
    const description = encodeURIComponent(activity.description || '');
    const startDate = activity.start_date ? formatDateForGoogle(activity.start_date) : '';
    const endDate = activity.end_date ? formatDateForGoogle(activity.end_date) : '';
    
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${description}&dates=${startDate}/${endDate}`;
    
    window.open(calendarUrl, '_blank');
  };

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
      formattedQuestion: question.formattedQuestion,
      isRichText: question.isRichText,
      fullQuestion: question
    });
    
    // If English or no translation exists, return original
    if (lang === 'EN' || !question.translations || Object.keys(question.translations).length === 0 || !question.translations[lang]) {
      if (field === 'question') {
        // Prioritize formattedQuestion for rich text content (contains HTML formatting)
        const result = question.formattedQuestion || question.settings?.formattedQuestion || question.title || question.question || question.text || '';
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
      // For translations, also prioritize formattedQuestion if available
      const result = translation.formattedQuestion || translation.question || translation.title || question.formattedQuestion || question.settings?.formattedQuestion || question.title || question.question || question.text || '';
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

  // Component to display question images with presigned URL support
  const QuestionImage = ({ imageUrl }: { imageUrl: string }) => {
    const [presignedUrl, setPresignedUrl] = React.useState<string>(imageUrl);
    const [imageError, setImageError] = React.useState(false);

    React.useEffect(() => {
      const loadPresignedUrl = async () => {
        if (!imageUrl) {
          setPresignedUrl('');
          return;
        }
        if (isPresignedUrl(imageUrl) || !isS3Url(imageUrl)) {
          setPresignedUrl(imageUrl);
          return;
        }
        try {
          const signed = await getPresignedUrl(imageUrl);
          setPresignedUrl(signed || imageUrl);
        } catch (error) {
          console.error('Failed to get presigned URL:', error);
          setPresignedUrl(imageUrl);
        }
      };
      loadPresignedUrl();
    }, [imageUrl]);

    if (!presignedUrl || imageError) return null;

    return (
      <div className="mt-3 mb-4">
        <img
          src={presignedUrl}
          alt="Question Image"
          className="w-full h-auto object-contain rounded-lg border border-gray-200"
          style={{ maxHeight: '300px' }}
          onError={() => setImageError(true)}
        />
      </div>
    );
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
    
    // If there's a token, DON'T restore session - wait for token validation to decide what to show
    if (token) {
      console.log('Token present - clearing any existing session, waiting for token validation');
      localStorage.removeItem(`activity_${activityId}_session`);
      localStorage.removeItem(`activity_${activityId}_start_time`);
      sessionStorage.removeItem(`activity_${activityId}_session`);
      sessionStorage.removeItem(`activity_${activityId}_start_time`);
      // DON'T set showForm here - let token validation decide
      // setShowForm(true);
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

  // Handle post-submission registration redirect
  useEffect(() => {
    if (submittedParam) {
      setSubmitted(true);
      setShowForm(false);
      setStarted(false);
    }
  }, [submittedParam]);

  // Validate token if present - but wait for generated link validation to complete first
  // This prevents the access token validation from running when URL has a generated link token
  useEffect(() => {
    // Wait for generated link validation to complete first
    if (!generatedLinkValidated) return;
    
    // Skip if it was validated as a generated link token
    if (generatedLinkToken) return;
    
    // Now validate as access token if present
    if (token && !tokenValidated && !tokenValidating) {
      validateAccessToken();
    }
  }, [token, generatedLinkValidated, generatedLinkToken, tokenValidated, tokenValidating]);

  // Handle anonymous generated links - auto-start questionnaire when validated
  useEffect(() => {
    if (generatedLinkValidated && generatedLinkType === 'anonymous' && activity && !started && !submitted) {
      console.log('[Anonymous Generated Link] Auto-starting questionnaire');
      
      // Create anonymous participant
      const anonymousParticipantId = `anon_${generatedLinkTag || 'unknown'}_${Date.now()}`;
      setParticipantId(anonymousParticipantId);
      setParticipantData({ anonymous: true, generated_link_tag: generatedLinkTag });
      
      // Set start time
      const now = Date.now();
      setStartTime(now);
      
      // Skip form and start directly
      setShowForm(false);
      setStarted(true);
      
      // Set default language if not multilingual or single language
      if (!activity.is_multilingual) {
        setSelectedLanguage('EN');
      } else if (activity.languages && activity.languages.length === 1) {
        setSelectedLanguage(activity.languages[0]);
      }
      
      // Show welcome toast only once (prevent duplicate from React Strict Mode)
      if (!hasShownWelcomeToast.current) {
        hasShownWelcomeToast.current = true;
        toast({
          title: "Welcome!",
          description: "Starting your activity now...",
          variant: "success",
          duration: 2000
        });
      }
    }
  }, [generatedLinkValidated, generatedLinkType, activity, started, submitted, generatedLinkTag]);

  // Presign Content Header logo URL when activity loads
  useEffect(() => {
    const presignContentHeaderLogo = async () => {
      const logoUrl = activity?.landing_config?.contentHeaderLogoUrl;
      if (logoUrl && isS3Url(logoUrl) && !isPresignedUrl(logoUrl)) {
        try {
          const presigned = await getPresignedUrl(logoUrl);
          setPresignedContentHeaderLogoUrl(presigned);
        } catch (error) {
          console.error('Failed to presign content header logo URL:', error);
          setPresignedContentHeaderLogoUrl(logoUrl); // Fallback to original URL
        }
      } else if (logoUrl) {
        setPresignedContentHeaderLogoUrl(logoUrl); // Already presigned or not S3
      }
    };
    
    if (activity?.landing_config?.contentHeaderLogoUrl) {
      presignContentHeaderLogo();
    }
  }, [activity?.landing_config?.contentHeaderLogoUrl]);

  // Presign banner image URL when activity loads
  useEffect(() => {
    const presignBannerImage = async () => {
      const bannerUrl = activity?.landing_config?.bannerImageUrl;
      if (bannerUrl && isS3Url(bannerUrl) && !isPresignedUrl(bannerUrl)) {
        try {
          const presigned = await getPresignedUrl(bannerUrl);
          setPresignedBannerUrl(presigned);
        } catch (error) {
          console.error('Failed to presign banner URL:', error);
          setPresignedBannerUrl(bannerUrl);
        }
      } else if (bannerUrl) {
        setPresignedBannerUrl(bannerUrl);
      }
    };
    
    if (activity?.landing_config?.bannerImageUrl) {
      presignBannerImage();
    }
  }, [activity?.landing_config?.bannerImageUrl]);

  // Presign logo URL when activity loads
  useEffect(() => {
    const presignLogoImage = async () => {
      const logoUrl = activity?.landing_config?.logoUrl;
      if (logoUrl && isS3Url(logoUrl) && !isPresignedUrl(logoUrl)) {
        try {
          const presigned = await getPresignedUrl(logoUrl);
          setPresignedLogoUrl(presigned);
        } catch (error) {
          console.error('Failed to presign logo URL:', error);
          setPresignedLogoUrl(logoUrl);
        }
      } else if (logoUrl) {
        setPresignedLogoUrl(logoUrl);
      }
    };
    
    if (activity?.landing_config?.logoUrl) {
      presignLogoImage();
    }
  }, [activity?.landing_config?.logoUrl]);

  // Presign footer logo URL when activity loads
  useEffect(() => {
    const presignFooterLogoImage = async () => {
      const footerLogoUrl = activity?.landing_config?.footerLogoUrl;
      if (footerLogoUrl && isS3Url(footerLogoUrl) && !isPresignedUrl(footerLogoUrl)) {
        try {
          const presigned = await getPresignedUrl(footerLogoUrl);
          setPresignedFooterLogoUrl(presigned);
        } catch (error) {
          console.error('Failed to presign footer logo URL:', error);
          setPresignedFooterLogoUrl(footerLogoUrl);
        }
      } else if (footerLogoUrl) {
        setPresignedFooterLogoUrl(footerLogoUrl);
      }
    };
    
    if (activity?.landing_config?.footerLogoUrl) {
      presignFooterLogoImage();
    }
  }, [activity?.landing_config?.footerLogoUrl]);

  async function validateAccessToken() {
    // Prevent duplicate calls
    if (tokenValidated || tokenValidating) return;
    
    setTokenValidating(true);
    
    try {
      const response = await fetch(`/api/public/access-tokens/${token}/validate`);
      const data = await response.json();

      console.log('[TOKEN VALIDATION] Response:', { valid: data.valid, already_completed: data.already_completed, status: response.status });

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
        setTokenError('invalid'); // Mark as processed (but not blocking)
        setTokenValidated(true); // Mark validation as complete (to exit loading state)
        setTokenValidating(false);
        setShowForm(true);
        
        // Show friendly info message only if NOT a generated link AND haven't shown toast yet
        // (generated links handle their own welcome toast)
        if ((!generatedLinkValidated || !generatedLinkToken) && !hasShownWelcomeToast.current) {
          hasShownWelcomeToast.current = true;
          toast({
            title: "Welcome!",
            description: "Please register to participate in this activity.",
            variant: "success",
            duration: 3000
          });
        }
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
      
      const participantName = data.participant?.name || data.data?.participant?.name || 'there';
      const needsLanguage = activity?.is_multilingual && Array.isArray(activity?.languages) && activity.languages.length > 1;
      
      // Check registration flow to determine behavior
      const registrationFlow = activity?.registration_flow || 'pre_submission';
      const isPostSubmission = registrationFlow === 'post_submission';
      
      // Check if we can auto-skip to questionnaire:
      // 1. Token is validated with name and email from DB
      // 2. No additional registration fields beyond name/email exist
      // 3. Activity is not multilingual OR has only one language
      const formFields = activity?.registration_form_fields || [];
      const hasOnlyDefaultFields = formFields.length === 0 || 
        formFields.every((field: any) => {
          const fieldId = field.id || field.name;
          return ['name', 'full_name', 'email', 'email_address'].includes(fieldId) || field.type === 'email';
        });
      
      const canAutoSkip = hasOnlyDefaultFields && !needsLanguage && nameFromToken && emailFromToken;
      
      if (canAutoSkip || isPostSubmission) {
        // Auto-skip to questionnaire - no additional fields to collect
        // OR it's post-submission flow (questionnaire comes first)
        console.log('Auto-skipping to questionnaire - only default fields and all pre-filled OR post-submission flow');
        
        // For post-submission flow, generate session token
        if (isPostSubmission) {
          const storedToken = localStorage.getItem(`temp_session_${activityId}`);
          const sessionToken = storedToken || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          if (!storedToken) {
            localStorage.setItem(`temp_session_${activityId}`, sessionToken);
          }
          setTempSessionToken(sessionToken);
        }
        
        // Set start time
        const now = Date.now();
        setStartTime(now);
        
        setShowForm(false);
        setStarted(true);
        
        // Show welcome toast only once
        if (!hasShownWelcomeToast.current) {
          hasShownWelcomeToast.current = true;
          toast({
            title: `Welcome, ${participantName}!`,
            description: "Starting your activity now...",
            variant: "success",
            duration: 2000
          });
        }
      } else {
        // Show form to collect additional fields or language selection
        setShowForm(true);
        
        const detailsMessage = needsLanguage
          ? `Hello ${participantName}, please select your language to continue.`
          : `Hello ${participantName}, please complete the additional details below.`;

        // Show welcome toast only once
        if (!hasShownWelcomeToast.current) {
          hasShownWelcomeToast.current = true;
          toast({
            title: "Welcome!",
            description: detailsMessage,
            variant: "success",
            duration: 3000
          });
        }
      }
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

      // Check if this activity uses post-submission registration flow
      const registrationFlow = activityData.data.registration_flow || 'pre_submission';
      console.log('[LOAD] Registration flow:', registrationFlow, 'Activity data:', activityData.data.registration_flow);
      setIsPostSubmissionFlow(registrationFlow === 'post_submission');
      
      // For post-submission flow, skip registration form initially and show questionnaire first
      // This applies to ALL modes: regular, preview, anonymous, and token-based access
      // BUT: Don't reset state if user has already submitted (prevents infinite loop after submission)
      // ALSO: If token exists but hasn't been validated yet, wait for validation before starting
      const hasUnvalidatedToken = token && !tokenValidated && !tokenValidating;
      
      if (registrationFlow === 'post_submission' && !submitted && !submittedParam && !hasUnvalidatedToken) {
        setShowForm(false);
        setStarted(true);
        
        // Generate or retrieve session token from localStorage
        const storedToken = localStorage.getItem(`temp_session_${activityId}`);
        const sessionToken = storedToken || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        if (!storedToken) {
          localStorage.setItem(`temp_session_${activityId}`, sessionToken);
        }
        setTempSessionToken(sessionToken);
        
        // Set start time
        const now = Date.now();
        setStartTime(now);
      }

      // Use questionnaire data from activity response (already eager loaded)
      if (activityData.data.questionnaire) {
        console.log('Loaded questionnaire:', activityData.data.questionnaire);
        setQuestionnaire(activityData.data.questionnaire);
        
        // Fetch video intro for this questionnaire (use public endpoint - no auth required)
        try {
          const videoResponse = await fetch(`/api/public/videos/questionnaire/${activityData.data.questionnaire.id}`);
          if (videoResponse.ok) {
            const videoData = await videoResponse.json();
            if (videoData.data) {
              console.log('Loaded video intro:', videoData.data);
              setVideoIntro(videoData.data);
              // Video intro will be shown after registration/form, before questionnaire starts
            }
          }
        } catch (videoErr) {
          console.log('No video intro found or error loading:', videoErr);
          // Not a critical error, continue without video
        }
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
      
      // Check if video intro exists - show it before starting questionnaire
      if (videoIntro) {
        console.log('[Preview Mode] Video intro found, showing video screen first');
        setShowForm(false);
        setShowVideoIntro(true);
        setStarted(false);
        toast({ 
          title: "Preview Mode", 
          description: "Testing only - No data will be saved or counted in reports", 
          variant: "warning",
          duration: 3000
        });
      } else {
        setShowForm(false);
        setStarted(true);
        toast({ 
          title: "Preview Mode", 
          description: "Testing only - No data will be saved or counted in reports", 
          variant: "warning",
          duration: 3000
        });
      }
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
        
        // Check if video intro exists - show it before starting questionnaire
        if (videoIntro) {
          console.log('[Anonymous Mode] Video intro found, showing video screen first');
          setShowForm(false);
          setShowVideoIntro(true);
          setStarted(false);
          toast({ 
            title: "Anonymous Access", 
            description: "Your responses will be saved anonymously", 
            variant: "success",
            duration: 2000
          });
        } else {
          setShowForm(false);
          setStarted(true);
          toast({ 
            title: "Anonymous Access", 
            description: "Your responses will be saved anonymously", 
            variant: "success",
            duration: 2000
          });
        }
        
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
      { id: "email", type: "email", label: "Communication Email ID", required: true, order: 1, isMandatory: true },
    ];

    // Check required fields (only for registration mode)
    // Skip validation for pre-filled fields when token is validated
    for (const field of formFields) {
      if (field.required || field.isMandatory) {
        const fieldKey = field.id || (field as any).name || 'unknown';
        
        // Skip validation for default fields (name/email) if token is validated and data is pre-filled
        const isDefaultField = ['name', 'full_name', 'email', 'email_address'].includes(fieldKey) || field.type === 'email';
        if (token && tokenValidated && isDefaultField && participantData[fieldKey]) {
          continue; // Skip - already pre-filled from token
        }
        
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
      
      // POST-SUBMISSION FLOW: Link temporary submission after registration
      if (showRegistrationAfterSubmit && tempSessionToken) {
        console.log('[POST-SUBMIT REG] Starting link and final submission...');
        try {
          const linkResponse = await fetch(`/api/public/activities/${activityId}/temporary-submissions/link`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              session_token: tempSessionToken,
              participant_id: participantIdValue,
            }),
          });

          if (!linkResponse.ok) {
            throw new Error("Failed to link temporary submission");
          }

          const linkData = await linkResponse.json();
          console.log('[POST-SUBMIT REG] Linked successfully, submitting final response...');
          
          // Now submit the final response
          const submitPayload = {
            participant_id: participantIdValue,
            answers: linkData.data.responses,
            started_at: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
            is_preview: false,
            ...(generatedLinkToken && { token: generatedLinkToken }), // Include generated link token for status update
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
            throw new Error("Failed to submit final response");
          }

          console.log('[POST-SUBMIT REG] Final submission successful, showing thank you page');
          
          // Clean up temporary data
          localStorage.removeItem(`temp_session_${activityId}`);
          localStorage.removeItem(`temp_responses_${activityId}`);
          
          // Show thank you page
          setSubmitted(true);
          setShowForm(false);
          setStarted(false); // Important: Don't start the activity
          setShowRegistrationAfterSubmit(false); // Reset flag
          
          toast({
            title: "Success!",
            description: "Your response has been submitted successfully",
            variant: "success"
          });
          
          setSubmitting(false);
          return;
        } catch (err) {
          console.error("Failed to complete post-submission registration:", err);
          toast({
            title: "Error",
            description: "Failed to complete submission. Please try again.",
            variant: "error"
          });
          setSubmitting(false);
          return;
        }
      }
      
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
      
      // Check if video intro exists - show it before starting questionnaire
      if (videoIntro) {
        console.log('Video intro found, showing video screen first');
        console.log('[VIDEO INTRO DEBUG] Setting states: showForm=false, showVideoIntro=true, started=false');
        setShowForm(false);
        setShowVideoIntro(true); // Show video intro screen
        setStarted(false); // Don't start questionnaire yet
        console.log('[VIDEO INTRO DEBUG] States set - expecting video intro screen on next render');
      } else {
        console.log('[VIDEO INTRO DEBUG] No video intro, starting questionnaire directly');
        setShowForm(false);
        setStarted(true); // No video, start questionnaire directly
      }
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

  // Handle video intro completion
  const handleVideoComplete = () => {
    console.log('[Video Intro] Video marked as completed, can start questionnaire');
    setVideoCompleted(true);
  };

  // Handle video watch time update
  const handleVideoTimeUpdate = (currentTime: number, duration: number, percentage: number) => {
    setVideoWatchTime(Math.floor(currentTime));
  };

  // Periodic save handler - saves watch progress every 30 seconds
  const handlePeriodicVideoSave = async (currentTime: number, duration: number, percentage: number, completed: boolean) => {
    if (!videoIntro || !questionnaire?.id || !activityId || !participantId) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/videos/log-view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionnaire_id: questionnaire.id,
          video_id: videoIntro.id,
          activity_id: activityId,
          participant_id: participantId,
          participant_email: isPreview && currentUser ? currentUser.email : (participantData.email || 'anonymous'),
          participant_name: isPreview && currentUser ? currentUser.name : (participantData.name || participantData.full_name || 'Anonymous'),
          watch_duration_seconds: Math.floor(currentTime),
          completed: completed,
          completion_percentage: Math.floor(percentage),
        }),
      });
      console.log('[Video Intro] Periodic save successful at', Math.floor(currentTime), 'seconds');
    } catch (err) {
      console.error('[Video Intro] Periodic save failed:', err);
      // Non-blocking - don't show error to user
    }
  };

  // Check for existing watch log on mount (for resume functionality)
  useEffect(() => {
    const checkExistingWatchLog = async () => {
      // CRITICAL: Must have valid participantId (not null/undefined/"" and not "undefined" string)
      if (!videoIntro || !activityId || !participantId || participantId === 'undefined' || !questionnaire?.id) {
        console.log('[Video Intro] Skipping watch-log check - missing required params:', { videoIntro: !!videoIntro, activityId, participantId, questionnaireId: questionnaire?.id });
        return;
      }
      if (showVideoIntro && !showResumeDialog) {
        try {
          console.log('[Video Intro] Checking existing watch log with params:', { video_id: videoIntro.id, activity_id: activityId, participant_id: participantId });
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/videos/watch-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              video_id: videoIntro.id,
              activity_id: activityId,
              participant_id: participantId,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.watch_duration_seconds > 10) {
              // Found existing watch log with >10 seconds watched
              setExistingWatchLog(data.data);
              setResumePosition(data.data.watch_duration_seconds);
              setShowResumeDialog(true);
              console.log('[Video Intro] Found existing watch log, offering resume from', data.data.watch_duration_seconds, 'seconds');
            }
          }
        } catch (err) {
          console.error('[Video Intro] Failed to check existing watch log:', err);
          // Non-blocking - continue without resume option
        }
      }
    };

    checkExistingWatchLog();
  }, [videoIntro, activityId, participantId, questionnaire?.id, showVideoIntro]);

  // Handle resume choice
  const handleResumeVideo = () => {
    setShowResumeDialog(false);
    if (existingWatchLog?.completed) {
      setVideoCompleted(true);
      setVideoWatchTime(existingWatchLog.watch_duration_seconds);
    } else {
      setVideoWatchTime(resumePosition);
    }
  };

  const handleStartOverVideo = () => {
    setShowResumeDialog(false);
    setResumePosition(0);
    setVideoWatchTime(0);
  };

  // Start questionnaire after video intro (log view and start)
  const handleStartAfterVideo = async () => {
    if (videoIntro?.must_watch && !videoCompleted) {
      toast({
        title: "Video Required",
        description: "Please watch the video to at least 90% before starting",
        variant: "warning"
      });
      return;
    }

    // Log video view
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/videos/log-view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionnaire_id: questionnaire?.id,
          video_id: videoIntro.id,
          activity_id: activityId,
          participant_id: participantId,
          participant_email: isPreview && currentUser ? currentUser.email : (participantData.email || 'anonymous'),
          participant_name: isPreview && currentUser ? currentUser.name : (participantData.name || participantData.full_name || 'Anonymous'),
          watch_duration_seconds: videoWatchTime,
          completed: videoCompleted,
          completion_percentage: videoCompleted ? 100 : Math.floor((videoWatchTime / (videoIntro.video_duration_seconds || 1)) * 100),
        }),
      });
      console.log('[Video Intro] View logged successfully');
    } catch (err) {
      console.error('[Video Intro] Failed to log view:', err);
      // Don't block questionnaire start if logging fails
    }

    // Start questionnaire
    console.log('[Video Intro] Starting questionnaire');
    setShowVideoIntro(false);
    setStarted(true);
  };

  // Save progress incrementally to backend
  const saveProgress = async (updatedResponses: Record<string, any>) => {
    if (!participantId || !activityId || isPreview) return;

    try {
      const response = await fetch(`/api/public/activities/${activityId}/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
          answers: updatedResponses,
        }),
      });
      
      // If already submitted (409), redirect to thank you page
      if (response.status === 409) {
        const data = await response.json();
        console.log('Already submitted, redirecting to thank you page');
        setSubmitted(true);
        return;
      }
      
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
      // Validate mandatory video questions first
      if (!autoSubmit) {
        const allSections = questionnaire?.sections || [];
        const allQuestions = allSections.flatMap((section: any) => section.questions || []);
        const videoQuestions = allQuestions.filter((q: any) => q.type === 'video' && q.settings?.isMandatoryWatch);
        
        for (const videoQuestion of videoQuestions) {
          const response = responses[videoQuestion.id];
          if (!response || !response.completed || !response.watchedAtLeast95) {
            toast({
              title: "Video Required",
              description: `Please watch the video "${videoQuestion.title || videoQuestion.question}" to at least 95% completion before submitting.`,
              variant: "warning",
              duration: 5000
            });
            setSubmitting(false);
            return;
          }
        }
      }
      
      // Validate all answers before submitting (unless auto-submit from timer)
      if (!autoSubmit && !validateCurrentAnswers()) {
        setSubmitting(false);
        return;
      }

      setSubmitting(true);

      // Use local variable to track participantId (state updates are async)
      let currentParticipantId = participantId;

      console.log('[SUBMIT] Starting submission...', {
        isPostSubmissionFlow,
        currentParticipantId,
        isPreview,
        isAnonymous,
        tempSessionToken
      });

      // POST-SUBMISSION FLOW: ALWAYS show registration page after questionnaire
      // This applies to ALL modes: regular, preview, anonymous, registration links
      if (isPostSubmissionFlow) {
        console.log('[SUBMIT] POST-SUBMISSION FLOW - Redirecting to registration page');
        try {
          // Save responses to temporary storage
          const tempResponse = await fetch(`/api/public/activities/${activityId}/temporary-submissions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              answers: responses,
              session_token: tempSessionToken,
              is_preview: isPreview,
              is_anonymous: isAnonymous,
            }),
          });

          console.log('[SUBMIT] Temp submission response:', tempResponse.status, tempResponse.ok);

          if (!tempResponse.ok) {
            const errorData = await tempResponse.json().catch(() => ({}));
            console.error('[SUBMIT] Temp submission failed:', errorData);
            throw new Error("Failed to save temporary submission");
          }

          const tempData = await tempResponse.json();
          console.log('[SUBMIT] Temp submission saved:', tempData);
          
          // Store in localStorage
          localStorage.setItem(`temp_session_${activityId}`, tempData.data.session_token);
          localStorage.setItem(`temp_responses_${activityId}`, JSON.stringify(responses));
          
          // Store mode flags for registration page
          if (isPreview) {
            localStorage.setItem(`temp_preview_${activityId}`, 'true');
          }
          if (isAnonymous) {
            localStorage.setItem(`temp_anonymous_${activityId}`, 'true');
          }
          
          // Store participant data from token for registration page (if token was validated)
          if (tokenValidated && participantData && Object.keys(participantData).length > 0) {
            localStorage.setItem(`temp_participant_${activityId}`, JSON.stringify(participantData));
            console.log('[SUBMIT] Stored participant data for registration:', participantData);
          }
          
          // Store access token for registration page to check completion status
          if (token) {
            localStorage.setItem(`temp_token_${activityId}`, token);
          }
          
          // Redirect to registration page
          console.log('[SUBMIT] Redirecting to registration page...');
          router.push(`/activities/register/${activityId}`);
          
          setSubmitting(false);
          return;
        } catch (err) {
          console.error("[SUBMIT] Failed to save temporary submission:", err);
          toast({
            title: "Error",
            description: "Failed to save your responses. Please try again.",
            variant: "error"
          });
          setSubmitting(false);
          return;
        }
      }

      console.log('[SUBMIT] NOT post-submission flow, proceeding with normal submission');

      if (!currentParticipantId) {
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

      // Get generated link tag from state or localStorage (for post-submission flow)
      const linkTag = generatedLinkTag || localStorage.getItem(`generated_link_tag_${activityId}`);
      
      const payload = {
        participant_id: currentParticipantId,
        answers: responses,
        comments: questionComments, // Optional comments per question
        started_at,
        time_expired_at,
        auto_submitted: autoSubmit,
        is_preview: isPreview, // Flag for preview mode
        ...(linkTag && { generated_link_tag: linkTag }), // Include tag if generated link was used
        ...(generatedLinkToken && { token: generatedLinkToken }), // Pass generated link token for status update
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

      // Mark generated link as used after successful submission
      // The response ID can be in data.response.id (from backend) or data.response_id
      const responseId = data.data?.response?.id || data.data?.response_id;
      console.log('[Generated Link] Checking link update:', {
        hasToken: !!generatedLinkToken,
        responseOk: response.ok,
        responseId,
        dataStructure: JSON.stringify(data?.data ? Object.keys(data.data) : 'no data')
      });
      
      if (response.ok && generatedLinkToken && responseId) {
        try {
          console.log('[Generated Link] Marking link as used, response_id:', responseId);
          await generatedLinksApi.markAsUsed(
            generatedLinkToken,
            currentParticipantId,
            responseId
          );
          console.log('[Generated Link] Link marked as used successfully');
          // Clean up localStorage
          localStorage.removeItem(`generated_link_tag_${activityId}`);
        } catch (error) {
          console.error('[Generated Link] Failed to mark link as used:', error);
          // Don't fail the submission if this fails - it's a tracking issue
        }
      } else if (response.ok && generatedLinkToken && !responseId) {
        console.warn('[Generated Link] Token present but no response_id found in response data:', data);
      }
      
      if (!response.ok) {
        // Check if it's a duplicate submission error or retakes exhausted (409 or 422)
        if (response.status === 409 || response.status === 422) {
          // Always treat 409 or 422 as already submitted - redirect to thank you page
          console.log('User already submitted (409/422), redirecting to thank you page');
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
          
          // Redirect to thank you page instead of showing error
          router.push(`/activities/thank-you/${activityId}`);
          return;
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
      // Single question mode - validate current question only
      const currentSection = questionnaire?.sections?.[currentSectionIndex];
      if (!currentSection) return true;
      
      const question = currentSectionFiltered[currentQuestionIndex];
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
      // Section mode - validate all questions in current section
      const currentSection = questionnaire?.sections?.[currentSectionIndex];
      if (!currentSection) return true;
      
      for (const question of currentSectionFiltered) {
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
      // All questions mode - validate all VISIBLE questions (respecting conditional logic)
      if (!allFilteredSections || allFilteredSections.length === 0) return true;
      
      for (const section of allFilteredSections) {
        for (const question of section.questions) {
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
    
    const currentSection = questionnaire.sections?.[currentSectionIndex];
    if (!currentSection) return true;
    
    const question = currentSectionFiltered[currentQuestionIndex];
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
    
    // Get current question ID
    const currentSection = questionnaire.sections?.[currentSectionIndex];
    const currentQuestion = currentSection?.questions[currentQuestionIndex];
    
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

    const currentSection = questionnaire?.sections?.[currentSectionIndex];
    if (currentSection && currentQuestionIndex < currentSectionFiltered.length - 1) {
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
    
    // Get current question ID
    const currentSection = questionnaire.sections?.[currentSectionIndex];
    const currentQuestion = currentSection?.questions[currentQuestionIndex];
    
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

  // Render comment box for questions with is_comment_enabled
  const renderCommentBox = (question: any) => {
    const questionId = question.id;
    const hasResponse = responses[questionId] !== undefined && responses[questionId] !== null && responses[questionId] !== '';
    const isSubmitted = submittedQuestions.has(questionId);
    
    // Only show comment box if:
    // 1. Comment is enabled for this question
    // 2. Question type is supported (mcq, multi, likert, sct_likert, likert_visual)
    // 3. User has answered the question
    const supportedTypes = ['mcq', 'multi', 'single_choice', 'radio', 'multiple_choice', 'multiple_choice_single', 'multiple_choice_multiple', 'checkbox', 'likert', 'sct_likert', 'likert_visual'];
    const isSupported = supportedTypes.includes(question.type);
    
    if (!question.is_comment_enabled || !isSupported || !hasResponse) {
      return null;
    }
    
    return (
      <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">Add a comment (optional)</span>
        </div>
        <textarea
          value={questionComments[questionId] || ''}
          onChange={(e) => {
            const value = e.target.value.slice(0, 1000); // Max 1000 chars
            setQuestionComments(prev => ({
              ...prev,
              [questionId]: value
            }));
          }}
          placeholder="Add your comment (optional)"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          rows={2}
          maxLength={1000}
          disabled={isSubmitted}
        />
        <div className="flex justify-end mt-1">
          <span className="text-xs text-gray-400">{(questionComments[questionId] || '').length}/1000</span>
        </div>
      </div>
    );
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
                        ? "border-qsights-blue bg-qsights-dark text-white"
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
          <div className="w-full max-w-full overflow-hidden">
            <div 
              className="overflow-x-auto pb-2" 
              style={{ 
                WebkitOverflowScrolling: 'touch',
                maxWidth: '100%'
              }}
            >
              <table className="border-collapse w-full" style={{ minWidth: '300px' }}>
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-2 bg-gray-50 text-left text-xs font-medium text-gray-700 w-1/4 min-w-[100px]"></th>
                    {matrixColumns.map((col: any, index: number) => (
                      <th key={index} className="border border-gray-300 p-2 bg-gray-50 text-xs font-medium text-gray-700 text-center whitespace-normal break-words">
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
                        <td className="border border-gray-300 p-2 font-medium text-xs text-gray-700 bg-white break-words">
                          {rowLabel}
                        </td>
                        {matrixColumns.map((col: any, colIndex: number) => {
                          const colKey = typeof col === 'string' ? col : col.value || col.label;
                          return (
                            <td key={colIndex} className="border border-gray-300 p-2 text-center">
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
            <p className="text-xs text-gray-400 mt-1 sm:hidden text-center">← Swipe to see all options →</p>
          </div>
        );

      case "slider_scale":
        console.log('🔍 [SLIDER] Question settings:', JSON.stringify(question.settings, null, 2));
        console.log('🔍 [SLIDER] customImages:', question.settings?.customImages);
        console.log('🔍 [SLIDER] useCustomImages:', question.settings?.useCustomImages);
        return (
          <div className="py-4">
            <SliderScale
              value={responses[questionId] !== undefined ? Number(responses[questionId]) : null}
              onChange={(value) => {
                const settings = question.settings || {};
                if (settings.valueDisplayMode && settings.valueDisplayMode !== 'number') {
                  // Create enhanced payload for range/text modes
                  const payload = createAnswerPayload(
                    value,
                    settings.valueDisplayMode,
                    settings.rangeMappings,
                    settings.textMappings
                  );
                  handleResponseChange(questionId, payload);
                } else {
                  // Default numeric mode
                  handleResponseChange(questionId, value);
                }
              }}
              settings={question.settings || DEFAULT_SETTINGS.slider_scale}
              disabled={isSubmitted}
            />
          </div>
        );

      case "dial_gauge":
        return (
          <div className="py-4 flex justify-center">
            <DialGauge
              value={responses[questionId] !== undefined ? Number(responses[questionId]) : null}
              onChange={(value) => {
                const settings = question.settings || {};
                if (settings.valueDisplayMode && settings.valueDisplayMode !== 'number') {
                  // Create enhanced payload for range/text modes
                  const payload = createAnswerPayload(
                    value,
                    settings.valueDisplayMode,
                    settings.rangeMappings,
                    settings.textMappings
                  );
                  handleResponseChange(questionId, payload);
                } else {
                  // Default numeric mode
                  handleResponseChange(questionId, value);
                }
              }}
              settings={question.settings || DEFAULT_SETTINGS.dial_gauge}
              disabled={isSubmitted}
            />
          </div>
        );

      case "likert_visual":
        return (
          <div className="py-4">
            <LikertVisual
              value={responses[questionId] !== undefined ? Number(responses[questionId]) : null}
              onChange={(value) => handleResponseChange(questionId, value)}
              settings={question.settings || DEFAULT_SETTINGS.likert_visual}
              disabled={isSubmitted}
              showBottomLabels={false}
            />
          </div>
        );

      case "nps":
        return (
          <div className="py-4">
            <NPSScale
              value={responses[questionId] !== undefined ? Number(responses[questionId]) : null}
              onChange={(value) => handleResponseChange(questionId, value)}
              settings={question.settings || DEFAULT_SETTINGS.nps}
              disabled={isSubmitted}
            />
          </div>
        );

      case "star_rating":
        return (
          <div className="py-4">
            <StarRating
              value={responses[questionId] !== undefined ? Number(responses[questionId]) : null}
              onChange={(value) => handleResponseChange(questionId, value)}
              settings={question.settings || DEFAULT_SETTINGS.star_rating}
              disabled={isSubmitted}
            />
          </div>
        );

      case "drag_and_drop":
        const dndQuestion = {
          type: 'drag_and_drop' as const,
          question: question.title || question.question,
          settings: question.settings || DEFAULT_SETTINGS.drag_and_drop,
          required: question.is_required,
          correctAnswers: question.correctAnswers,
          points: question.points
        };
        return (
          <div className="py-4 w-full">
            <DragDropBucket
              question={dndQuestion}
              value={responses[questionId]}
              onChange={(response) => handleResponseChange(questionId, response)}
              disabled={isSubmitted}
              showResults={isSubmitted && questionnaire?.type === 'assessment'}
              isAssessment={questionnaire?.type === 'assessment'}
              language={perQuestionLanguages[question.id] || selectedLanguage || 'EN'}
            />
          </div>
        );

      case "sct_likert":
        const sctSettings = question.settings || DEFAULT_SETTINGS.sct_likert;
        const sctResponseType = sctSettings.responseType || sctSettings.choiceType || 'single';
        const sctChoiceType = sctResponseType; // For backward compatibility
        const sctScale = sctSettings.scale || 5;
        
        // Fallback: Generate default options if options array is empty
        let sctOptions = question.options || [];
        if (sctOptions.length === 0) {
          // Auto-generate default labels based on scale
          sctOptions = getDefaultLabelsForScale(sctScale);
        }
        
        // If Response Type is 'likert', render as visual Likert scale
        if (sctResponseType === 'likert') {
          const likertConfig = sctSettings.likertConfig || {};
          const likertSettings = {
            scale: sctScale,
            labels: sctOptions,
            showLabels: likertConfig.showLabels !== false,
            showIcons: likertConfig.showIcons !== false,
            iconStyle: likertConfig.iconStyle || 'emoji',
            size: likertConfig.size || 'md',
            customImages: likertConfig.customImages,
          };
          
          return (
            <div className="py-4">
              <LikertVisual
                value={responses[questionId] !== undefined ? responses[questionId] : null}
                onChange={(value) => !isSubmitted && handleResponseChange(questionId, value)}
                settings={likertSettings}
                disabled={isSubmitted}
              />
            </div>
          );
        }
        
        if (sctChoiceType === 'multi') {
          // Multi-select: render as checkboxes
          const rawOptions = getTranslatedText(question, 'options') as string[];
          const translatedSCTOptions = (rawOptions && rawOptions.length > 0) ? rawOptions : sctOptions;
          return (
            <div className="space-y-3">
               {translatedSCTOptions?.map((option: any, index: number) => {
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
        } else {
          // Single choice: render as radio buttons
          const rawOptions = getTranslatedText(question, 'options') as string[];
          const translatedSCTOptions = (rawOptions && rawOptions.length > 0) ? rawOptions : sctOptions;
          return (
            <div className="space-y-3">
              {translatedSCTOptions?.map((option: any, index: number) => {
                const optionValue = typeof option === 'string' ? option : (option.value || option.text || option.label || option);
                const optionLabel = typeof option === 'string' ? option : (option.label || option.text || option.value || option);
                const isSelected = responses[questionId] === optionValue;
                
                return (
                  <div
                    key={index}
                    onClick={() => !isSubmitted && handleResponseChange(questionId, optionValue)}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                      isSubmitted ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                    } ${
                      isSelected ? "border-qsights-blue bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Circle
                      className={`w-5 h-5 ${
                        isSelected
                          ? "text-qsights-blue fill-qsights-blue"
                          : "text-gray-400"
                      }`}
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
        }

      case "information":
        // Information block - display only, no response needed
        // Check for hyperlinks in question directly or in settings
        const infoHyperlinks = question.hyperlinks || question.settings?.hyperlinks || [];
        const hyperlinksPosition = question.hyperlinksPosition || question.settings?.hyperlinksPosition || 'bottom';
        // Check for formatted content in question directly or in settings
        const formattedContent = question.formattedQuestion || question.settings?.formattedContent || question.settings?.formattedQuestion || '';
        
        const hyperlinkButtons = infoHyperlinks.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {infoHyperlinks.map((link: any, idx: number) => (
              link.text && link.url ? (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline decoration-blue-400 hover:decoration-blue-600 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  {link.text}
                </a>
              ) : null
            ))}
          </div>
        );
        
        return (
          <div className="py-2">
            <div className="space-y-3">
              {/* Hyperlinks at top */}
              {hyperlinksPosition === 'top' && hyperlinkButtons}
              
              {formattedContent ? (
                <div 
                  className="text-sm text-gray-800 prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:text-blue-600 [&_a]:underline [&_a:hover]:text-blue-800"
                  dangerouslySetInnerHTML={{ __html: formattedContent }}
                />
              ) : question.description ? (
                <p className="text-sm text-gray-800">{question.description}</p>
              ) : null}
              
              {/* Hyperlinks at bottom */}
              {hyperlinksPosition === 'bottom' && hyperlinkButtons}
            </div>
          </div>
        );

      case "video":
        // Parse settings if it's a string (from API)
        let videoSettings;
        if (typeof question.settings === 'string') {
          try {
            videoSettings = JSON.parse(question.settings);
          } catch (e) {
            console.error('[VIDEO] Failed to parse settings:', question.settings);
            videoSettings = {
              videoUrl: "",
              videoThumbnailUrl: "",
              videoDurationSeconds: 0,
              isMandatoryWatch: false,
              videoPlayMode: "inline"
            };
          }
        } else {
          videoSettings = question.settings || {
            videoUrl: "",
            videoThumbnailUrl: "",
            videoDurationSeconds: 0,
            isMandatoryWatch: false,
            videoPlayMode: "inline"
          };
        }
        
        console.log('[VIDEO] Question ID:', questionId, 'Settings:', videoSettings);
        
        // If no video URL configured, show error message
        if (!videoSettings.videoUrl) {
          console.error('[VIDEO] No videoUrl found in settings!');
          return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                This video question is not properly configured. Please contact the administrator.
              </p>
            </div>
          );
        }
        
        console.log('[VIDEO] Rendering VideoPlayerWithTracking with URL:', videoSettings.videoUrl);
        
        return (
          <div className="py-4">
            <VideoPlayerWithTracking
              videoUrl={videoSettings.videoUrl}
              thumbnailUrl={videoSettings.videoThumbnailUrl}
              duration={videoSettings.videoDurationSeconds}
              isMandatory={videoSettings.isMandatoryWatch}
              playMode={videoSettings.videoPlayMode || "inline"}
              questionId={questionId}
              activityId={activity?.id || ""}
              responseId={undefined}  // Don't pass responseId - let component use participant_id + activity_id
              participantId={participantId ? String(participantId) : undefined}
              onCompletionChange={(completed: boolean) => {
                // Store completion status for validation
                handleResponseChange(questionId, {
                  completed,
                  watchedAtLeast95: completed
                });
              }}
            />
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

  // Wait for both activity loading, token decryption, AND token validation (if token exists)
  // Key fix: If token exists but hasn't been validated yet, show loading
  const tokenNeedsValidation = token && (!tokenValidated || tokenValidating) && !tokenError;
  
  if (loading || !tokenDecrypted || tokenNeedsValidation) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: activity?.landing_config?.backgroundColor || "#F9FAFB" }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-qsights-blue mx-auto" />
          <p className="mt-2 text-sm text-gray-500">
            {tokenNeedsValidation ? "Validating your access..." : "Loading activity..."}
          </p>
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

    // NEW: Handle "Take Event Again" for kiosk mode (new participant on same device)
    const handleTakeEventAgain = () => {
      // Clear ALL session data
      localStorage.removeItem(`activity_${activityId}_session`);
      sessionStorage.removeItem(`activity_${activityId}_session`);
      localStorage.removeItem(`activity_${activityId}_start_time`);
      sessionStorage.removeItem(`activity_${activityId}_start_time`);
      localStorage.removeItem(`temp_session_${activityId}`);
      
      // Check if this is post-submission registration flow
      const registrationFlow = activity?.registration_flow || 'pre_submission';
      const isPostSubmission = registrationFlow === 'post_submission';
      
      // Reset all state to initial values
      setSubmitted(false);
      setResponses({});
      setQuestionComments({}); // Reset optional question comments
      setParticipantData({});
      setParticipantId(null);
      setTokenData(null);
      setTokenValidated(false);
      setTokenError(null);
      setCurrentSectionIndex(0);
      setCurrentQuestionIndex(0);
      setAssessmentResult(null);
      setSubmittedQuestions(new Set());
      setPollResults({});
      setPollSubmittedQuestions(new Set());
      setRemainingSeconds(null);
      setSelectedLanguage(null);
      setPerQuestionLanguages({});
      setShowRegistrationAfterSubmit(false);
      setTempSessionToken(null);
      
      // For post-submission flow: Go directly to questionnaire (skip registration)
      // For pre-submission flow: Show registration form first
      if (isPostSubmission) {
        // Generate new session token for post-submission flow
        const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(`temp_session_${activityId}`, sessionToken);
        setTempSessionToken(sessionToken);
        
        // Set start time
        const now = Date.now();
        setStartTime(now);
        
        // Go directly to questionnaire
        setShowForm(false);
        setStarted(true);
        
        toast({
          title: "Ready for Next Participant",
          description: "Starting questionnaire - registration after submission",
          variant: "success",
          duration: 3000
        });
      } else {
        // Pre-submission flow: Show registration form first
        setStarted(false);
        setShowForm(true);
        setStartTime(null);
        
        toast({
          title: "Ready for Next Participant",
          description: "Starting fresh - new participant can now register",
          variant: "success",
          duration: 3000
        });
      }
      
      // Scroll to top for better UX
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const isAssessment = questionnaire?.type === 'assessment' || activity?.type === 'assessment';
    
    console.log('Rendering thank you page:', {
      questionnaireType: questionnaire?.type,
      activityType: activity?.type,
      isAssessment,
      hasAssessmentResult: !!assessmentResult,
      assessmentResult
    });

    // Check if we should show banner/footer on thank you page
    const showThankYouBanner = activity?.landing_config?.thankYouShowBanner !== false && activity?.landing_config?.bannerBackgroundColor;
    const showThankYouFooter = activity?.landing_config?.thankYouShowFooter !== false && activity?.landing_config?.footerEnabled !== false;

    return (
      <div 
        className="min-h-screen flex flex-col relative"
        style={{
          backgroundColor: activity?.landing_config?.backgroundStyle === "solid" || !activity?.landing_config?.backgroundStyle
            ? (activity?.landing_config?.backgroundColor || "#F9FAFB")
            : activity?.landing_config?.backgroundStyle === "gradient"
            ? undefined
            : undefined,
          backgroundImage: activity?.landing_config?.backgroundStyle === "gradient"
            ? `linear-gradient(to bottom right, ${activity?.landing_config?.gradientFrom || "#F3F4F6"}, ${activity?.landing_config?.gradientTo || "#DBEAFE"})`
            : undefined,
        }}
      >
        {/* Background Image with Opacity - Same as Landing Page */}
        {activity?.landing_config?.backgroundStyle === "image" && activity?.landing_config?.backgroundImageUrl && (
          <div 
            className="fixed inset-0 z-0"
            style={{
              backgroundImage: `url(${activity.landing_config.backgroundImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
              opacity: (activity?.landing_config?.backgroundImageOpacity ?? 100) / 100,
            }}
          />
        )}

        {/* Top Banner on Thank You Page - Same structure as Landing Page */}
        {showThankYouBanner && (
          <div 
            className="w-full flex-shrink-0 relative z-10" 
            style={{ 
              backgroundColor: activity.landing_config.bannerBackgroundColor || "#3B82F6",
              height: activity.landing_config.bannerHeight || "120px",
              backgroundImage: (presignedBannerUrl || activity.landing_config.bannerImageUrl) ? `url(${presignedBannerUrl || activity.landing_config.bannerImageUrl})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: activity.landing_config.bannerImagePosition || "center",
            }}
          >
            {/* Mobile: Stacked Layout */}
            <div className="flex flex-col md:hidden items-center justify-center gap-3 w-full pt-2 h-full">
              {activity?.landing_config?.logoUrl && (
                <img 
                  src={presignedLogoUrl || activity.landing_config.logoUrl} 
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
                <div className="absolute left-0 pl-24 flex items-center h-full z-10">
                  <img 
                    src={presignedLogoUrl || activity.landing_config.logoUrl} 
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
                <div className="absolute right-0 pr-24 flex items-center h-full z-10">
                  <img 
                    src={presignedLogoUrl || activity.landing_config.logoUrl} 
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
              {/* Banner Text/Title - Positioned based on config */}
              {activity?.landing_config?.bannerText && (
                <div className={`absolute inset-0 flex items-center w-full h-full pointer-events-none z-20 ${
                  activity.landing_config.bannerTextPosition === 'left' ? 'justify-start pl-24' : 
                  activity.landing_config.bannerTextPosition === 'right' ? 'justify-end pr-24' : 'justify-center'
                }`}>
                  <h1 
                    className="font-bold"
                    style={{ 
                      color: activity.landing_config.bannerTextColor || "#FFFFFF", 
                      margin: 0,
                      fontSize: activity.landing_config.bannerTextSize === 'small' ? '1.25rem' :
                               activity.landing_config.bannerTextSize === 'large' ? '2rem' :
                               activity.landing_config.bannerTextSize === 'xlarge' ? '2.5rem' : '1.5rem'
                    }}
                  >
                    {activity.landing_config.bannerText}
                  </h1>
                </div>
              )}
              {/* Logo Center - Only when no text */}
              {activity.landing_config.logoPosition === 'center' && activity?.landing_config?.logoUrl && !activity?.landing_config?.bannerText && (
                <div className="w-full flex justify-center items-center h-full z-10">
                  <img 
                    src={presignedLogoUrl || activity.landing_config.logoUrl} 
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

        {/* Main Content - Centered */}
        <div className="flex-1 flex items-center justify-center overflow-auto py-8 relative z-10">
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
                      <span className="text-4xl font-bold text-gray-900">{assessmentResult.correctAnswersCount}</span>
                      <span className="text-2xl font-semibold text-gray-400">/</span>
                      <span className="text-4xl font-bold text-gray-400">{assessmentResult.totalQuestions}</span>
                    </div>
                    <div className="mt-2 text-xl font-semibold text-gray-600">
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

                {/* Confirmation message */}
                <p className="text-sm text-gray-500 pt-2">
                  A confirmation has been sent to your email
                </p>
                
                {/* Take Event Again Button - Kiosk Mode (for assessments too) */}
                {activity?.landing_config?.enableTakeEventAgainButton && !token && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleTakeEventAgain}
                      className="w-full max-w-md mx-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-md"
                    >
                      <UserPlus className="w-5 h-5" />
                      Take Event Again
                    </button>
                    <p className="text-xs text-gray-500 mt-3">
                      Start this event for a new participant
                    </p>
                  </div>
                )}
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
                
                {/* Take Event Again Button - Kiosk Mode */}
                {activity?.landing_config?.enableTakeEventAgainButton && !token && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleTakeEventAgain}
                      className="w-full max-w-md mx-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-md"
                    >
                      <UserPlus className="w-5 h-5" />
                      Take Event Again
                    </button>
                    <p className="text-xs text-gray-500 mt-3">
                      Start this event for a new participant
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer on Thank You Page - Same structure as Landing Page */}
        {showThankYouFooter && (
          <div 
            className="w-full flex-shrink-0 flex items-center py-4 md:py-0 relative z-30"
            style={{ 
              backgroundColor: activity?.landing_config?.footerBackgroundColor || "#F1F5F9",
              minHeight: activity?.landing_config?.footerHeight || "80px",
              pointerEvents: 'auto'
            }}
          >
            <div className="w-full h-full relative">
              <div className="flex flex-col md:grid md:grid-cols-3 items-center gap-3 md:gap-4 w-full h-full px-4">
                {/* Left Section */}
                <div className="flex justify-center md:justify-start items-center w-full h-full">
                  {activity?.landing_config?.footerLogoUrl && activity.landing_config.footerLogoPosition === 'left' && (
                    <img 
                      src={presignedFooterLogoUrl || activity.landing_config.footerLogoUrl} 
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
                      dangerouslySetInnerHTML={getFooterHtml(
                        activity.landing_config.footerText, 
                        getFooterHyperlinksFromConfig(activity.landing_config)
                      )}
                    />
                  )}
                </div>
                
                {/* Center Section */}
                <div className="flex justify-center items-center w-full h-full">
                  {activity?.landing_config?.footerLogoUrl && activity.landing_config.footerLogoPosition === 'center' && (
                    <img 
                      src={presignedFooterLogoUrl || activity.landing_config.footerLogoUrl} 
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
                      dangerouslySetInnerHTML={getFooterHtml(
                        activity.landing_config.footerText, 
                        getFooterHyperlinksFromConfig(activity.landing_config)
                      )}
                    />
                  )}
                </div>
                
                {/* Right Section */}
                <div className="flex justify-center md:justify-end items-center w-full h-full">
                  {activity?.landing_config?.footerLogoUrl && activity.landing_config.footerLogoPosition === 'right' && (
                    <img 
                      src={presignedFooterLogoUrl || activity.landing_config.footerLogoUrl} 
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
                      dangerouslySetInnerHTML={getFooterHtml(
                        activity.landing_config.footerText, 
                        getFooterHyperlinksFromConfig(activity.landing_config)
                      )}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // DEBUG: Log render state to trace video intro issue
  console.log('[RENDER DEBUG] State check:', { showForm, isAnonymous, started, isPreview, showVideoIntro, hasVideoIntro: !!videoIntro });

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
        label: "Communication Email ID",
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

        case "country":
          // Use field.options if available, otherwise use the built-in ALL_COUNTRIES list
          const countryOptions = (field.options && field.options.length > 0) ? field.options : ALL_COUNTRIES;
          return (
            <select
              id={fieldKey}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
              required={!isPreview && (field.required || field.isMandatory)}
            >
              <option value="">Select your country...</option>
              {countryOptions.map((option, idx) => (
                <option key={idx} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );

        case "radio":
        case "gender":
          // For gender, ensure default options if none provided
          const radioOptions = field.type === "gender" && (!field.options || field.options.length === 0)
            ? ["Male", "Female"]
            : (field.options || []);
          return (
            <div className={field.type === "gender" ? "flex flex-row gap-6" : "space-y-2"}>
              {radioOptions.map((option, idx) => (
                <label key={idx} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={fieldKey}
                    value={option}
                    checked={value === option}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-4 h-4 text-qsights-blue focus:ring-qsights-blue border-gray-300"
                    required={!isPreview && (field.required || field.isMandatory) && !value}
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
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
        className="flex flex-col min-h-screen relative"
        style={{ 
          backgroundColor: activity?.landing_config?.loginBoxAlignment !== 'right' 
            ? (activity?.landing_config?.fullPageBackgroundColor || activity?.landing_config?.backgroundColor || "#F9FAFB")
            : (activity?.landing_config?.backgroundColor || "#F9FAFB"),
          overflow: 'hidden',
        }}
      >
        {/* Full Page Background Image for Non-Split Templates */}
        {activity?.landing_config?.fullPageBackgroundImageUrl && 
         activity?.landing_config?.loginBoxAlignment !== 'right' && (
          <>
            <div 
              className="absolute inset-0"
              style={{ 
                backgroundImage: `url(${activity.landing_config.fullPageBackgroundImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                opacity: (activity.landing_config.fullPageBackgroundOpacity ?? 100) / 100,
                zIndex: 1,
              }}
            />
            {/* Subtle overlay for better readability */}
            <div 
              className="absolute inset-0" 
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.1)',
                zIndex: 2,
              }}
            />
          </>
        )}

        {/* Top Banner with Logo and Text */}
        {activity?.landing_config?.bannerEnabled !== false && activity?.landing_config?.bannerBackgroundColor && (
          <div 
            className="fixed top-0 left-0 right-0" 
            style={{ 
              backgroundColor: activity.landing_config.bannerBackgroundColor || "#3B82F6",
              height: activity.landing_config.bannerHeight || "120px",
              zIndex: 20,
              backgroundImage: (presignedBannerUrl || activity.landing_config.bannerImageUrl) ? `url(${presignedBannerUrl || activity.landing_config.bannerImageUrl})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: activity.landing_config.bannerImagePosition || "center",
            }}
          >
            {/* Mobile: Stacked Layout */}
            <div className="flex flex-col md:hidden items-center justify-center gap-3 w-full pt-2 h-full">
              {activity?.landing_config?.logoUrl && (
                <img 
                  src={presignedLogoUrl || activity.landing_config.logoUrl} 
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
                <div className="absolute left-0 pl-24 flex items-center h-full z-10">
                  <img 
                    src={presignedLogoUrl || activity.landing_config.logoUrl} 
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
                <div className="absolute right-0 pr-24 flex items-center h-full z-10">
                  <img 
                    src={presignedLogoUrl || activity.landing_config.logoUrl} 
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
              {/* Banner Text/Title - Positioned based on config */}
              {activity?.landing_config?.bannerText && (
                <div className={`absolute inset-0 flex items-center w-full h-full pointer-events-none z-20 ${
                  activity.landing_config.bannerTextPosition === 'left' ? 'justify-start pl-24' : 
                  activity.landing_config.bannerTextPosition === 'right' ? 'justify-end pr-24' : 'justify-center'
                }`}>
                  <h1 
                    className="font-bold"
                    style={{ 
                      color: activity.landing_config.bannerTextColor || "#FFFFFF", 
                      margin: 0,
                      fontSize: activity.landing_config.bannerTextSize === 'small' ? '1.25rem' :
                               activity.landing_config.bannerTextSize === 'large' ? '2rem' :
                               activity.landing_config.bannerTextSize === 'xlarge' ? '2.5rem' : '1.5rem'
                    }}
                  >
                    {activity.landing_config.bannerText}
                  </h1>
                </div>
              )}
              {/* Logo Center - Only when no text */}
              {activity.landing_config.logoPosition === 'center' && activity?.landing_config?.logoUrl && !activity?.landing_config?.bannerText && (
                <div className="w-full flex justify-center items-center h-full z-10">
                  <img 
                    src={presignedLogoUrl || activity.landing_config.logoUrl} 
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
                    src={presignedLogoUrl || activity.landing_config.logoUrl} 
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
                backgroundColor: activity.landing_config.splitScreenLeftBackgroundColor || activity.landing_config.leftContentBackgroundColor || "#0EA5E9",
                minHeight: '100vh',
                overflow: 'hidden'
              }}
            >
              {/* Split Screen Left Background Image - Only for 'full' vertical position */}
              {activity.landing_config.splitScreenLeftBackgroundImageUrl && 
               activity.landing_config.splitScreenLeftBackgroundVerticalPosition !== 'below' && (
                <div 
                  className="absolute inset-0"
                  style={{ 
                    backgroundImage: `url(${activity.landing_config.splitScreenLeftBackgroundImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    opacity: (activity.landing_config.splitScreenLeftBackgroundOpacity ?? 100) / 100,
                    zIndex: activity.landing_config.splitScreenLeftBackgroundPosition === 'above' ? 20 : 1,
                  }}
                />
              )}

              {/* Overlay for text readability - Only for 'full' vertical position */}
              {activity.landing_config.splitScreenLeftBackgroundImageUrl && 
               activity.landing_config.splitScreenLeftBackgroundVerticalPosition !== 'below' && (
                <div 
                  className="absolute inset-0" 
                  style={{ 
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    zIndex: activity.landing_config.splitScreenLeftBackgroundPosition === 'above' ? 21 : 2,
                  }}
                />
              )}

              {/* Legacy fullscreen background support */}
              {!activity.landing_config.splitScreenLeftBackgroundImageUrl && 
               activity.landing_config.leftContentImagePosition === 'fullscreen' && 
               activity.landing_config.leftContentImageUrl && (
                <>
                  <div 
                    className="absolute inset-0"
                    style={{ 
                      backgroundImage: `url(${activity.landing_config.leftContentImageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      zIndex: 1,
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30" style={{ zIndex: 2 }}></div>
                </>
              )}
              
              <div className={`relative flex flex-col items-center justify-center w-full`}
              style={{ zIndex: 10 }}
              >
                {/* Legacy: Image at top (when not using split screen background) */}
                {!activity.landing_config.splitScreenLeftBackgroundImageUrl &&
                 activity.landing_config.leftContentImagePosition === 'top' && 
                 activity.landing_config.leftContentImageUrl && (
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
                
                {/* Background image positioned below content */}
                {activity.landing_config.splitScreenLeftBackgroundImageUrl && 
                 activity.landing_config.splitScreenLeftBackgroundVerticalPosition === 'below' && (
                  <div className="w-full max-w-md mt-8">
                    <img 
                      src={activity.landing_config.splitScreenLeftBackgroundImageUrl} 
                      alt="Background" 
                      className="w-full rounded-lg shadow-lg"
                      style={{ 
                        position: 'relative', 
                        zIndex: 15,
                        opacity: (activity.landing_config.splitScreenLeftBackgroundOpacity ?? 100) / 100
                      }}
                    />
                  </div>
                )}

                {/* Legacy: Image at bottom (when not using split screen background) */}
                {!activity.landing_config.splitScreenLeftBackgroundImageUrl &&
                 activity.landing_config.leftContentImagePosition === 'bottom' && 
                 activity.landing_config.leftContentImageUrl && (
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
              backgroundColor: activity?.landing_config?.leftContentEnabled 
                ? (activity?.landing_config?.splitScreenRightBackgroundColor || '#F3F4F6')
                : 'transparent',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              zIndex: 1,
              overflow: 'hidden',
              marginTop: activity?.landing_config?.bannerBackgroundColor ? `calc(-1 * (${activity.landing_config.bannerHeight || "120px"}))` : 
                        (activity?.landing_config?.logoUrl || activity?.landing_config?.pageTitle) ? '-70px' : 0,
              marginBottom: activity?.landing_config?.footerEnabled !== false && activity?.landing_config?.footerBackgroundColor ? `calc(-1 * (${activity.landing_config.footerHeight || "80px"}))` : 0,
              paddingTop: activity?.landing_config?.bannerBackgroundColor ? `calc(${activity.landing_config.bannerHeight || "120px"} + 3rem)` : 
                         (activity?.landing_config?.logoUrl || activity?.landing_config?.pageTitle) ? "calc(70px + 3rem)" : '3rem',
              paddingBottom: activity?.landing_config?.footerEnabled !== false && activity?.landing_config?.footerBackgroundColor ? `calc(${activity.landing_config.footerHeight || "80px"} + 3rem)` : '3rem',
            }}
          >
            {/* Split Screen Right Background Image (Priority) - Only for split screen */}
            {activity?.landing_config?.leftContentEnabled && activity?.landing_config?.splitScreenRightBackgroundImageUrl && (
              <div 
                className="absolute"
                style={{ 
                  backgroundImage: `url(${activity.landing_config.splitScreenRightBackgroundImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  opacity: (activity.landing_config.splitScreenRightBackgroundOpacity ?? 100) / 100,
                  top: activity?.landing_config?.bannerBackgroundColor ? `calc(-1 * (${activity.landing_config.bannerHeight || "120px"}))` : 
                       (activity?.landing_config?.logoUrl || activity?.landing_config?.pageTitle) ? '-70px' : 0,
                  bottom: activity?.landing_config?.footerEnabled !== false && activity?.landing_config?.footerBackgroundColor ? `calc(-1 * (${activity.landing_config.footerHeight || "80px"}))` : 0,
                  left: 0,
                  right: 0,
                  zIndex: 0,
                }}
              />
            )}
            
            {/* Legacy Login Box Background Image (Fallback) - Only for split screen */}
            {activity?.landing_config?.leftContentEnabled && !activity?.landing_config?.splitScreenRightBackgroundImageUrl && activity?.landing_config?.loginBoxBackgroundImageUrl && (
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
            
            {/* Semi-transparent overlay when background image is present - Only for split screen */}
            {activity?.landing_config?.leftContentEnabled && (activity?.landing_config?.splitScreenRightBackgroundImageUrl || activity?.landing_config?.loginBoxBackgroundImageUrl) && (
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
                  {activity?.landing_config?.loginBoxContentType === 'logo' && activity?.landing_config?.loginBoxLogoUrl ? (
                    <div className="flex justify-center mb-3">
                      <img 
                        src={activity.landing_config.loginBoxLogoUrl} 
                        alt="Logo" 
                        className="h-16 object-contain"
                      />
                    </div>
                  ) : activity?.landing_config?.loginBoxContentType === 'text' ? (
                    <>
                      {activity?.landing_config?.loginBoxCustomTitle && (
                        <CardTitle className="text-xl font-bold">{activity.landing_config.loginBoxCustomTitle}</CardTitle>
                      )}
                      {activity?.landing_config?.loginBoxCustomSubtitle && (
                        <p className="text-sm text-white/90 mt-2">{activity.landing_config.loginBoxCustomSubtitle}</p>
                      )}
                    </>
                  ) : (
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
                  {token && tokenValidated && (() => {
                    // Check if there are additional fields to fill
                    const formFields = activity?.registration_form_fields || [];
                    const hasAdditionalFields = formFields.some((field: any) => {
                      const fieldId = field.id || field.name;
                      const isDefaultField = ['name', 'full_name', 'email', 'email_address'].includes(fieldId) || field.type === 'email';
                      return !isDefaultField || !participantData[fieldId];
                    });
                    const needsLanguage = activity?.is_multilingual && Array.isArray(activity?.languages) && activity.languages.length > 1;
                    
                    return (
                      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Welcome, {participantData.name}!</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {hasAdditionalFields || needsLanguage 
                              ? "Please complete the details below to continue"
                              : "Click continue to start the activity"}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

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
            {/* When token validated: Hide pre-filled name/email fields, only show additional fields */}
            {!isAnonymous && (() => {
              // Filter out pre-filled fields when token is validated
              const fieldsToShow = formFields
                .sort((a, b) => a.order - b.order)
                .filter((field) => {
                  // If token validated, hide name and email fields (they're pre-filled from DB)
                  if (token && tokenValidated) {
                    const fieldKey = field.id || (field as any).name || 'unknown';
                    const isDefaultField = ['name', 'full_name', 'email', 'email_address'].includes(fieldKey) || field.type === 'email';
                    if (isDefaultField && participantData[fieldKey]) {
                      return false; // Hide this field
                    }
                  }
                  return true;
                });
              
              // If no fields to show after filtering, don't render the form section
              if (fieldsToShow.length === 0) {
                return null;
              }
              
              return (
                <div className="space-y-4">
                  {fieldsToShow.map((field, idx) => {
                    return (
                      <div
                        key={field.id || `field-${idx}`}
                        className="w-full"
                      >
                        <div className="space-y-2">
                          <Label htmlFor={field.id} className="text-sm font-medium text-gray-700">
                            {field.label}{" "}
                            {!isPreview && (field.required || field.isMandatory) && (
                              <span className="text-red-500">*</span>
                            )}
                            {isPreview && (
                              <span className="text-gray-400 text-xs">(optional)</span>
                            )}
                          </Label>
                          {renderFormField(field)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

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
                  {isAnonymous ? 'Starting...' : isPreview ? 'Loading Preview...' : token && tokenValidated ? 'Starting...' : showRegistrationAfterSubmit ? 'Submitting...' : 'Registering...'}
                </>
              ) : (
                <>
                  {showRegistrationAfterSubmit ? 'Submit' : isPreview ? 'Start Preview' : token && tokenValidated ? 'Continue' : `Start ${activity?.type === 'assessment' ? 'Assessment' : activity?.type === 'poll' ? 'Poll' : 'Survey'}`}
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
            className="w-full flex items-center py-4 md:py-0 relative z-30"
            style={{ 
              backgroundColor: activity?.landing_config?.footerBackgroundColor || "#F1F5F9",
              minHeight: activity?.landing_config?.footerHeight || "80px",
              pointerEvents: 'auto'
            }}
          >
            {/* Full width container with same padding as banner for consistency */}
            <div className="w-full h-full relative">
              {/* Responsive layout - stacked on mobile, grid on desktop */}
              <div className="flex flex-col md:grid md:grid-cols-3 items-center gap-3 md:gap-4 w-full h-full px-4">
                {/* Left Section */}
                <div className="flex justify-center md:justify-start items-center w-full h-full">
                  {activity?.landing_config?.footerLogoUrl && activity.landing_config.footerLogoPosition === 'left' && (
                    <img 
                      src={presignedFooterLogoUrl || activity.landing_config.footerLogoUrl} 
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
                      dangerouslySetInnerHTML={getFooterHtml(
                        activity.landing_config.footerText, 
                        getFooterHyperlinksFromConfig(activity.landing_config)
                      )}
                    />
                  )}
                </div>
                
                {/* Center Section */}
                <div className="flex justify-center items-center w-full h-full">
                  {activity?.landing_config?.footerLogoUrl && activity.landing_config.footerLogoPosition === 'center' && (
                    <img 
                      src={presignedFooterLogoUrl || activity.landing_config.footerLogoUrl} 
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
                      dangerouslySetInnerHTML={getFooterHtml(
                        activity.landing_config.footerText, 
                        getFooterHyperlinksFromConfig(activity.landing_config)
                      )}
                    />
                  )}
                </div>
                
                {/* Right Section */}
                <div className="flex justify-center md:justify-end items-center w-full h-full pr-0">
                  {activity?.landing_config?.footerLogoUrl && activity.landing_config.footerLogoPosition === 'right' && (
                    <img 
                      src={presignedFooterLogoUrl || activity.landing_config.footerLogoUrl} 
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
                      dangerouslySetInnerHTML={getFooterHtml(
                        activity.landing_config.footerText, 
                        getFooterHyperlinksFromConfig(activity.landing_config)
                      )}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // DEBUG: Check video intro conditions
  console.log('[VIDEO INTRO RENDER CHECK] showVideoIntro:', showVideoIntro, 'videoIntro:', !!videoIntro, 'willShowVideoScreen:', showVideoIntro && videoIntro);
  
  // Show video intro screen after registration, before questionnaire
  if (showVideoIntro && videoIntro) {
    console.log('[VIDEO INTRO RENDER] Rendering video intro screen');
    return (
      <div 
        className="min-h-screen relative flex items-center justify-center"
        style={{ 
          backgroundColor: activity?.landing_config?.backgroundStyle === "solid" || !activity?.landing_config?.backgroundStyle
            ? (activity?.landing_config?.backgroundColor || "#F9FAFB")
            : activity?.landing_config?.backgroundStyle === "gradient"
            ? undefined
            : undefined,
          backgroundImage: activity?.landing_config?.backgroundStyle === "gradient"
            ? `linear-gradient(to bottom right, ${activity?.landing_config?.gradientFrom || "#F3F4F6"}, ${activity?.landing_config?.gradientTo || "#DBEAFE"})`
            : undefined,
        }}
      >
        {/* Background Image with Opacity */}
        {activity?.landing_config?.backgroundStyle === "image" && activity?.landing_config?.backgroundImageUrl && (
          <div 
            className="fixed inset-0 z-0"
            style={{
              backgroundImage: `url(${activity.landing_config.backgroundImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
              opacity: (activity?.landing_config?.backgroundImageOpacity ?? 100) / 100,
            }}
          />
        )}

        <div className="relative z-10 w-full max-w-5xl px-4 py-8 mx-auto">
          <Card className="shadow-2xl border-0 overflow-hidden">
            <CardContent className="p-8">
              {/* Header */}
              <div className="text-center mb-6">
                {activity?.landing_config?.logoUrl && (
                  <div className="flex justify-center mb-4">
                    <img 
                      src={presignedLogoUrl || activity.landing_config.logoUrl} 
                      alt="Logo" 
                      className="object-contain"
                      style={{
                        height: activity.landing_config.logoSize === 'small' ? '48px' 
                          : activity.landing_config.logoSize === 'large' ? '80px' 
                          : '64px'
                      }}
                    />
                  </div>
                )}
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {activity?.name || "Welcome"}
                </h1>
                <p className="text-gray-600">
                  Please watch the introductory video before starting
                </p>
              </div>

              {/* Video Player */}
              <div className="mb-6">
                {/* Resume Dialog */}
                {showResumeDialog && existingWatchLog && (
                  <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                      Welcome back!
                    </h3>
                    <p className="text-sm text-blue-700 mb-4">
                      {existingWatchLog.completed
                        ? "You've already watched this video. Would you like to watch it again?"
                        : `You previously watched ${Math.floor(resumePosition / 60)}:${(resumePosition % 60).toString().padStart(2, '0')} of this video.`}
                    </p>
                    <div className="flex gap-3">
                      {!existingWatchLog.completed && (
                        <Button
                          onClick={handleResumeVideo}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Resume from {Math.floor(resumePosition / 60)}:{(resumePosition % 60).toString().padStart(2, '0')}
                        </Button>
                      )}
                      <Button
                        onClick={handleStartOverVideo}
                        variant="outline"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        {existingWatchLog.completed ? 'Watch Again' : 'Start Over'}
                      </Button>
                      {existingWatchLog.completed && (
                        <Button
                          onClick={() => {
                            setShowResumeDialog(false);
                            setVideoCompleted(true);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Continue to Questionnaire
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <VideoPlayer
                  videoUrl={videoIntro.video_url}
                  thumbnailUrl={videoIntro.thumbnail_url}
                  autoplay={videoIntro.autoplay ?? false}
                  mustWatch={videoIntro.must_watch ?? false}
                  displayMode={videoIntro.display_mode || 'inline'}
                  onComplete={handleVideoComplete}
                  onTimeUpdate={handleVideoTimeUpdate}
                  enablePeriodicSave={true}
                  onPeriodicSave={handlePeriodicVideoSave}
                  initialPosition={showResumeDialog ? 0 : resumePosition}
                />
              </div>

              {/* Must Watch Warning */}
              {videoIntro.must_watch && !videoCompleted && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                  <Bell className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-900 mb-1">
                      Video Required
                    </p>
                    <p className="text-xs text-yellow-700">
                      You must watch at least 90% of the video to proceed to the questionnaire.
                    </p>
                  </div>
                </div>
              )}

              {/* Start Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleStartAfterVideo}
                  disabled={videoIntro.must_watch && !videoCompleted}
                  className={`px-8 py-6 text-lg font-semibold rounded-xl transition-all shadow-lg ${
                    videoIntro.must_watch && !videoCompleted
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-qsights-cyan to-qsights-blue text-white hover:shadow-xl hover:scale-105'
                  }`}
                >
                  {videoIntro.must_watch && !videoCompleted ? (
                    <>
                      <Circle className="w-5 h-5 mr-2" />
                      Watch Video to Continue
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-5 h-5 mr-2" />
                      Start Questionnaire
                    </>
                  )}
                </Button>
              </div>

              {/* Watch Status */}
              {videoWatchTime > 0 && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Watched: {Math.floor(videoWatchTime / 60)}:{(videoWatchTime % 60).toString().padStart(2, '0')} / {Math.floor((videoIntro.video_duration_seconds || 0) / 60)}:{((videoIntro.video_duration_seconds || 0) % 60).toString().padStart(2, '0')}
                  {videoCompleted && (
                    <span className="ml-2 text-green-600 font-semibold">✓ Completed</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
      className="min-h-screen relative"
      style={{ 
        backgroundColor: activity?.landing_config?.backgroundStyle === "solid" || !activity?.landing_config?.backgroundStyle
          ? (activity?.landing_config?.backgroundColor || "#F9FAFB")
          : activity?.landing_config?.backgroundStyle === "gradient"
          ? undefined
          : undefined,
        backgroundImage: activity?.landing_config?.backgroundStyle === "gradient"
          ? `linear-gradient(to bottom right, ${activity?.landing_config?.gradientFrom || "#F3F4F6"}, ${activity?.landing_config?.gradientTo || "#DBEAFE"})`
          : undefined,
      }}
    >
      {/* Background Image with Opacity */}
      {activity?.landing_config?.backgroundStyle === "image" && activity?.landing_config?.backgroundImageUrl && (
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: `url(${activity.landing_config.backgroundImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            opacity: (activity?.landing_config?.backgroundImageOpacity ?? 100) / 100,
          }}
        />
      )}
      
      {/* Top Banner - Conditional for inner pages */}
      {shouldShowBanner && activity?.landing_config && (
        <div 
          className="w-full fixed top-0 left-0 right-0 z-50" 
          style={{ 
            backgroundColor: activity.landing_config.bannerBackgroundColor || "#3B82F6",
            height: activity.landing_config.bannerHeight || "120px",
            backgroundImage: (presignedBannerUrl || activity.landing_config.bannerImageUrl) ? `url(${presignedBannerUrl || activity.landing_config.bannerImageUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Mobile: Stacked Layout */}
          <div className="flex flex-col md:hidden items-center justify-center gap-3 w-full pt-2 h-full">
            {activity?.landing_config?.logoUrl && (
              <img 
                src={presignedLogoUrl || activity.landing_config.logoUrl} 
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
              <div className="absolute left-0 pl-24 flex items-center h-full z-10">
                <img 
                  src={presignedLogoUrl || activity.landing_config.logoUrl} 
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
              <div className="absolute right-0 pr-24 flex items-center h-full z-10">
                <img 
                  src={presignedLogoUrl || activity.landing_config.logoUrl} 
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
                  src={presignedLogoUrl || activity.landing_config.logoUrl} 
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

      <div className="p-4 md:p-6 lg:p-8 relative z-10" style={{ marginTop: shouldShowBanner ? (activity?.landing_config?.bannerHeight || "120px") : 0 }}>
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Ultra Modern Activity Header - Respects hideContentHeader setting */}
          {!activity?.landing_config?.hideContentHeader && (
          <div 
            className="relative overflow-hidden rounded-3xl shadow-2xl border border-white/10"
            style={{
              background: activity?.landing_config?.contentHeaderBackgroundStyle === "solid"
                ? (activity?.landing_config?.contentHeaderBackgroundColor || "#3B82F6")
                : `linear-gradient(to bottom right, ${activity?.landing_config?.contentHeaderGradientFrom || "#3B82F6"}, ${activity?.landing_config?.contentHeaderGradientTo || "#7C3AED"})`,
            }}
          >
            {/* Animated background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
            
            {/* Content Container */}
            <div className="relative z-10 px-6 py-6 md:px-10 md:py-8">
              
              {/* Content Header - Event Title & Description (Default) - controlled by showContentHeaderTitle */}
              {activity?.landing_config?.showContentHeaderTitle !== false && (!activity?.landing_config?.contentHeaderType || activity?.landing_config?.contentHeaderType === "event") && (
                <>
                  {/* Top Row: Title + Type Badge */}
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight">
                      {activity.name}
                    </h1>
                    <div className="flex-shrink-0 px-4 py-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg">
                      <span className="text-xs font-bold bg-gradient-to-r from-qsights-cyan to-qsights-navy bg-clip-text text-transparent uppercase tracking-wider">
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
                </>
              )}
              
              {/* Content Header - Logo - controlled by showContentHeaderTitle */}
              {activity?.landing_config?.showContentHeaderTitle !== false && activity?.landing_config?.contentHeaderType === "logo" && activity?.landing_config?.contentHeaderLogoUrl && (
                <div className="flex items-center justify-center mb-6">
                  <img 
                    src={presignedContentHeaderLogoUrl || activity.landing_config.contentHeaderLogoUrl} 
                    alt="Header Logo" 
                    className="object-contain"
                    style={{
                      maxHeight: activity?.landing_config?.contentHeaderLogoSize === "small" ? "80px"
                        : activity?.landing_config?.contentHeaderLogoSize === "large" ? "160px"
                        : "120px"
                    }}
                  />
                </div>
              )}
              
              {/* Content Header - Custom Text - controlled by showContentHeaderTitle */}
              {activity?.landing_config?.showContentHeaderTitle !== false && activity?.landing_config?.contentHeaderType === "custom" && (
                <div className="mb-6">
                  {activity?.landing_config?.contentHeaderCustomTitle && (
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight mb-3">
                      {activity.landing_config.contentHeaderCustomTitle}
                    </h1>
                  )}
                  {activity?.landing_config?.contentHeaderCustomSubtitle && (
                    <p className="text-base text-blue-50/90 leading-relaxed max-w-3xl">
                      {activity.landing_config.contentHeaderCustomSubtitle}
                    </p>
                  )}
                </div>
              )}

              {/* Info Grid - Controlled by individual showContentHeader settings */}
              {(activity?.landing_config?.showContentHeaderStartDate !== false || 
                activity?.landing_config?.showContentHeaderEndDate !== false || 
                activity?.landing_config?.showContentHeaderQuestions !== false) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Start Date - controlled by showContentHeaderStartDate */}
                {activity?.landing_config?.showContentHeaderStartDate !== false && activity.start_date && (
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

                {/* End Date - controlled by showContentHeaderEndDate */}
                {activity?.landing_config?.showContentHeaderEndDate !== false && activity.end_date && (
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

                {/* Questions Count - controlled by showContentHeaderQuestions */}
                {activity?.landing_config?.showContentHeaderQuestions !== false && questionnaire?.sections && (
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
              )}
            </div>

            {/* Gradient Border Bottom */}
            <div className="h-1 bg-gradient-to-r from-qsights-cyan via-cyan-400 to-cyan-500" />
          </div>
          )}

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
                    <span className={`text-3xl font-bold font-mono tracking-tight ${
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
                    className="h-full bg-gradient-to-r from-qsights-cyan via-cyan-500 to-qsights-cyan transition-all duration-500 ease-out"
                    style={{ width: `${((currentSectionIndex + 1) / totalSections) * 100}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between px-6 py-4 pt-5">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-2xl font-bold bg-gradient-to-r from-qsights-cyan to-qsights-navy bg-clip-text text-transparent">
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
                    className="h-full bg-gradient-to-r from-qsights-cyan via-cyan-500 to-qsights-cyan transition-all duration-500 ease-out"
                    style={{ width: `${((currentSectionIndex + 1) / totalSections) * 100}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between px-6 py-4 pt-5">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-2xl font-bold bg-gradient-to-r from-qsights-cyan to-qsights-navy bg-clip-text text-transparent">
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

            {/* Modern Progress Indicator - for all questions mode */}
            {displayMode === 'all' && questionnaire?.settings?.show_progress_bar !== false && (() => {
              // Calculate total questions across all sections (excluding information type)
              const totalQuestions = allFilteredSections.reduce((total, section) => {
                return total + (section.questions?.filter((q: any) => q.type !== 'information').length || 0);
              }, 0);
              
              // Calculate answered questions
              const answeredQuestions = Object.keys(responses).filter(questionId => {
                const response = responses[questionId];
                // Check if response exists and is not empty
                if (response === null || response === undefined || response === '') return false;
                // For arrays, check if not empty
                if (Array.isArray(response) && response.length === 0) return false;
                return true;
              }).length;
              
              const progressPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
              
              return (
                <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg border border-gray-100 mb-4">
                  {/* Progress Bar Background */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
                    <div 
                      className="h-full bg-gradient-to-r from-qsights-cyan via-cyan-500 to-qsights-cyan transition-all duration-500 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between px-6 py-4 pt-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-2xl font-bold bg-gradient-to-r from-qsights-cyan to-qsights-navy bg-clip-text text-transparent">
                          {progressPercentage}%
                        </span>
                        <span className="text-sm font-medium text-gray-500">
                          {answeredQuestions} of {totalQuestions} questions answered
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Complete the questionnaire to submit your responses</p>
                    </div>
                    
                    {/* Progress Circle Indicator */}
                    <div className="flex items-center gap-2">
                      <div className="relative w-12 h-12">
                        <svg className="transform -rotate-90 w-12 h-12">
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            className="text-gray-200"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 20}`}
                            strokeDashoffset={`${2 * Math.PI * 20 * (1 - progressPercentage / 100)}`}
                            className="text-qsights-cyan transition-all duration-500"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                          {progressPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Questionnaire Header (Main Title) - respects show_header_in_participant_view */}
            {questionnaire?.settings?.show_header_in_participant_view !== false && (
              <div className="mb-4 p-4 bg-gradient-to-r from-qsights-blue to-qsights-navy rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-white text-center">
                  {questionnaire?.settings?.custom_header_text || questionnaire?.title || "Questionnaire"}
                </h2>
              </div>
            )}

            {/* Current Section */}
            <Card className="overflow-hidden">
              {/* Section Header - only show for single/section modes, not all mode */}
              {displayMode !== 'all' && questionnaire?.settings?.show_section_header !== false && (
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-lg font-bold">
                    {questionnaire?.settings?.section_header_format === 'titleOnly' 
                      ? (currentSection?.title || "Questions")
                      : `Section ${currentSectionIndex + 1}: ${currentSection?.title || "Questions"}`
                    }
                  </CardTitle>
                  {currentSection?.description && (
                    <p className="text-sm text-gray-600 mt-2">{currentSection.description}</p>
                  )}
                </CardHeader>
              )}
              <CardContent className="p-6 space-y-6 overflow-x-auto">
                {displayMode === 'single' ? (
                  // Single Question Mode - show one question at a time
                  currentSectionFiltered && currentSectionFiltered.length > 0 ? (
                    (() => {
                      const question = currentSectionFiltered[currentQuestionIndex];
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
                          {question.type === 'information' ? (
                            // Information block - render only the formatted content without number/title/description
                            <div className="w-full max-w-full overflow-x-auto">{renderQuestion(question)}</div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-qsights-dark text-white rounded-full text-sm font-semibold">
                                {currentQuestionIndex + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div 
                                      className="inline text-base font-medium text-gray-900 prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1"
                                      dangerouslySetInnerHTML={{ __html: getTranslatedText(question, 'question') as string }}
                                    />
                                    {question.is_required && <span className="text-red-500 text-sm font-medium ml-1">*</span>}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-xs text-gray-400 hidden">{question.type}</span>
                                    <PerQuestionLanguageSwitcher
                                      availableLanguages={questionnaire?.languages || activity?.languages || []}
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
                                {/* References - After Question */}
                                {question.references && question.references.filter((r: any) => r.display_position === 'AFTER_QUESTION').length > 0 && (
                                  <ReferencesDisplay 
                                    references={question.references.filter((r: any) => r.display_position === 'AFTER_QUESTION')} 
                                    className="mt-2"
                                  />
                                )}
                                {/* Question Image */}
                                {question.settings?.imageUrl && <QuestionImage imageUrl={question.settings.imageUrl} />}
                                <div className="mt-4 w-full max-w-full overflow-x-auto">{renderQuestion(question)}</div>
                                {/* References - After Answer */}
                                {question.references && question.references.filter((r: any) => r.display_position === 'AFTER_ANSWER').length > 0 && (
                                  <ReferencesDisplay 
                                    references={question.references.filter((r: any) => r.display_position === 'AFTER_ANSWER')} 
                                    className="mt-3"
                                  />
                                )}
                                {/* Comment Box - shows after answering if enabled */}
                                {renderCommentBox(question)}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-500">
                              Question {currentQuestionIndex + 1} of {currentSectionFiltered.length}
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
                  currentSectionFiltered && currentSectionFiltered.length > 0 ? (
                    <div className="space-y-6">
                      {currentSectionFiltered.map((question: any, qIndex: number) => (
                        <div key={question.id || qIndex} className={`space-y-3 pb-6 border-b border-gray-200 last:border-b-0 ${question.type === 'information' ? 'border-b-0 pb-0' : ''}`}>
                          {question.type === 'information' ? (
                            // Information block - render only the formatted content without number/title/description
                            <div className="w-full max-w-full overflow-x-auto">{renderQuestion(question)}</div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-qsights-dark text-white rounded-full text-sm font-semibold">
                                {qIndex + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div 
                                      className="inline text-base font-medium text-gray-900 prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1"
                                      dangerouslySetInnerHTML={{ __html: getTranslatedText(question, 'question') as string }}
                                    />
                                    {question.is_required && <span className="text-red-500 text-sm font-medium ml-1">*</span>}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-xs text-gray-400 hidden">{question.type}</span>
                                    <PerQuestionLanguageSwitcher
                                      availableLanguages={questionnaire?.languages || activity?.languages || []}
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
                                {/* References - After Question */}
                                {question.references && question.references.filter((r: any) => r.display_position === 'AFTER_QUESTION').length > 0 && (
                                  <ReferencesDisplay 
                                    references={question.references.filter((r: any) => r.display_position === 'AFTER_QUESTION')} 
                                    className="mt-2"
                                  />
                                )}
                                {/* Question Image */}
                                {question.settings?.imageUrl && <QuestionImage imageUrl={question.settings.imageUrl} />}
                                <div className="mt-4 w-full max-w-full overflow-x-auto">{renderQuestion(question)}</div>
                                {/* References - After Answer */}
                                {question.references && question.references.filter((r: any) => r.display_position === 'AFTER_ANSWER').length > 0 && (
                                  <ReferencesDisplay 
                                    references={question.references.filter((r: any) => r.display_position === 'AFTER_ANSWER')} 
                                    className="mt-3"
                                  />
                                )}
                                {/* Comment Box - shows after answering if enabled */}
                                {renderCommentBox(question)}
                              </div>
                            </div>
                          )}
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
                    {allFilteredSections && allFilteredSections.length > 0 ? (
                      allFilteredSections.map((section: any, sectionIdx: number) => (
                        <div key={section.id || sectionIdx} className="space-y-4">
                          {/* Section Header - respects show_section_header setting */}
                          {questionnaire?.settings?.show_section_header !== false && (
                            <div className="border-b-2 border-qsights-blue pb-2">
                              <h3 className="text-lg font-bold text-gray-900">
                                {questionnaire?.settings?.section_header_format === 'titleOnly' 
                                  ? (section.title || "Untitled Section")
                                  : `Section ${sectionIdx + 1}: ${section.title || "Untitled Section"}`
                                }
                              </h3>
                              {section.description && (
                                <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                              )}
                            </div>
                          )}
                          
                          {/* Section Questions */}
                          {section.questions && section.questions.length > 0 ? (
                            section.questions.map((question: any, qIdx: number) => (
                              <div key={question.id || qIdx} className={`space-y-3 pb-6 border-b border-gray-200 last:border-0 ${question.type === 'information' ? 'border-b-0 pb-0' : ''}`}>
                                {question.type === 'information' ? (
                                  // Information block - render only the formatted content without number/title/description
                                  <div className="w-full max-w-full overflow-x-auto">{renderQuestion(question)}</div>
                                ) : (
                                  <div className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-qsights-dark text-white rounded-full text-sm font-semibold">
                                      {qIdx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <div 
                                            className="inline text-base font-medium text-gray-900 prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1"
                                            dangerouslySetInnerHTML={{ __html: getTranslatedText(question, 'question') as string }}
                                          />
                                          {question.is_required && <span className="text-red-500 text-sm font-medium ml-1">*</span>}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span className="text-xs text-gray-400 hidden">{question.type}</span>
                                          <PerQuestionLanguageSwitcher
                                            availableLanguages={questionnaire?.languages || activity?.languages || []}
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
                                      {/* References - After Question */}
                                      {question.references && question.references.filter((r: any) => r.display_position === 'AFTER_QUESTION').length > 0 && (
                                        <ReferencesDisplay 
                                          references={question.references.filter((r: any) => r.display_position === 'AFTER_QUESTION')} 
                                          className="mt-2"
                                        />
                                      )}
                                      {/* Question Image */}
                                      {question.settings?.imageUrl && <QuestionImage imageUrl={question.settings.imageUrl} />}
                                      <div className="mt-4 w-full max-w-full overflow-x-auto">{renderQuestion(question)}</div>
                                      {/* References - After Answer */}
                                      {question.references && question.references.filter((r: any) => r.display_position === 'AFTER_ANSWER').length > 0 && (
                                        <ReferencesDisplay 
                                          references={question.references.filter((r: any) => r.display_position === 'AFTER_ANSWER')} 
                                          className="mt-3"
                                        />
                                      )}
                                      {/* Comment Box - shows after answering if enabled */}
                                      {renderCommentBox(question)}
                                    </div>
                                  </div>
                                )}
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
                  const isLastQuestion = currentSection && currentQuestionIndex === currentSectionFiltered.length - 1;
                  const showSubmit = isLastSection && isLastQuestion;
                  const isAssessment = questionnaire?.type === 'assessment';
                  const isPoll = activity?.type === 'poll';

                  // For polls
                  if (isPoll) {
                    const currentSection = questionnaire.sections?.[currentSectionIndex];
                    const currentQuestion = currentSection?.questions[currentQuestionIndex];
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
                            className="px-6 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors flex items-center gap-2"
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
                            className="px-6 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors flex items-center gap-2"
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
                            className="px-6 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors flex items-center gap-2"
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
                    const currentSection = questionnaire.sections?.[currentSectionIndex];
                    const currentQuestion = currentSection?.questions[currentQuestionIndex];
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
                          className="px-6 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors flex items-center gap-2"
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
                      className="px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors flex items-center gap-2"
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
                      className="px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors flex items-center gap-2"
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
          className="w-full px-4 md:px-8 flex items-center py-4 md:py-0 relative z-30"
          style={{ 
            backgroundColor: activity?.landing_config?.footerBackgroundColor || "#F1F5F9",
            minHeight: activity?.landing_config?.footerHeight || "80px",
            pointerEvents: 'auto'
          }}
        >
          <div className="max-w-7xl mx-auto w-full">
            {/* Responsive layout - stacked on mobile, grid on desktop */}
            <div className="flex flex-col md:grid md:grid-cols-3 items-center gap-3 md:gap-4 w-full">
              {/* Left Section */}
              <div className="flex justify-center md:justify-start w-full">
                {activity?.landing_config?.footerLogoUrl && activity.landing_config.footerLogoPosition === 'left' && (
                  <img 
                    src={presignedFooterLogoUrl || activity.landing_config.footerLogoUrl} 
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
                    dangerouslySetInnerHTML={getFooterHtml(
                      activity.landing_config.footerText, 
                      getFooterHyperlinksFromConfig(activity.landing_config)
                    )}
                  />
                )}
              </div>
              
              {/* Center Section */}
              <div className="flex justify-center w-full">
                {activity?.landing_config?.footerLogoUrl && activity.landing_config.footerLogoPosition === 'center' && (
                  <img 
                    src={presignedFooterLogoUrl || activity.landing_config.footerLogoUrl} 
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
                    dangerouslySetInnerHTML={getFooterHtml(
                      activity.landing_config.footerText, 
                      getFooterHyperlinksFromConfig(activity.landing_config)
                    )}
                  />
                )}
              </div>
              
              {/* Right Section */}
              <div className="flex justify-center md:justify-end w-full">
                {activity?.landing_config?.footerLogoUrl && activity.landing_config.footerLogoPosition === 'right' && (
                  <img 
                    src={presignedFooterLogoUrl || activity.landing_config.footerLogoUrl} 
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
                    dangerouslySetInnerHTML={getFooterHtml(
                      activity.landing_config.footerText, 
                      getFooterHyperlinksFromConfig(activity.landing_config)
                    )}
                  />
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

      {/* Notification Reminder Floating Button - Only show if reminders are enabled */}
      {activity?.start_date && !submitted && activity?.allow_participant_reminders && (
        <button
          onClick={handleAddToCalendar}
          className={`fixed z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-200 transform bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-xl hover:from-green-600 hover:to-emerald-600 hover:scale-105 cursor-pointer ${
            activity?.contact_us_enabled ? 'bottom-20 right-6' : 'bottom-6 right-6'
          }`}
          title="Add to Calendar - Get Reminder"
        >
          <BellRing className="w-5 h-5 fill-current" />
          <span className="hidden sm:inline text-sm font-medium">Get Reminder</span>
        </button>
      )}

      {/* Contact Us Floating Button */}
      {activity?.contact_us_enabled && !submitted && (
        <button
          onClick={() => setShowContactModal(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r bg-qsights-dark text-white rounded-full shadow-lg hover:shadow-xl hover:bg-qsights-dark/90 transition-all duration-200 transform hover:scale-105"
          title="Contact Us"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline text-sm font-medium">Contact Us</span>
        </button>
      )}

      {/* Contact Us Modal */}
      <EventContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        activityId={activity?.id || ""}
        activityName={activity?.name || ""}
        participantId={participantId || undefined}
        participantName={participantData?.name || undefined}
        participantEmail={participantData?.email || undefined}
      />
    </div>
  );
}
