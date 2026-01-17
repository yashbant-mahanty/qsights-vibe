"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  FileText,
  Calendar,
  Users,
  Globe,
  Eye,
  Save,
  CheckCircle,
  Settings,
  Plus,
  X,
  GripVertical,
  Clock,
  UserPlus,
  Languages,
} from "lucide-react";
import {
  questionnairesApi,
  activitiesApi,
  activityApprovalsApi,
  programsApi,
  type Questionnaire,
  type Program,
} from "@/lib/api";
import { toast } from "@/components/ui/toast";
import RegistrationFormBuilder, {
  type FormField,
} from "@/components/registration-form-builder";

const defaultMandatoryRegistrationFields: FormField[] = [
  {
    id: "name",
    name: "name",
    type: "text",
    label: "Full Name",
    placeholder: "Enter your full name",
    required: true,
    order: 0,
    isMandatory: true,
  },
  {
    id: "email",
    name: "email",
    type: "email",
    label: "Email Address",
    placeholder: "Enter your email address",
    required: true,
    order: 1,
    isMandatory: true,
  },
];

export default function CreateActivityPage() {
  const router = useRouter();
  const [activityData, setActivityData] = useState<{
    title: string;
    senderEmail: string;
    description: string;
    type: string;
    programId: string;
    startDate: string;
    endDate: string;
    managerName: string;
    managerEmail: string;
    projectCode: string;
    configurationDate: string;
    configurationPrice: string;
    subscriptionPrice: string;
    subscriptionFrequency: string;
    taxPercentage: string;
    numberOfParticipants: string;
    questionsToRandomize: string;
    allowGuests: boolean;
    isMultilingual: boolean;
    selectedLanguages: string[];
    timeLimitEnabled: boolean;
    timeLimitMinutes: number;
    passPercentage: number;
    maxRetakes: number | null;
    displayMode?: string;
  }>({
    title: "",
    senderEmail: "",
    description: "",
    type: "survey",
    programId: "",
    startDate: "",
    endDate: "",
    managerName: "",
    managerEmail: "",
    projectCode: "",
    configurationDate: "",
    configurationPrice: "",
    subscriptionPrice: "",
    subscriptionFrequency: "",
    taxPercentage: "",
    numberOfParticipants: "",
    questionsToRandomize: "",
    allowGuests: false,
    isMultilingual: false,
    selectedLanguages: ["EN"],
    timeLimitEnabled: false,
    timeLimitMinutes: 30,
    passPercentage: 80,
    maxRetakes: null,
    displayMode: "all",
  });

  // Registration form fields - Name and Email are mandatory
  const [registrationFields, setRegistrationFields] = useState<FormField[]>([
    ...defaultMandatoryRegistrationFields,
  ]);

  const [selectedQuestionnaires, setSelectedQuestionnaires] = useState<
    string[]
  >([]);
  const [availableQuestionnaires, setAvailableQuestionnaires] = useState<
    any[]
  >([]);
  const [availablePrograms, setAvailablePrograms] = useState<Program[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questionnaireLanguages, setQuestionnaireLanguages] = useState<string[]>(["EN"]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const normalizeRegistrationFields = (fields: FormField[]): FormField[] => {
    const base = fields && fields.length > 0 ? fields : defaultMandatoryRegistrationFields;

    const normalized = base.map((field, index) => {
      const id = field.id || field.name || `field_${index}`;
      const name = field.name || id;
      const isMandatory = id === "name" || id === "email" ? true : field.isMandatory;
      return {
        ...field,
        id,
        name,
        isMandatory,
        required: isMandatory ? true : field.required ?? false,
        order: field.order ?? index,
      } as FormField;
    });

    const hasName = normalized.some((f) => f.id === "name");
    const hasEmail = normalized.some((f) => f.id === "email");

    const missingMandatory = defaultMandatoryRegistrationFields.filter(
      (f) => (f.id === "name" && !hasName) || (f.id === "email" && !hasEmail)
    );

    return [...missingMandatory, ...normalized].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
  };

  async function loadInitialData() {
    try {
      setLoading(true);
      // Load user data
      const userResponse = await fetch("/api/auth/me");
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setCurrentUser(userData.user);
        // Set program if user has one
        if (userData.user?.programId) {
          setActivityData((prev) => ({
            ...prev,
            programId: userData.user.programId,
          }));
        }
      }

      // Load programs and questionnaires in parallel
      await Promise.all([loadPrograms(), loadQuestionnaires()]);
    } catch (err) {
      console.error("Failed to load initial data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadPrograms() {
    try {
      // Get current user to check role and programId
      const userResponse = await fetch('/api/auth/me');
      let data;
      if (userResponse.ok) {
        const userData = await userResponse.json();
        const user = userData.user;
        
        // If user is program-admin, program-manager, or program-moderator, filter by their program
        if (user && user.programId && ['program-admin', 'program-manager', 'program-moderator'].includes(user.role)) {
          // For program-level roles, only show their assigned program
          const allPrograms = await programsApi.getAll();
          data = allPrograms.filter((p: any) => p.id === user.programId);
        } else {
          data = await programsApi.getAll();
        }
      } else {
        data = await programsApi.getAll();
      }
      setAvailablePrograms(data);
    } catch (err) {
      console.error("Failed to load programs:", err);
    }
  }

  async function loadQuestionnaires() {
    try {
      // Get current user to check role and programId
      const userResponse = await fetch('/api/auth/me');
      let data;
      if (userResponse.ok) {
        const userData = await userResponse.json();
        const user = userData.user;
        
        // If user is program-admin, program-manager, or program-moderator, filter by their program
        if (user && user.programId && ['program-admin', 'program-manager', 'program-moderator'].includes(user.role)) {
          data = await questionnairesApi.getAll({ program_id: user.programId });
        } else {
          data = await questionnairesApi.getAll();
        }
      } else {
        data = await questionnairesApi.getAll();
      }
      
      // Transform questionnaires to match the format needed
      const transformed = data.map((q: Questionnaire) => {
        const totalQuestions =
          q.sections?.reduce((total, section) => {
            return total + (section.questions?.length || 0);
          }, 0) || 0;

        // Capitalize first letter of type
        const displayType = q.type ? q.type.charAt(0).toUpperCase() + q.type.slice(1) : "Survey";

        return {
          id: q.id,
          title: q.title,
          code: q.id.substring(0, 8).toUpperCase(),
          questions: totalQuestions,
          type: displayType,
          originalType: q.type ? q.type.toLowerCase() : "survey",
          languages: (q as any).languages || ["EN"],
        };
      });
      setAvailableQuestionnaires(transformed);
    } catch (err) {
      console.error("Failed to load questionnaires:", err);
    }
  }

  const availableLanguages = [
    { code: "EN", name: "English", color: "bg-blue-100 text-blue-700" },
    { code: "ES", name: "Español", color: "bg-red-100 text-red-700" },
    { code: "FR", name: "Français", color: "bg-purple-100 text-purple-700" },
    { code: "DE", name: "Deutsch", color: "bg-yellow-100 text-yellow-700" },
    { code: "IT", name: "Italiano", color: "bg-green-100 text-green-700" },
    { code: "PT", name: "Português", color: "bg-orange-100 text-orange-700" },
    { code: "ZH", name: "中文", color: "bg-pink-100 text-pink-700" },
    { code: "JA", name: "日本語", color: "bg-indigo-100 text-indigo-700" },
    { code: "HI", name: "हिन्दी (Hindi)", color: "bg-amber-100 text-amber-700" },
    { code: "BN", name: "বাংলা (Bengali)", color: "bg-teal-100 text-teal-700" },
    { code: "TA", name: "தமிழ் (Tamil)", color: "bg-rose-100 text-rose-700" },
    { code: "TE", name: "తెలుగు (Telugu)", color: "bg-cyan-100 text-cyan-700" },
    { code: "MR", name: "मराठी (Marathi)", color: "bg-lime-100 text-lime-700" },
    { code: "GU", name: "ગુજરાતી (Gujarati)", color: "bg-violet-100 text-violet-700" },
    { code: "KN", name: "ಕನ್ನಡ (Kannada)", color: "bg-fuchsia-100 text-fuchsia-700" },
    { code: "ML", name: "മലയാളം (Malayalam)", color: "bg-emerald-100 text-emerald-700" },
    { code: "PA", name: "ਪੰਜਾਬੀ (Punjabi)", color: "bg-sky-100 text-sky-700" },
    { code: "UR", name: "اردو (Urdu)", color: "bg-stone-100 text-stone-700" },
    { code: "AR", name: "العربية (Arabic)", color: "bg-slate-100 text-slate-700" },
    { code: "RU", name: "Русский (Russian)", color: "bg-red-200 text-red-800" },
    { code: "KO", name: "한국어 (Korean)", color: "bg-blue-200 text-blue-800" },
    { code: "TR", name: "Türkçe (Turkish)", color: "bg-orange-200 text-orange-800" },
    { code: "VI", name: "Tiếng Việt (Vietnamese)", color: "bg-yellow-200 text-yellow-800" },
    { code: "TH", name: "ไทย (Thai)", color: "bg-green-200 text-green-800" },
    { code: "ID", name: "Bahasa Indonesia", color: "bg-purple-200 text-purple-800" },
    { code: "NL", name: "Nederlands (Dutch)", color: "bg-pink-200 text-pink-800" },
    { code: "PL", name: "Polski (Polish)", color: "bg-indigo-200 text-indigo-800" },
    { code: "SV", name: "Svenska (Swedish)", color: "bg-cyan-200 text-cyan-800" },
    { code: "NO", name: "Norsk (Norwegian)", color: "bg-teal-200 text-teal-800" },
    { code: "DA", name: "Dansk (Danish)", color: "bg-lime-200 text-lime-800" },
    { code: "FI", name: "Suomi (Finnish)", color: "bg-amber-200 text-amber-800" },
    { code: "EL", name: "Ελληνικά (Greek)", color: "bg-rose-200 text-rose-800" },
    { code: "HE", name: "עברית (Hebrew)", color: "bg-violet-200 text-violet-800" },
    { code: "CS", name: "Čeština (Czech)", color: "bg-fuchsia-200 text-fuchsia-800" },
    { code: "HU", name: "Magyar (Hungarian)", color: "bg-emerald-200 text-emerald-800" },
    { code: "RO", name: "Română (Romanian)", color: "bg-sky-200 text-sky-800" },
    { code: "UK", name: "Українська (Ukrainian)", color: "bg-stone-200 text-stone-800" },
  ];

  // Update available languages when questionnaires are selected
  useEffect(() => {
    if (selectedQuestionnaires.length > 0) {
      const languagesSet = new Set<string>(["EN"]); // Always include English
      selectedQuestionnaires.forEach(qId => {
        const questionnaire = availableQuestionnaires.find(q => q.id === qId);
        if (questionnaire && questionnaire.languages) {
          questionnaire.languages.forEach((lang: string) => languagesSet.add(lang));
        }
      });
      const uniqueLanguages = Array.from(languagesSet);
      setQuestionnaireLanguages(uniqueLanguages);
      
      // Filter selected languages to only include those available in questionnaires
      setActivityData(prev => ({
        ...prev,
        selectedLanguages: prev.selectedLanguages.filter(lang => uniqueLanguages.includes(lang))
      }));
    } else {
      setQuestionnaireLanguages(["EN"]);
      setActivityData(prev => ({ ...prev, selectedLanguages: ["EN"] }));
    }
  }, [selectedQuestionnaires, availableQuestionnaires]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setActivityData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleQuestionnaire = (id: string) => {
    setSelectedQuestionnaires((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]
    );
  };

  const toggleLanguage = (code: string) => {
    if (code === "EN") return; // English is required
    setActivityData((prev) => ({
      ...prev,
      selectedLanguages: prev.selectedLanguages.includes(code)
        ? prev.selectedLanguages.filter((lang) => lang !== code)
        : [...prev.selectedLanguages, code],
    }));
  };

  const moveQuestionnaire = (index: number, direction: "up" | "down") => {
    const newOrder = [...selectedQuestionnaires];
    if (direction === "up" && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [
        newOrder[index - 1],
        newOrder[index],
      ];
    } else if (direction === "down" && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [
        newOrder[index + 1],
        newOrder[index],
      ];
    }
    setSelectedQuestionnaires(newOrder);
  };

  const validateActivity = () => {
    if (!activityData.title.trim()) {
      toast({ title: "Validation Error", description: "Please enter an activity title", variant: "warning" });
      return false;
    }
    if (!activityData.programId) {
      toast({ title: "Validation Error", description: "Please select a program", variant: "warning" });
      return false;
    }
    if (!activityData.startDate || !activityData.endDate) {
      toast({ title: "Validation Error", description: "Please select start and end dates", variant: "warning" });
      return false;
    }
    if (selectedQuestionnaires.length === 0) {
      toast({ title: "Validation Error", description: "Please assign at least one questionnaire", variant: "warning" });
      return false;
    }
    return true;
  };

  const handlePublish = async () => {
    if (!validateActivity()) return;

    try {
      setSaving(true);
      const normalizedRegistrationFields = normalizeRegistrationFields(registrationFields);
      // Get organization_id from the selected program
      const selectedProgram = availablePrograms.find(
        (p) => p.id === activityData.programId
      );
      if (!selectedProgram) {
        toast({ title: "Error", description: "Selected program not found", variant: "error" });
        return;
      }

      // Check if user needs approval (program-admin, program-manager)
      const requiresApproval = currentUser && ['program-admin', 'program-manager'].includes(currentUser.role);

      if (requiresApproval) {
        // Submit approval request instead of creating activity
        const approvalPayload = {
          name: activityData.title,
          sender_email: activityData.senderEmail || undefined,
          description: activityData.description,
          type: activityData.type as "survey" | "poll" | "assessment",
          program_id: activityData.programId,
          start_date: activityData.startDate,
          end_date: activityData.endDate,
          questionnaire_id: selectedQuestionnaires[0], // Primary questionnaire
          allow_guests: activityData.allowGuests,
          is_multilingual: activityData.isMultilingual,
          languages: activityData.selectedLanguages,
          registration_form_fields: normalizedRegistrationFields,
          time_limit_enabled: activityData.timeLimitEnabled,
          time_limit_minutes: activityData.timeLimitEnabled ? activityData.timeLimitMinutes : undefined,
          pass_percentage: activityData.type === 'assessment' ? activityData.passPercentage : undefined,
          max_retakes: activityData.type === 'assessment' ? activityData.maxRetakes ?? undefined : undefined,
          settings: {
            display_mode: activityData.displayMode || 'all'
          },
          // Additional Details fields
          manager_name: activityData.managerName || undefined,
          manager_email: activityData.managerEmail || undefined,
          project_code: activityData.projectCode || undefined,
          configuration_date: activityData.configurationDate || undefined,
          configuration_price: activityData.configurationPrice ? parseFloat(activityData.configurationPrice) : undefined,
          subscription_price: activityData.subscriptionPrice ? parseFloat(activityData.subscriptionPrice) : undefined,
          subscription_frequency: activityData.subscriptionFrequency || undefined,
          tax_percentage: activityData.taxPercentage ? parseFloat(activityData.taxPercentage) : undefined,
          number_of_participants: activityData.numberOfParticipants ? parseInt(activityData.numberOfParticipants) : undefined,
          questions_to_randomize: activityData.questionsToRandomize ? parseInt(activityData.questionsToRandomize) : undefined,
        };

        await activityApprovalsApi.create(approvalPayload);
        toast({ 
          title: "Approval Request Submitted!", 
          description: "Your event has been submitted for Super Admin approval. You'll be notified once reviewed.", 
          variant: "success" 
        });
        router.push("/activities");
      } else {
        // Super-admin and admin can create directly
        const activityPayload = {
          name: activityData.title,
          description: activityData.description,
          type: activityData.type as "survey" | "poll" | "assessment",
          status: "live" as const,
          program_id: activityData.programId,
          organization_id: selectedProgram.organization_id,
          start_date: activityData.startDate,
          end_date: activityData.endDate,
          questionnaire_id: selectedQuestionnaires[0],
          allow_guests: activityData.allowGuests,
          is_multilingual: activityData.isMultilingual,
          languages: activityData.selectedLanguages,
          registration_form_fields: normalizedRegistrationFields,
          time_limit_enabled: activityData.timeLimitEnabled,
          time_limit_minutes: activityData.timeLimitEnabled ? activityData.timeLimitMinutes : undefined,
          pass_percentage: activityData.type === 'assessment' ? activityData.passPercentage : undefined,
          max_retakes: activityData.type === 'assessment' ? activityData.maxRetakes ?? undefined : undefined,
          settings: {
            display_mode: activityData.displayMode || 'all'
          },
          // Additional Details fields
          sender_email: activityData.senderEmail || undefined,
          manager_name: activityData.managerName || undefined,
          manager_email: activityData.managerEmail || undefined,
          project_code: activityData.projectCode || undefined,
          configuration_date: activityData.configurationDate || undefined,
          configuration_price: activityData.configurationPrice ? parseFloat(activityData.configurationPrice) : undefined,
          subscription_price: activityData.subscriptionPrice ? parseFloat(activityData.subscriptionPrice) : undefined,
          subscription_frequency: activityData.subscriptionFrequency || undefined,
          tax_percentage: activityData.taxPercentage ? parseFloat(activityData.taxPercentage) : undefined,
          number_of_participants: activityData.numberOfParticipants ? parseInt(activityData.numberOfParticipants) : undefined,
          questions_to_randomize: activityData.questionsToRandomize ? parseInt(activityData.questionsToRandomize) : undefined,
        };

        await activitiesApi.create(activityPayload);
        toast({ title: "Success!", description: "Activity published successfully!", variant: "success" });
        router.push("/activities");
      }
    } catch (err) {
      console.error("Failed to publish activity:", err);
      toast({ 
        title: "Error", 
        description: "Failed to publish activity: " + (err instanceof Error ? err.message : "Unknown error"),
        variant: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!activityData.title.trim()) {
      toast({ title: "Validation Error", description: "Please enter an activity title", variant: "warning" });
      return;
    }

    if (!activityData.programId) {
      toast({ title: "Validation Error", description: "Please select a program to save draft", variant: "warning" });
      return;
    }

    try {
      setSaving(true);
      const normalizedRegistrationFields = normalizeRegistrationFields(registrationFields);
      // Get organization_id from the selected program
      const selectedProgram = availablePrograms.find(
        (p) => p.id === activityData.programId
      );
      if (!selectedProgram) {
        toast({ title: "Error", description: "Selected program not found", variant: "error" });
        return;
      }

      // Check if user needs approval (program-admin, program-manager)
      const requiresApproval = currentUser && ['program-admin', 'program-manager'].includes(currentUser.role);

      if (requiresApproval) {
        // Submit approval request
        const approvalPayload = {
          name: activityData.title,
          description: activityData.description,
          type: activityData.type as "survey" | "poll" | "assessment",
          program_id: activityData.programId,
          start_date: activityData.startDate || undefined,
          end_date: activityData.endDate || undefined,
          questionnaire_id: selectedQuestionnaires[0] || undefined,
          allow_guests: activityData.allowGuests,
          is_multilingual: activityData.isMultilingual,
          languages: activityData.selectedLanguages,
          registration_form_fields: normalizedRegistrationFields,
          time_limit_enabled: activityData.timeLimitEnabled,
          time_limit_minutes: activityData.timeLimitEnabled ? activityData.timeLimitMinutes : undefined,
          pass_percentage: activityData.type === 'assessment' ? activityData.passPercentage : undefined,
          max_retakes: activityData.type === 'assessment' ? activityData.maxRetakes ?? undefined : undefined,
          settings: {
            display_mode: activityData.displayMode || 'all'
          },
          // Additional Details fields
          sender_email: activityData.senderEmail || undefined,
          manager_name: activityData.managerName || undefined,
          manager_email: activityData.managerEmail || undefined,
          project_code: activityData.projectCode || undefined,
          configuration_date: activityData.configurationDate || undefined,
          configuration_price: activityData.configurationPrice ? parseFloat(activityData.configurationPrice) : undefined,
          subscription_price: activityData.subscriptionPrice ? parseFloat(activityData.subscriptionPrice) : undefined,
          subscription_frequency: activityData.subscriptionFrequency || undefined,
          tax_percentage: activityData.taxPercentage ? parseFloat(activityData.taxPercentage) : undefined,
          number_of_participants: activityData.numberOfParticipants ? parseInt(activityData.numberOfParticipants) : undefined,
          questions_to_randomize: activityData.questionsToRandomize ? parseInt(activityData.questionsToRandomize) : undefined,
        };

        await activityApprovalsApi.create(approvalPayload);
        toast({ 
          title: "Approval Request Submitted!", 
          description: "Your event has been submitted for Super Admin approval.", 
          variant: "success" 
        });
        router.push("/activities");
        return;
      }

      const activityPayload = {
        name: activityData.title,
        description: activityData.description,
        type: activityData.type as "survey" | "poll" | "assessment",
        status: "draft" as const,
        program_id: activityData.programId,
        organization_id: selectedProgram.organization_id,
        start_date: activityData.startDate || undefined,
        end_date: activityData.endDate || undefined,
        questionnaire_id: selectedQuestionnaires[0] || undefined,
        allow_guests: activityData.allowGuests,
        is_multilingual: activityData.isMultilingual,
        languages: activityData.selectedLanguages,
        registration_form_fields: normalizedRegistrationFields,
        time_limit_enabled: activityData.timeLimitEnabled,
        time_limit_minutes: activityData.timeLimitEnabled ? activityData.timeLimitMinutes : undefined,
        pass_percentage: activityData.type === 'assessment' ? activityData.passPercentage : undefined,
        max_retakes: activityData.type === 'assessment' ? activityData.maxRetakes ?? undefined : undefined,
        settings: {
          display_mode: activityData.displayMode || 'all'
        },
        // Additional Details fields
        sender_email: activityData.senderEmail || undefined,
        manager_name: activityData.managerName || undefined,
        manager_email: activityData.managerEmail || undefined,
        project_code: activityData.projectCode || undefined,
        configuration_date: activityData.configurationDate || undefined,
        configuration_price: activityData.configurationPrice ? parseFloat(activityData.configurationPrice) : undefined,
        subscription_price: activityData.subscriptionPrice ? parseFloat(activityData.subscriptionPrice) : undefined,
        subscription_frequency: activityData.subscriptionFrequency || undefined,
        tax_percentage: activityData.taxPercentage ? parseFloat(activityData.taxPercentage) : undefined,
        number_of_participants: activityData.numberOfParticipants ? parseInt(activityData.numberOfParticipants) : undefined,
        questions_to_randomize: activityData.questionsToRandomize ? parseInt(activityData.questionsToRandomize) : undefined,
      };

      await activitiesApi.create(activityPayload);
      toast({ title: "Success!", description: "Activity saved as draft!", variant: "success" });
      router.push("/activities");
    } catch (err) {
      console.error("Failed to save draft:", err);
      toast({ 
        title: "Error", 
        description: "Failed to save draft: " + (err instanceof Error ? err.message : "Unknown error"),
        variant: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    if (!validateActivity()) return;
    // Store activity data in sessionStorage for preview
    sessionStorage.setItem(
      "previewActivity",
      JSON.stringify({
        ...activityData,
        questionnaires: selectedQuestionnaires,
      })
    );
    router.push("/activities/preview");
  };

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <a
            href="/activities"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Create Event
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Set up a new survey, poll, or assessment
            </p>
          </div>
        </div>

        {/* Info Cards - Positioned below title */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Activity Checklist */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                📋 Event Checklist
              </h4>
              <ul className="text-xs text-blue-800 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      activityData.title ? "text-green-600" : "text-blue-400"
                    }`}
                  />
                  <span>Event title</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      activityData.programId
                        ? "text-green-600"
                        : "text-blue-400"
                    }`}
                  />
                  <span>Program selected</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      activityData.startDate && activityData.endDate
                        ? "text-green-600"
                        : "text-blue-400"
                    }`}
                  />
                  <span>Timeline configured</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      selectedQuestionnaires.length > 0
                        ? "text-green-600"
                        : "text-blue-400"
                    }`}
                  />
                  <span>Questionnaires assigned</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">📊 Quick Stats</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">
                    Questionnaires
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {selectedQuestionnaires.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">
                    Languages
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {activityData.isMultilingual
                      ? activityData.selectedLanguages.length
                      : 1}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">
                    Guest Access
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {activityData.allowGuests ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-qsights-blue" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label
                    htmlFor="title"
                    className="text-sm font-medium text-gray-700"
                  >
                    Activity Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="e.g., Employee Satisfaction Survey Q1"
                    value={activityData.title}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <Label
                    htmlFor="type"
                    className="text-sm font-medium text-gray-700"
                  >
                    Activity Type <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="type"
                    name="type"
                    value={activityData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                  >
                    <option value="survey">Survey</option>
                    <option value="poll">Poll</option>
                    <option value="assessment">Assessment</option>
                  </select>
                </div>

                {/* Program Selection */}
                <div className="space-y-2">
                  <Label
                    htmlFor="programId"
                    className="text-sm font-medium text-gray-700"
                  >
                    Program <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="programId"
                    name="programId"
                    value={activityData.programId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                    disabled={loading}
                  >
                    <option value="">Select a program</option>
                    {availablePrograms.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                  {!loading && availablePrograms.length === 0 && (
                    <p className="text-xs text-red-600">
                      No programs available. Please create a program first.
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="text-sm font-medium text-gray-700"
                  >
                    Description
                  </Label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    placeholder="Describe the purpose and goals of this activity..."
                    value={activityData.description}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-qsights-blue" />
                  Additional Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Sender Email */}
                <div className="space-y-2">
                  <Label htmlFor="senderEmail" className="text-sm font-medium text-gray-700">
                    Sender Email ID
                  </Label>
                  <Input
                    id="senderEmail"
                    name="senderEmail"
                    type="email"
                    placeholder="e.g., noreply@company.com"
                    value={activityData.senderEmail}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Manager Name */}
                  <div className="space-y-2">
                    <Label htmlFor="managerName" className="text-sm font-medium text-gray-700">
                      Manager Name
                    </Label>
                    <Input
                      id="managerName"
                      name="managerName"
                      type="text"
                      placeholder="e.g., John Smith"
                      value={activityData.managerName}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>

                  {/* Manager Email */}
                  <div className="space-y-2">
                    <Label htmlFor="managerEmail" className="text-sm font-medium text-gray-700">
                      Manager Email ID
                    </Label>
                    <Input
                      id="managerEmail"
                      name="managerEmail"
                      type="email"
                      placeholder="e.g., manager@company.com"
                      value={activityData.managerEmail}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Project Code */}
                <div className="space-y-2">
                  <Label htmlFor="projectCode" className="text-sm font-medium text-gray-700">
                    Project Code
                  </Label>
                  <Input
                    id="projectCode"
                    name="projectCode"
                    type="text"
                    placeholder="e.g., PRJ-2025-001"
                    value={activityData.projectCode}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Configuration Date */}
                  <div className="space-y-2">
                    <Label htmlFor="configurationDate" className="text-sm font-medium text-gray-700">
                      Configuration Date
                    </Label>
                    <Input
                      id="configurationDate"
                      name="configurationDate"
                      type="date"
                      value={activityData.configurationDate}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>

                  {/* Configuration Price */}
                  <div className="space-y-2">
                    <Label htmlFor="configurationPrice" className="text-sm font-medium text-gray-700">
                      Configuration Price (₹)
                    </Label>
                    <Input
                      id="configurationPrice"
                      name="configurationPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g., 5000.00"
                      value={activityData.configurationPrice}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Subscription Price */}
                  <div className="space-y-2">
                    <Label htmlFor="subscriptionPrice" className="text-sm font-medium text-gray-700">
                      Subscription Price (₹)
                    </Label>
                    <Input
                      id="subscriptionPrice"
                      name="subscriptionPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g., 1000.00"
                      value={activityData.subscriptionPrice}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>

                  {/* Subscription Frequency */}
                  <div className="space-y-2">
                    <Label htmlFor="subscriptionFrequency" className="text-sm font-medium text-gray-700">
                      Subscription Frequency
                    </Label>
                    <select
                      id="subscriptionFrequency"
                      name="subscriptionFrequency"
                      value={activityData.subscriptionFrequency}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                    >
                      <option value="">Select frequency</option>
                      <option value="one-time">One-time</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tax Percentage */}
                  <div className="space-y-2">
                    <Label htmlFor="taxPercentage" className="text-sm font-medium text-gray-700">
                      Tax (%)
                    </Label>
                    <Input
                      id="taxPercentage"
                      name="taxPercentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="e.g., 18.00"
                      value={activityData.taxPercentage}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>

                  {/* Number of Expected Participants */}
                  <div className="space-y-2">
                    <Label htmlFor="numberOfParticipants" className="text-sm font-medium text-gray-700">
                      Number of Expected Participants
                    </Label>
                    <Input
                      id="numberOfParticipants"
                      name="numberOfParticipants"
                      type="number"
                      min="0"
                      placeholder="e.g., 100"
                      value={activityData.numberOfParticipants}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Questions to Randomize */}
                <div className="space-y-2">
                  <Label htmlFor="questionsToRandomize" className="text-sm font-medium text-gray-700">
                    Number of Questions to Randomize
                  </Label>
                  <Input
                    id="questionsToRandomize"
                    name="questionsToRandomize"
                    type="number"
                    min="0"
                    placeholder="e.g., 10"
                    value={activityData.questionsToRandomize}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Randomly select and display this many questions from the questionnaire pool
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-qsights-blue" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="startDate"
                      className="text-sm font-medium text-gray-700"
                    >
                      Start Date <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="startDate"
                        name="startDate"
                        type="date"
                        value={activityData.startDate}
                        onChange={handleInputChange}
                        className="w-full pl-10"
                      />
                    </div>
                  </div>

                  {/* End Date */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="endDate"
                      className="text-sm font-medium text-gray-700"
                    >
                      End Date <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="endDate"
                        name="endDate"
                        type="date"
                        value={activityData.endDate}
                        onChange={handleInputChange}
                        className="w-full pl-10"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Activity will be accessible to participants during this period
                </p>
              </CardContent>
            </Card>

            {/* Time Limit Settings */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-qsights-blue" />
                  Time Limit (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="timeLimitEnabled"
                    checked={activityData.timeLimitEnabled}
                    onChange={(e) =>
                      setActivityData((prev) => ({
                        ...prev,
                        timeLimitEnabled: e.target.checked,
                      }))
                    }
                    className="mt-1 w-4 h-4 text-qsights-blue border-gray-300 rounded focus:ring-qsights-blue"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="timeLimitEnabled"
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Enable time limit for this activity
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Set a countdown timer that automatically submits responses when time expires
                    </p>
                  </div>
                </div>

                {activityData.timeLimitEnabled && (
                  <div className="space-y-2 ml-7">
                    <Label
                      htmlFor="timeLimitMinutes"
                      className="text-sm font-medium text-gray-700"
                    >
                      Time Limit (minutes) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="timeLimitMinutes"
                      name="timeLimitMinutes"
                      type="number"
                      min="1"
                      max="1440"
                      value={activityData.timeLimitMinutes}
                      onChange={handleInputChange}
                      className="w-full max-w-xs"
                      placeholder="30"
                    />
                    <p className="text-xs text-gray-500">
                      Participants will have {activityData.timeLimitMinutes} minutes to complete the activity
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assessment Settings - Only show for assessments */}
            {activityData.type === 'assessment' && (
              <Card>
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-qsights-blue" />
                    Assessment Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Pass Percentage */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="passPercentage"
                      className="text-sm font-medium text-gray-700"
                    >
                      Pass Percentage <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="passPercentage"
                        name="passPercentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={activityData.passPercentage}
                        onChange={handleInputChange}
                        className="w-32"
                      />
                      <span className="text-sm text-gray-600">%</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Minimum percentage required to pass the assessment (e.g., 80% means 8 out of 10 correct)
                    </p>
                  </div>

                  {/* Max Retakes */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="maxRetakes"
                      className="text-sm font-medium text-gray-700"
                    >
                      Maximum Retakes Allowed
                    </Label>
                    <select
                      id="maxRetakes"
                      name="maxRetakes"
                      value={activityData.maxRetakes === null ? 'unlimited' : activityData.maxRetakes}
                      onChange={(e) => {
                        const value = e.target.value === 'unlimited' ? null : parseInt(e.target.value);
                        setActivityData((prev) => ({ ...prev, maxRetakes: value }));
                      }}
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                    >
                      <option value="0">No Retakes</option>
                      <option value="1">1 Retake</option>
                      <option value="2">2 Retakes</option>
                      <option value="3">3 Retakes</option>
                      <option value="5">5 Retakes</option>
                      <option value="unlimited">Unlimited</option>
                    </select>
                    <p className="text-xs text-gray-500">
                      {activityData.maxRetakes === null 
                        ? 'Participants can retake the assessment unlimited times'
                        : activityData.maxRetakes === 0
                        ? 'Participants cannot retake the assessment'
                        : `Participants can retake the assessment up to ${activityData.maxRetakes} time${activityData.maxRetakes > 1 ? 's' : ''}`
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Display Mode Settings */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-qsights-blue" />
                  Display Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Choose how questions will be displayed to participants
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setActivityData((prev) => ({ ...prev, displayMode: 'all' }))
                    }
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      activityData.displayMode === 'all'
                        ? 'border-qsights-blue bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 mb-1">All Questions</div>
                    <div className="text-sm text-gray-500">
                      Display all questions on one page
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActivityData((prev) => ({ ...prev, displayMode: 'single' }))
                    }
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      activityData.displayMode === 'single'
                        ? 'border-qsights-blue bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 mb-1">Single Question</div>
                    <div className="text-sm text-gray-500">
                      One question per page with navigation
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActivityData((prev) => ({ ...prev, displayMode: 'section' }))
                    }
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      activityData.displayMode === 'section'
                        ? 'border-qsights-blue bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 mb-1">Section-wise Questions</div>
                    <div className="text-sm text-gray-500">
                      Display all questions from one section at a time
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Questionnaire Assignment */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-qsights-blue" />
                  Questionnaire Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  Select and order the questionnaires for this activity
                </p>

                {/* Selected Questionnaires */}
                {selectedQuestionnaires.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Selected Questionnaires ({selectedQuestionnaires.length})
                    </Label>
                    <div className="space-y-2">
                      {selectedQuestionnaires.map((qId, index) => {
                        const questionnaire = availableQuestionnaires.find(
                          (q) => q.id === qId
                        );
                        if (!questionnaire) return null;
                        return (
                          <div
                            key={qId}
                            className="flex items-center gap-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg"
                          >
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => moveQuestionnaire(index, "up")}
                                disabled={index === 0}
                                className="p-0.5 hover:bg-blue-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <GripVertical className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() =>
                                  moveQuestionnaire(index, "down")
                                }
                                disabled={
                                  index === selectedQuestionnaires.length - 1
                                }
                                className="p-0.5 hover:bg-blue-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <GripVertical className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">
                                {index + 1}. {questionnaire.title}
                              </p>
                              <p className="text-xs text-gray-600 font-mono">
                                {questionnaire.code} • {questionnaire.questions}{" "}
                                questions
                              </p>
                            </div>
                            <button
                              onClick={() => toggleQuestionnaire(qId)}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Available Questionnaires */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Available Questionnaires
                  </Label>
                  <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-qsights-blue mx-auto"></div>
                          <p className="mt-2 text-xs text-gray-500">
                            Loading questionnaires...
                          </p>
                        </div>
                      </div>
                    ) : availableQuestionnaires.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">
                          No questionnaires available
                        </p>
                      </div>
                    ) : availableQuestionnaires.filter((q) => !selectedQuestionnaires.includes(q.id) && q.originalType === activityData.type).length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">
                          No {activityData.type} questionnaires available
                        </p>
                      </div>
                    ) : (
                      availableQuestionnaires
                        .filter((q) => !selectedQuestionnaires.includes(q.id) && q.originalType === activityData.type)
                        .map((questionnaire) => (
                          <div
                            key={questionnaire.id}
                            onClick={() =>
                              toggleQuestionnaire(questionnaire.id)
                            }
                            className="p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-qsights-blue hover:bg-blue-50 transition-all"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900">
                                  {questionnaire.title}
                                </p>
                                <p className="text-xs text-gray-600 font-mono mt-0.5">
                                  {questionnaire.code}
                                </p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                  <span>
                                    {questionnaire.questions} questions
                                  </span>
                                  <span>•</span>
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                    {questionnaire.type}
                                  </span>
                                </div>
                              </div>
                              <Plus className="w-5 h-5 text-qsights-blue" />
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Participant Registration Form Builder */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-qsights-blue" />
                  Participant Registration Form
                </CardTitle>
                <p className="text-xs text-gray-600 mt-1">
                  Customize which information to collect from participants
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <RegistrationFormBuilder
                  fields={registrationFields}
                  onChange={setRegistrationFields}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Settings className="w-4 h-4 text-qsights-blue" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Guest Access */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <UserPlus className="w-4 h-4 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Allow Guest Access
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Enable participation without login
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activityData.allowGuests}
                        onChange={(e) =>
                          setActivityData((prev) => ({
                            ...prev,
                            allowGuests: e.target.checked,
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-qsights-blue"></div>
                    </label>
                  </div>
                  {activityData.allowGuests && (
                    <div className="ml-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        A public link will be generated for guest access
                      </p>
                    </div>
                  )}
                </div>

                {/* Multilingual Support */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <Languages className="w-4 h-4 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Multilingual Support
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Enable multiple languages
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activityData.isMultilingual}
                        onChange={(e) =>
                          setActivityData((prev) => ({
                            ...prev,
                            isMultilingual: e.target.checked,
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-qsights-blue"></div>
                    </label>
                  </div>

                  {activityData.isMultilingual && (
                    <div className="ml-6 space-y-2">
                      <p className="text-xs font-medium text-gray-700">
                        Select Languages
                      </p>
                      {questionnaireLanguages.length > 1 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {availableLanguages.filter(lang => questionnaireLanguages.includes(lang.code)).map((lang) => (
                          <div
                            key={lang.code}
                            onClick={() => toggleLanguage(lang.code)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                              activityData.selectedLanguages.includes(lang.code)
                                ? "bg-blue-100 border-2 border-blue-300"
                                : "bg-gray-50 border-2 border-gray-200 hover:border-gray-300"
                            } ${
                              lang.code === "EN"
                                ? "cursor-not-allowed opacity-75"
                                : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded ${lang.color}`}
                              >
                                {lang.code}
                              </span>
                              <span className="text-xs text-gray-700">
                                {lang.name}
                              </span>
                            </div>
                            {activityData.selectedLanguages.includes(
                              lang.code
                            ) && (
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-xs text-gray-600">
                            {selectedQuestionnaires.length === 0 
                              ? "Please select questionnaires first to see available languages."
                              : "Selected questionnaires only support English."}
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {activityData.selectedLanguages.length} language(s)
                        selected
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <button
                  onClick={handlePublish}
                  disabled={saving}
                  className="w-full px-4 py-2.5 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Publishing..." : "Publish Activity"}
                </button>
                <button
                  onClick={handlePreview}
                  disabled={saving}
                  className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  Preview Activity
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save as Draft"}
                </button>
                <button
                  onClick={() => router.push("/activities")}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors text-center"
                >
                  Cancel
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RoleBasedLayout>
  );
}
