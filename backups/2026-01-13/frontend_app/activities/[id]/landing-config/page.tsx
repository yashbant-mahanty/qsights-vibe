"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Save,
  Eye,
  Image as ImageIcon,
  Upload,
  X,
  Palette,
  Type,
  Layout,
  Loader2,
  RefreshCw,
  Plus,
  Code,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import { activitiesApi } from "@/lib/api";
import { toast } from "@/components/ui/toast";

interface LandingPageConfig {
  // Logo
  logoUrl: string;
  logoSize: string; // small, medium, large
  
  // Page Title
  pageTitle: string;
  pageTitleColor: string;
  pageTitleSize: string;
  
  // Top Banner
  bannerEnabled: boolean; // Enable/disable banner display
  bannerImageUrl: string;
  bannerImagePosition: string;
  bannerHeight: string;
  bannerBackgroundColor: string;
  bannerText: string;
  bannerTextColor: string;
  bannerTextPosition: string;
  bannerShowOnInnerPages: boolean;
  
  // Footer
  footerEnabled: boolean;
  footerText: string;
  footerTextColor: string;
  footerTextPosition: string;
  footerBackgroundColor: string;
  footerHeight: string;
  footerLogoUrl: string;
  footerLogoPosition: string;
  footerLogoSize: string;
  
  // Logo Position
  logoPosition: string;
  
  // Overall Background
  backgroundColor: string;
  backgroundImageUrl: string;
  backgroundStyle: string; // solid, gradient, image
  gradientFrom: string;
  gradientTo: string;
  
  // Left Content Block
  leftContentEnabled: boolean;
  leftContentTitle: string;
  leftContentTitleColor: string;
  leftContentDescription: string;
  leftContentDescriptionColor: string;
  leftContentImageUrl: string;
  leftContentImagePosition: string;
  leftContentBackgroundColor: string;
  
  // Features/Benefits Section
  featuresEnabled: boolean;
  features: Array<{
    icon: string;
    title: string;
    description: string;
    color: string;
  }>;
  
  // Login Box Customization
  activityCardHeaderColor: string; // Color of the card header where activity name appears
  loginBoxTitle: string;
  loginBoxSubtitle: string;
  loginBoxBackgroundColor: string;
  loginBoxBorderColor: string;
  loginBoxAlignment: string; // "left" | "center" | "right"
  loginBoxBannerLogoUrl: string;
  loginBoxShowTitle: boolean; // Toggle to show/hide survey title in login box
  loginBoxBackgroundImageUrl: string; // Background image for login box
  loginBoxBackgroundOpacity: number; // Opacity of background image (0-100)
  loginButtonColor: string;
  loginButtonText: string;
  
  // Thank You Page
  thankYouTitle: string;
  thankYouMessage: string;
  thankYouSubMessage: string;
  thankYouIconColor: string;
  thankYouShowConfirmation: boolean;
  
  // Additional Branding
  accentColor: string;
  fontFamily: string;
  borderRadius: string; // rounded, square, pill
  
  // Custom CSS
  customCss: string;
  
  // CSS & Fonts - Typography
  cssTypography: {
    primaryFontFamily: string;
    customGoogleFontUrl: string;
    fontWeight: string;
    baseFontSize: string;
    lineHeight: string;
  };
  
  // CSS & Fonts - Headings
  cssHeadings: {
    h1Size: string;
    h2Size: string;
    h3Size: string;
    headingFontWeight: string;
    headingColor: string;
    letterSpacing: string;
  };
  
  // CSS & Fonts - Buttons
  cssButtons: {
    buttonFontFamily: string;
    buttonFontSize: string;
    buttonBorderRadius: string;
    buttonHoverOpacity: number;
    buttonDisabledOpacity: number;
  };
  
  // CSS & Fonts - Scope Control
  cssScopeControl: {
    applyToLandingPage: boolean;
    applyToPostLandingPage: boolean;
    applyToThankYouPage: boolean;
    applyToLoggedInParticipants: boolean;
    applyToAnonymousUsers: boolean;
  };
  
  // CSS & Fonts - Theme Preset
  cssThemePreset: string;
}

const defaultConfig: LandingPageConfig = {
  logoUrl: "",
  logoSize: "medium",
  pageTitle: "Welcome",
  pageTitleColor: "#1F2937",
  pageTitleSize: "large",
  bannerImageUrl: "",
  bannerImagePosition: "center",
  bannerHeight: "200px",
  bannerBackgroundColor: "#3B82F6",
  bannerText: "",
  bannerTextColor: "#FFFFFF",
  bannerTextPosition: "left",
  bannerEnabled: true,
  bannerShowOnInnerPages: false,
  footerEnabled: true,
  footerText: "© 2025 All rights reserved.",
  footerTextColor: "#6B7280",
  footerTextPosition: "left",
  footerBackgroundColor: "#F9FAFB",
  footerHeight: "80px",
  footerLogoUrl: "",
  footerLogoPosition: "left",
  footerLogoSize: "medium",
  backgroundColor: "#FFFFFF",
  backgroundImageUrl: "",
  backgroundStyle: "solid",
  gradientFrom: "#F3F4F6",
  gradientTo: "#DBEAFE",
  leftContentEnabled: true,
  leftContentTitle: "Professional Survey Platform",
  leftContentTitleColor: "#1F2937",
  leftContentDescription: "Create and manage surveys with advanced analytics and insights.",
  leftContentDescriptionColor: "#6B7280",
  leftContentImageUrl: "",
  leftContentImagePosition: "top",
  leftContentBackgroundColor: "#FFFFFF",
  featuresEnabled: true,
  features: [
    { icon: "check", title: "Easy to Use", description: "Simple and intuitive interface", color: "#10B981" },
    { icon: "shield", title: "Secure", description: "Your data is protected", color: "#3B82F6" },
    { icon: "clock", title: "Quick", description: "Get started in minutes", color: "#F59E0B" },
    { icon: "users", title: "Collaborative", description: "Work with your team", color: "#8B5CF6" },
  ],
  activityCardHeaderColor: "#3B82F6",
  loginBoxTitle: "Sign In",
  loginBoxSubtitle: "Enter your credentials to continue",
  loginBoxBackgroundColor: "#FFFFFF",
  loginBoxBorderColor: "#E5E7EB",
  loginBoxAlignment: "center",
  loginBoxBannerLogoUrl: "",
  loginBoxShowTitle: true,
  loginBoxBackgroundImageUrl: "",
  loginBoxBackgroundOpacity: 50,
  loginButtonColor: "#3B82F6",
  loginButtonText: "Sign In",
  logoPosition: "left",
  thankYouTitle: "Thank you!",
  thankYouMessage: "Your response has been submitted",
  thankYouSubMessage: "We appreciate your participation",
  thankYouIconColor: "#10B981",
  thankYouShowConfirmation: true,
  accentColor: "#3B82F6",
  fontFamily: "system",
  borderRadius: "rounded",
  customCss: "",
  // CSS & Fonts defaults
  cssTypography: {
    primaryFontFamily: "system",
    customGoogleFontUrl: "",
    fontWeight: "normal",
    baseFontSize: "16px",
    lineHeight: "1.5",
  },
  cssHeadings: {
    h1Size: "2.25rem",
    h2Size: "1.875rem",
    h3Size: "1.5rem",
    headingFontWeight: "bold",
    headingColor: "#1F2937",
    letterSpacing: "normal",
  },
  cssButtons: {
    buttonFontFamily: "inherit",
    buttonFontSize: "14px",
    buttonBorderRadius: "8px",
    buttonHoverOpacity: 90,
    buttonDisabledOpacity: 50,
  },
  cssScopeControl: {
    applyToLandingPage: true,
    applyToPostLandingPage: true,
    applyToThankYouPage: true,
    applyToLoggedInParticipants: true,
    applyToAnonymousUsers: true,
  },
  cssThemePreset: "default",
};

export default function LandingPageConfigPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;
  
  const [config, setConfig] = useState<LandingPageConfig>(defaultConfig);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("landing-page");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  useEffect(() => {
    loadConfig();
  }, [activityId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await activitiesApi.getLandingPageConfig(activityId);
      
      // Define fallback templates
      const fallbackTemplates = [
        {
          name: "Modern Professional",
          description: "Clean blue professional theme",
          config: { bannerBackgroundColor: "#3B82F6", backgroundColor: "#FFFFFF", footerBackgroundColor: "#F9FAFB", loginButtonColor: "#3B82F6", activityCardHeaderColor: "#3B82F6", loginBoxAlignment: "center", leftContentEnabled: false }
        },
        {
          name: "Gradient Blue",
          description: "Eye-catching gradient design",
          config: { bannerBackgroundColor: "#0EA5E9", backgroundColor: "#F0F9FF", footerBackgroundColor: "#0284C7", loginButtonColor: "#0EA5E9", activityCardHeaderColor: "#0284C7", loginBoxAlignment: "center", leftContentEnabled: false }
        },
        {
          name: "Minimal White",
          description: "Minimalist black and white",
          config: { bannerBackgroundColor: "#000000", backgroundColor: "#FFFFFF", footerBackgroundColor: "#F3F4F6", loginButtonColor: "#000000", activityCardHeaderColor: "#1F2937", loginBoxAlignment: "center", leftContentEnabled: false }
        },
        {
          name: "Split Screen",
          description: "Left content panel with right-aligned form",
          config: { 
            bannerBackgroundColor: "#0EA5E9", 
            backgroundColor: "#F8FAFC", 
            footerBackgroundColor: "#F1F5F9", 
            loginButtonColor: "#F97316", 
            activityCardHeaderColor: "#0EA5E9",
            loginBoxAlignment: "right",
            leftContentEnabled: true,
            leftContentBackgroundColor: "#0EA5E9",
            leftContentTitle: "Welcome to Our Survey",
            leftContentTitleColor: "#FFFFFF",
            leftContentDescription: "Your feedback helps us improve. Thank you for participating!",
            leftContentDescriptionColor: "#E0F2FE"
          }
        }
      ];
      
      // Extract templates if available, otherwise use fallback
      const loadedTemplates = response.templates && Array.isArray(response.templates) ? response.templates : fallbackTemplates;
      setTemplates(loadedTemplates);
      
      // Extract config - API returns { config: {...}, templates: [...] }
      let data = response.config || response;
      console.log("Loaded config from API:", data);
      
      // Check if config is nested (old format: { config: {...} })
      if (data && data.config && typeof data.config === 'object') {
        console.log("Detected nested config structure, extracting inner config");
        data = data.config;
      }
      
      if (data && Object.keys(data).length > 0) {
        // Merge with default config to ensure all fields are present
        const mergedConfig = { ...defaultConfig, ...data };
        console.log("Merged config:", mergedConfig);
        setConfig(mergedConfig);
        
        // Detect which template is currently applied by comparing key properties
        // First try exact match
        let detectedTemplateIndex = loadedTemplates.findIndex((template: any) => {
          const templateConfig = template.config;
          return (
            templateConfig.bannerBackgroundColor === mergedConfig.bannerBackgroundColor &&
            templateConfig.backgroundColor === mergedConfig.backgroundColor &&
            templateConfig.footerBackgroundColor === mergedConfig.footerBackgroundColor &&
            templateConfig.loginButtonColor === mergedConfig.loginButtonColor &&
            templateConfig.activityCardHeaderColor === mergedConfig.activityCardHeaderColor &&
            templateConfig.leftContentEnabled === mergedConfig.leftContentEnabled
          );
        });
        
        // If no exact match, try "close match" - match 4+ out of 6 properties
        // This helps when user makes small customizations but still uses a template base
        if (detectedTemplateIndex === -1) {
          detectedTemplateIndex = loadedTemplates.findIndex((template: any) => {
            const templateConfig = template.config;
            let matchCount = 0;
            
            if (templateConfig.backgroundColor === mergedConfig.backgroundColor) matchCount++;
            if (templateConfig.footerBackgroundColor === mergedConfig.footerBackgroundColor) matchCount++;
            if (templateConfig.loginButtonColor === mergedConfig.loginButtonColor) matchCount++;
            if (templateConfig.activityCardHeaderColor === mergedConfig.activityCardHeaderColor) matchCount++;
            if (templateConfig.leftContentEnabled === mergedConfig.leftContentEnabled) matchCount++;
            
            // Consider it a match if 4+ properties match (excluding banner which users often customize)
            return matchCount >= 4;
          });
        }
        
        if (detectedTemplateIndex !== -1) {
          console.log("Detected applied template:", detectedTemplateIndex);
          setSelectedTemplate(detectedTemplateIndex);
        }
      } else {
        console.log("Using default config");
        setConfig(defaultConfig);
      }
    } catch (err) {
      console.error("Failed to load landing page config:", err);
      // If no config exists, use default and show templates
      const fallbackTemplates = [
        {
          name: "Modern Professional",
          description: "Clean blue professional theme",
          config: { bannerBackgroundColor: "#3B82F6", backgroundColor: "#FFFFFF", footerBackgroundColor: "#F9FAFB", loginButtonColor: "#3B82F6", activityCardHeaderColor: "#3B82F6", loginBoxAlignment: "center", leftContentEnabled: false }
        },
        {
          name: "Gradient Blue",
          description: "Eye-catching gradient design",
          config: { bannerBackgroundColor: "#0EA5E9", backgroundColor: "#F0F9FF", footerBackgroundColor: "#0284C7", loginButtonColor: "#0EA5E9", activityCardHeaderColor: "#0284C7", loginBoxAlignment: "center", leftContentEnabled: false }
        },
        {
          name: "Minimal White",
          description: "Minimalist black and white",
          config: { bannerBackgroundColor: "#000000", backgroundColor: "#FFFFFF", footerBackgroundColor: "#F3F4F6", loginButtonColor: "#000000", activityCardHeaderColor: "#1F2937", loginBoxAlignment: "center", leftContentEnabled: false }
        },
        {
          name: "Split Screen",
          description: "Left content panel with right-aligned form",
          config: { 
            bannerBackgroundColor: "#0EA5E9", 
            backgroundColor: "#F8FAFC", 
            footerBackgroundColor: "#F1F5F9", 
            loginButtonColor: "#F97316", 
            activityCardHeaderColor: "#0EA5E9",
            loginBoxAlignment: "right",
            leftContentEnabled: true,
            leftContentBackgroundColor: "#0EA5E9",
            leftContentTitle: "Welcome to Our Survey",
            leftContentTitleColor: "#FFFFFF",
            leftContentDescription: "Your feedback helps us improve. Thank you for participating!",
            leftContentDescriptionColor: "#E0F2FE"
          }
        }
      ];
      
      setConfig(defaultConfig);
      setTemplates(fallbackTemplates);
      
      // Check if default config matches any template
      // First try exact match
      let detectedTemplateIndex = fallbackTemplates.findIndex((template: any) => {
        const templateConfig = template.config;
        return (
          templateConfig.bannerBackgroundColor === defaultConfig.bannerBackgroundColor &&
          templateConfig.backgroundColor === defaultConfig.backgroundColor &&
          templateConfig.footerBackgroundColor === defaultConfig.footerBackgroundColor &&
          templateConfig.loginButtonColor === defaultConfig.loginButtonColor &&
          templateConfig.activityCardHeaderColor === defaultConfig.activityCardHeaderColor &&
          templateConfig.leftContentEnabled === defaultConfig.leftContentEnabled
        );
      });
      
      // If no exact match, try "close match" - match 4+ out of 6 properties
      if (detectedTemplateIndex === -1) {
        detectedTemplateIndex = fallbackTemplates.findIndex((template: any) => {
          const templateConfig = template.config;
          let matchCount = 0;
          
          if (templateConfig.backgroundColor === defaultConfig.backgroundColor) matchCount++;
          if (templateConfig.footerBackgroundColor === defaultConfig.footerBackgroundColor) matchCount++;
          if (templateConfig.loginButtonColor === defaultConfig.loginButtonColor) matchCount++;
          if (templateConfig.activityCardHeaderColor === defaultConfig.activityCardHeaderColor) matchCount++;
          if (templateConfig.leftContentEnabled === defaultConfig.leftContentEnabled) matchCount++;
          
          return matchCount >= 4;
        });
      }
      
      if (detectedTemplateIndex !== -1) {
        console.log("Default config matches template:", detectedTemplateIndex);
        setSelectedTemplate(detectedTemplateIndex);
      }
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (templateConfig: any, index: number) => {
    console.log("Applying template:", index, templateConfig);
    const newConfig = { ...defaultConfig, ...templateConfig };
    console.log("New config:", newConfig);
    setConfig(newConfig);
    setSelectedTemplate(index);
    toast({ 
      title: "Template Applied", 
      description: "Template has been applied successfully! Click Save Configuration to keep changes.",
      duration: 4000
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log("Saving config:", config);
      await activitiesApi.saveLandingPageConfig(activityId, config);
      
      // Reload the preview iframe to show updated landing page
      const iframe = document.querySelector('iframe[title="Landing Page Preview"]') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = `/activities/take/${activityId}?preview=true&t=${Date.now()}`; // Force reload with timestamp
      }
      
      toast({ title: "Success", description: "Landing page configuration saved successfully! Preview updated.", duration: 3000 });
    } catch (err) {
      console.error("Failed to save config:", err);
      toast({ title: "Error", description: "Failed to save configuration. Please try again.", variant: "error", duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    window.open(`/activities/take/${activityId}?preview=true`, '_blank');
  };

  const handleReset = () => {
    if (confirm("Reset to default configuration? This will discard all changes.")) {
      setConfig(defaultConfig);
    }
  };

  const updateConfig = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (field: string, file: File) => {
    try {
      const result = await activitiesApi.uploadLandingImage(activityId, file, field);
      updateConfig(field, result.url);
    } catch (err) {
      console.error("Failed to upload image:", err);
      // Fallback to local URL for now
      const url = URL.createObjectURL(file);
      updateConfig(field, url);
      toast({
        title: "Warning",
        description: "Image upload failed. Using temporary local URL. Please save to persist.",
        variant: "warning",
      });
    }
  };

  const addFeature = () => {
    setConfig(prev => ({
      ...prev,
      features: [...prev.features, { icon: "check", title: "", description: "", color: "#3B82F6" }]
    }));
  };

  const removeFeature = (index: number) => {
    setConfig(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const updateFeature = (index: number, field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? { ...f, [field]: value } : f)
    }));
  };

  if (loading) {
    return (
      <RoleBasedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading configuration...</p>
          </div>
        </div>
      </RoleBasedLayout>
    );
  }

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push("/activities")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Landing Page Configuration</h1>
              <p className="text-sm text-gray-500">Customize the participant login experience</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset</span>
            </Button>
            <Button
              variant="outline"
              onClick={handlePreview}
              className="flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: "landing-page", label: "Design for Landing Page", icon: Layout, description: "Configure the initial landing and login experience" },
              { id: "post-landing", label: "Post Landing Page", icon: Palette, description: "Customize the page shown after login" },
              { id: "thank-you", label: "Thank You Page", icon: Type, description: "Configure the completion message" },
              { id: "css-fonts", label: "CSS & Fonts", icon: Code, description: "Advanced styling and typography controls" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.description}
                className={`flex items-center space-x-2 pb-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Configuration Content */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Landing Page Tab */}
            {activeTab === "landing-page" && (
              <>
                {/* Tab Info */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">Design for Landing Page</h3>
                  <p className="text-sm text-blue-700">Configure all aspects of the participant's first landing and login experience, including branding, layout, and interactive elements.</p>
                </div>

                {/* Live Preview & Templates */}
                {templates.length > 0 && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Predefined Templates</CardTitle>
            <p className="text-sm text-gray-500">
              Choose a template to quickly set up your landing page. Click on any template to apply it.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map((template: any, index: number) => (
                <div
                  key={index}
                  className={`relative border-2 rounded-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all group ${
                    selectedTemplate === index 
                      ? 'border-blue-600 ring-4 ring-blue-300 shadow-lg' 
                      : 'border-gray-300 hover:border-blue-500'
                  }`}
                  onClick={() => applyTemplate(template.config, index)}
                >
                  {/* Applied Indicator Badge */}
                  {selectedTemplate === index && (
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-lg animate-in fade-in zoom-in duration-300">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-bold">APPLIED</span>
                    </div>
                  )}
                  
                  {/* Template Preview Image */}
                  <div 
                    className="relative h-48 overflow-hidden flex"
                    style={{ backgroundColor: template.config.backgroundColor || "#F9FAFB" }}
                  >
                    {/* Left content panel (for split-screen template) */}
                    {template.config.leftContentEnabled && (
                      <div 
                        className="w-1/2 h-full flex items-center justify-center p-2"
                        style={{ backgroundColor: template.config.leftContentBackgroundColor || "#0EA5E9" }}
                      >
                        <div className="text-center">
                          <div className="w-8 h-8 bg-white/20 rounded-full mx-auto mb-2"></div>
                          <div className="h-1 bg-white/40 rounded w-16 mx-auto mb-1"></div>
                          <div className="h-1 bg-white/30 rounded w-12 mx-auto"></div>
                        </div>
                      </div>
                    )}
                    
                    {/* Main content area */}
                    <div className={`relative ${template.config.leftContentEnabled ? 'w-1/2' : 'w-full'} h-full`}>
                      {/* Mini banner */}
                      <div 
                        className="w-full h-12" 
                        style={{ backgroundColor: template.config.bannerBackgroundColor || "#3B82F6" }}
                      />
                      {/* Mini card */}
                      <div className={`absolute top-16 ${template.config.leftContentEnabled ? 'left-1/2 transform -translate-x-1/2' : 'left-1/2 transform -translate-x-1/2'} w-32 bg-white rounded shadow-md p-2`}>
                        <div 
                          className="w-full h-6 rounded mb-2 flex items-center justify-center"
                          style={{ backgroundColor: template.config.activityCardHeaderColor || template.config.bannerBackgroundColor || "#3B82F6" }}
                        >
                          <span className="text-white text-[8px] font-bold">Activity</span>
                        </div>
                        <div className="space-y-1">
                          <div className="h-2 bg-gray-200 rounded w-full"></div>
                          <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                        </div>
                        <div 
                          className="w-full h-4 rounded mt-2 flex items-center justify-center"
                          style={{ backgroundColor: template.config.loginButtonColor || "#3B82F6" }}
                        >
                          <span className="text-white text-[6px]">Start</span>
                        </div>
                      </div>
                      {/* Mini footer */}
                      <div 
                        className="absolute bottom-0 w-full h-6" 
                        style={{ backgroundColor: template.config.footerBackgroundColor || "#F9FAFB" }}
                      />
                    </div>
                  </div>
                  
                  {/* Template Info */}
                  <div className={`p-4 transition-colors ${selectedTemplate === index ? 'bg-blue-50' : 'bg-white'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`font-semibold text-sm ${selectedTemplate === index ? 'text-blue-900' : 'text-gray-900'}`}>
                        {template.name}
                      </h3>
                      {selectedTemplate === index ? (
                        <div className="flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-600 text-white rounded-md font-semibold">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>Active</span>
                        </div>
                      ) : (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-xs text-blue-600 font-medium">Click to apply →</span>
                        </div>
                      )}
                    </div>
                    <p className={`text-xs mb-3 ${selectedTemplate === index ? 'text-blue-700' : 'text-gray-600'}`}>
                      {template.description}
                    </p>
                    <div className="flex gap-2">
                      <div
                        className="w-6 h-6 rounded border shadow-sm"
                        style={{ backgroundColor: template.config.bannerBackgroundColor }}
                        title="Banner Color"
                      />
                      <div
                        className="w-6 h-6 rounded border shadow-sm"
                        style={{ backgroundColor: template.config.backgroundColor }}
                        title="Background Color"
                      />
                      <div
                        className="w-6 h-6 rounded border shadow-sm"
                        style={{ backgroundColor: template.config.loginButtonColor }}
                        title="Button Color"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

<Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <ImageIcon className="w-5 h-5" />
                      <span>Logo Configuration</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Logo Image</Label>
                      <p className="text-xs text-gray-500 mt-1">Upload a file or enter an image URL (e.g., S3 bucket URL)</p>
                      <div className="mt-2 space-y-3">
                        {config.logoUrl && (
                          <div className="flex items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <img src={config.logoUrl} alt="Logo" className="h-20 max-w-full object-contain" />
                          </div>
                        )}
                        
                        {/* URL Input */}
                        <div>
                          <Label className="text-xs text-gray-600">Image URL</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="url"
                              value={config.logoUrl || ""}
                              onChange={(e) => updateConfig("logoUrl", e.target.value)}
                              placeholder="https://example.com/logo.png"
                              className="flex-1"
                            />
                            {config.logoUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateConfig("logoUrl", "")}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Example: https://bq-common.s3.ap-south-1.amazonaws.com/logos/logo.png</p>
                        </div>
                        
                        {/* File Upload (Future: will upload to S3) */}
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload("logoUrl", file);
                            }}
                            className="hidden"
                            id="logo-upload"
                          />
                          <label htmlFor="logo-upload">
                            <Button variant="outline" className="cursor-pointer w-full" asChild>
                              <span>
                                <Upload className="w-4 h-4 mr-2" />
                                Or Upload File (Temporary)
                              </span>
                            </Button>
                          </label>
                          <p className="text-xs text-gray-400 mt-1">Note: File uploads are temporary. Use URL for permanent storage.</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>Logo Size</Label>
                      <select
                        value={config.logoSize}
                        onChange={(e) => updateConfig("logoSize", e.target.value)}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                    <div>
                      <Label>Logo Position in Banner</Label>
                      <select
                        value={config.logoPosition || "left"}
                        onChange={(e) => updateConfig("logoPosition", e.target.value)}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Page Title</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Title Text</Label>
                      <Input
                        value={config.pageTitle}
                        onChange={(e) => updateConfig("pageTitle", e.target.value)}
                        placeholder="Welcome to Our Survey"
                        className="mt-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Title Color</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <input
                            type="color"
                            value={config.pageTitleColor}
                            onChange={(e) => updateConfig("pageTitleColor", e.target.value)}
                            className="h-10 w-20"
                          />
                          <Input
                            value={config.pageTitleColor}
                            onChange={(e) => updateConfig("pageTitleColor", e.target.value)}
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Title Size</Label>
                        <select
                          value={config.pageTitleSize}
                          onChange={(e) => updateConfig("pageTitleSize", e.target.value)}
                          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                          <option value="xlarge">Extra Large</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Top Banner</CardTitle>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.bannerEnabled !== false}
                          onChange={(e) => updateConfig("bannerEnabled", e.target.checked)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-gray-600">Enable</span>
                      </label>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Banner Image</Label>
                      <p className="text-xs text-gray-500 mt-1">Enter an image URL or upload a file</p>
                      <div className="mt-2 space-y-3">
                        {config.bannerImageUrl && (
                          <div className="relative">
                            <img
                              src={config.bannerImageUrl}
                              alt="Banner"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => updateConfig("bannerImageUrl", "")}
                              disabled={config.bannerEnabled === false}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        
                        {/* URL Input */}
                        <div>
                          <Label className="text-xs text-gray-600">Image URL</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="url"
                              value={config.bannerImageUrl || ""}
                              onChange={(e) => updateConfig("bannerImageUrl", e.target.value)}
                              placeholder="https://example.com/banner.jpg"
                              className="flex-1"
                              disabled={config.bannerEnabled === false}
                            />
                            {config.bannerImageUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateConfig("bannerImageUrl", "")}
                                disabled={config.bannerEnabled === false}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* File Upload */}
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload("bannerImageUrl", file);
                            }}
                            className="hidden"
                            id="banner-upload"
                          />
                          <label htmlFor="banner-upload">
                            <Button variant="outline" className="w-full cursor-pointer" asChild>
                              <span>
                                <Upload className="w-4 h-4 mr-2" />
                                Or Upload File (Temporary)
                              </span>
                            </Button>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>Banner Image Position</Label>
                      <select
                        value={config.bannerImagePosition || "center"}
                        onChange={(e) => updateConfig("bannerImagePosition", e.target.value)}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Banner Height</Label>
                        <Input
                          value={config.bannerHeight}
                          onChange={(e) => updateConfig("bannerHeight", e.target.value)}
                          placeholder="200px"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>Background Color</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <input
                            type="color"
                            value={config.bannerBackgroundColor}
                            onChange={(e) => updateConfig("bannerBackgroundColor", e.target.value)}
                            className="h-10 w-20"
                          />
                          <Input
                            value={config.bannerBackgroundColor}
                            onChange={(e) => updateConfig("bannerBackgroundColor", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>Banner Text</Label>
                      <Input
                        value={config.bannerText}
                        onChange={(e) => updateConfig("bannerText", e.target.value)}
                        placeholder="Optional banner text"
                        className="mt-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Banner Text Color</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <input
                            type="color"
                            value={config.bannerTextColor}
                            onChange={(e) => updateConfig("bannerTextColor", e.target.value)}
                            className="h-10 w-20"
                          />
                          <Input
                            value={config.bannerTextColor}
                            onChange={(e) => updateConfig("bannerTextColor", e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Banner Text Position</Label>
                        <select
                          value={config.bannerTextPosition || "left"}
                          onChange={(e) => updateConfig("bannerTextPosition", e.target.value)}
                          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.bannerShowOnInnerPages || false}
                          onChange={(e) => updateConfig("bannerShowOnInnerPages", e.target.checked)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">Show banner on inner pages</span>
                          <p className="text-xs text-gray-600 mt-0.5">Enable this to display the banner on survey/assessment/poll pages (not just landing page)</p>
                        </div>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Footer</CardTitle>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.footerEnabled !== false}
                          onChange={(e) => updateConfig("footerEnabled", e.target.checked)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-gray-600">Enable</span>
                      </label>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Footer Text</Label>
                      <Input
                        value={config.footerText}
                        onChange={(e) => updateConfig("footerText", e.target.value)}
                        placeholder="© 2025 All rights reserved"
                        className="mt-2"
                        disabled={config.footerEnabled === false}
                      />
                    </div>
                    <div>
                      <Label>Footer Text Position</Label>
                      <select
                        value={config.footerTextPosition || "left"}
                        onChange={(e) => updateConfig("footerTextPosition", e.target.value)}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                        disabled={config.footerEnabled === false}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                    <div>
                      <Label>Footer Logo</Label>
                      <p className="text-xs text-gray-500 mt-1">Optional logo for footer area</p>
                      <div className="mt-2 space-y-3">
                        {config.footerLogoUrl && (
                          <div className="flex items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <img src={config.footerLogoUrl} alt="Footer Logo" className="h-12 max-w-full object-contain" />
                          </div>
                        )}
                        <div>
                          <Label className="text-xs text-gray-600">Logo URL</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="url"
                              value={config.footerLogoUrl || ""}
                              onChange={(e) => updateConfig("footerLogoUrl", e.target.value)}
                              placeholder="https://example.com/footer-logo.png"
                              className="flex-1"
                              disabled={config.footerEnabled === false}
                            />
                            {config.footerLogoUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateConfig("footerLogoUrl", "")}
                                disabled={config.footerEnabled === false}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload("footerLogoUrl", file);
                            }}
                            className="hidden"
                            id="footer-logo-upload"
                            disabled={config.footerEnabled === false}
                          />
                          <label htmlFor="footer-logo-upload">
                            <Button variant="outline" className="w-full cursor-pointer" asChild disabled={config.footerEnabled === false}>
                              <span>
                                <Upload className="w-4 h-4 mr-2" />
                                Or Upload File (Temporary)
                              </span>
                            </Button>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>Footer Logo Size</Label>
                      <select
                        value={config.footerLogoSize || "medium"}
                        onChange={(e) => updateConfig("footerLogoSize", e.target.value)}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                        disabled={config.footerEnabled === false}
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                    <div>
                      <Label>Footer Logo Position</Label>
                      <select
                        value={config.footerLogoPosition || "left"}
                        onChange={(e) => updateConfig("footerLogoPosition", e.target.value)}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                        disabled={config.footerEnabled === false}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Text Color</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <input
                            type="color"
                            value={config.footerTextColor}
                            onChange={(e) => updateConfig("footerTextColor", e.target.value)}
                            className="h-10 w-20"
                            disabled={config.footerEnabled === false}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Background Color</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <input
                            type="color"
                            value={config.footerBackgroundColor}
                            onChange={(e) => updateConfig("footerBackgroundColor", e.target.value)}
                            className="h-10 w-20"
                            disabled={config.footerEnabled === false}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Height</Label>
                        <Input
                          value={config.footerHeight}
                          onChange={(e) => updateConfig("footerHeight", e.target.value)}
                          placeholder="80px"
                          className="mt-2"
                          disabled={config.footerEnabled === false}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Post Landing Page Tab */}
            {activeTab === "post-landing" && (
              <>
                {/* Tab Info */}
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-purple-900 mb-1">Post Landing Page</h3>
                  <p className="text-sm text-purple-700">Configure the page shown after participants log in but before they start the activity. This includes background styling and layout controls.</p>
                </div>

                {/* Header / Top Banner */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Header / Top Banner</CardTitle>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.bannerEnabled !== false}
                          onChange={(e) => updateConfig("bannerEnabled", e.target.checked)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-gray-600">Enable</span>
                      </label>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Banner configuration for post-login pages</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Banner Image</Label>
                      <p className="text-xs text-gray-500 mt-1">Upload a file or enter an image URL</p>
                      <div className="mt-2 space-y-3">
                        {config.bannerImageUrl && (
                          <div className="relative">
                            <img
                              src={config.bannerImageUrl}
                              alt="Banner"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => updateConfig("bannerImageUrl", "")}
                              disabled={config.bannerEnabled === false}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        
                        {/* URL Input */}
                        <div>
                          <Label className="text-xs text-gray-600">Image URL</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="url"
                              value={config.bannerImageUrl || ""}
                              onChange={(e) => updateConfig("bannerImageUrl", e.target.value)}
                              placeholder="https://example.com/banner.jpg"
                              className="flex-1"
                              disabled={config.bannerEnabled === false}
                            />
                            {config.bannerImageUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateConfig("bannerImageUrl", "")}
                                disabled={config.bannerEnabled === false}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* File Upload */}
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload("bannerImageUrl", file);
                            }}
                            className="hidden"
                            id="banner-upload-post"
                            disabled={config.bannerEnabled === false}
                          />
                          <label htmlFor="banner-upload-post">
                            <Button variant="outline" className="w-full cursor-pointer" asChild disabled={config.bannerEnabled === false}>
                              <span>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Banner Image
                              </span>
                            </Button>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Banner Background Color</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <input
                            type="color"
                            value={config.bannerBackgroundColor}
                            onChange={(e) => updateConfig("bannerBackgroundColor", e.target.value)}
                            className="h-10 w-20"
                            disabled={config.bannerEnabled === false}
                          />
                          <Input
                            value={config.bannerBackgroundColor}
                            onChange={(e) => updateConfig("bannerBackgroundColor", e.target.value)}
                            disabled={config.bannerEnabled === false}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Banner Height</Label>
                        <Input
                          value={config.bannerHeight}
                          onChange={(e) => updateConfig("bannerHeight", e.target.value)}
                          placeholder="200px"
                          className="mt-2"
                          disabled={config.bannerEnabled === false}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Banner Text</Label>
                      <Input
                        value={config.bannerText || ""}
                        onChange={(e) => updateConfig("bannerText", e.target.value)}
                        placeholder="Optional banner text"
                        className="mt-2"
                        disabled={config.bannerEnabled === false}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Text Color</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <input
                            type="color"
                            value={config.bannerTextColor}
                            onChange={(e) => updateConfig("bannerTextColor", e.target.value)}
                            className="h-10 w-20"
                            disabled={config.bannerEnabled === false}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Text Position</Label>
                        <select
                          value={config.bannerTextPosition || "left"}
                          onChange={(e) => updateConfig("bannerTextPosition", e.target.value)}
                          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                          disabled={config.bannerEnabled === false}
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.bannerShowOnInnerPages || false}
                          onChange={(e) => updateConfig("bannerShowOnInnerPages", e.target.checked)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">Show banner on inner pages</span>
                          <p className="text-xs text-gray-600 mt-0.5">Enable this to display the banner on survey/assessment/poll pages (not just landing page)</p>
                        </div>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                {/* Background Styling */}
                <Card>
                  <CardHeader>
                    <CardTitle>Background Styling</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Configure the background for post-login pages</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Style Type</Label>
                      <select
                        value={config.backgroundStyle}
                        onChange={(e) => updateConfig("backgroundStyle", e.target.value)}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="solid">Solid Color</option>
                        <option value="gradient">Gradient</option>
                        <option value="image">Background Image</option>
                      </select>
                    </div>

                    {config.backgroundStyle === "solid" && (
                      <div>
                        <Label>Background Color</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <input
                            type="color"
                            value={config.backgroundColor}
                            onChange={(e) => updateConfig("backgroundColor", e.target.value)}
                            className="h-10 w-20"
                          />
                          <Input
                            value={config.backgroundColor}
                            onChange={(e) => updateConfig("backgroundColor", e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {config.backgroundStyle === "gradient" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Gradient From</Label>
                          <div className="flex items-center space-x-2 mt-2">
                            <input
                              type="color"
                              value={config.gradientFrom}
                              onChange={(e) => updateConfig("gradientFrom", e.target.value)}
                              className="h-10 w-20"
                            />
                            <Input
                              value={config.gradientFrom}
                              onChange={(e) => updateConfig("gradientFrom", e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Gradient To</Label>
                          <div className="flex items-center space-x-2 mt-2">
                            <input
                              type="color"
                              value={config.gradientTo}
                              onChange={(e) => updateConfig("gradientTo", e.target.value)}
                              className="h-10 w-20"
                            />
                            <Input
                              value={config.gradientTo}
                              onChange={(e) => updateConfig("gradientTo", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {config.backgroundStyle === "image" && (
                      <div>
                        <Label>Background Image</Label>
                        <p className="text-xs text-gray-500 mt-1">Enter an image URL or upload a file</p>
                        <div className="mt-2 space-y-3">
                          {config.backgroundImageUrl && (
                            <div className="relative">
                              <img
                                src={config.backgroundImageUrl}
                                alt="Background"
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={() => updateConfig("backgroundImageUrl", "")}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          
                          {/* URL Input */}
                          <div>
                            <Label className="text-xs text-gray-600">Image URL</Label>
                            <div className="flex gap-2 mt-1">
                              <Input
                                type="url"
                                value={config.backgroundImageUrl || ""}
                                onChange={(e) => updateConfig("backgroundImageUrl", e.target.value)}
                                placeholder="https://example.com/background.jpg"
                                className="flex-1"
                              />
                              {config.backgroundImageUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateConfig("backgroundImageUrl", "")}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* File Upload */}
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload("backgroundImageUrl", file);
                              }}
                              className="hidden"
                              id="background-upload-post"
                            />
                            <label htmlFor="background-upload-post">
                              <Button variant="outline" className="w-full cursor-pointer" asChild>
                                <span>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Upload Background Image
                                </span>
                              </Button>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Footer Configuration */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Footer Configuration</CardTitle>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.footerEnabled !== false}
                          onChange={(e) => updateConfig("footerEnabled", e.target.checked)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-gray-600">Enable</span>
                      </label>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Footer configuration for post-login pages</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Footer Text</Label>
                      <Input
                        value={config.footerText}
                        onChange={(e) => updateConfig("footerText", e.target.value)}
                        placeholder="© 2025 All rights reserved"
                        className="mt-2"
                        disabled={config.footerEnabled === false}
                      />
                    </div>
                    <div>
                      <Label>Footer Text Position</Label>
                      <select
                        value={config.footerTextPosition || "left"}
                        onChange={(e) => updateConfig("footerTextPosition", e.target.value)}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                        disabled={config.footerEnabled === false}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                    <div>
                      <Label>Footer Logo</Label>
                      <p className="text-xs text-gray-500 mt-1">Optional logo for footer area</p>
                      <div className="mt-2 space-y-3">
                        {config.footerLogoUrl && (
                          <div className="flex items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <img src={config.footerLogoUrl} alt="Footer Logo" className="h-12 max-w-full object-contain" />
                          </div>
                        )}
                        <div>
                          <Label className="text-xs text-gray-600">Logo URL</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="url"
                              value={config.footerLogoUrl || ""}
                              onChange={(e) => updateConfig("footerLogoUrl", e.target.value)}
                              placeholder="https://example.com/footer-logo.png"
                              className="flex-1"
                              disabled={config.footerEnabled === false}
                            />
                            {config.footerLogoUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateConfig("footerLogoUrl", "")}
                                disabled={config.footerEnabled === false}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload("footerLogoUrl", file);
                            }}
                            className="hidden"
                            id="footer-logo-upload-post"
                            disabled={config.footerEnabled === false}
                          />
                          <label htmlFor="footer-logo-upload-post">
                            <Button variant="outline" className="w-full cursor-pointer" asChild disabled={config.footerEnabled === false}>
                              <span>
                                <Upload className="w-4 h-4 mr-2" />
                                Or Upload File (Temporary)
                              </span>
                            </Button>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Footer Logo Size</Label>
                        <select
                          value={config.footerLogoSize || "medium"}
                          onChange={(e) => updateConfig("footerLogoSize", e.target.value)}
                          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                          disabled={config.footerEnabled === false}
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>
                      <div>
                        <Label>Footer Logo Position</Label>
                        <select
                          value={config.footerLogoPosition || "left"}
                          onChange={(e) => updateConfig("footerLogoPosition", e.target.value)}
                          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                          disabled={config.footerEnabled === false}
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Text Color</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <input
                            type="color"
                            value={config.footerTextColor}
                            onChange={(e) => updateConfig("footerTextColor", e.target.value)}
                            className="h-10 w-20"
                            disabled={config.footerEnabled === false}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Background Color</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <input
                            type="color"
                            value={config.footerBackgroundColor}
                            onChange={(e) => updateConfig("footerBackgroundColor", e.target.value)}
                            className="h-10 w-20"
                            disabled={config.footerEnabled === false}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Height</Label>
                        <Input
                          value={config.footerHeight}
                          onChange={(e) => updateConfig("footerHeight", e.target.value)}
                          placeholder="80px"
                          className="mt-2"
                          disabled={config.footerEnabled === false}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Thank You Page Tab */}
            {activeTab === "thank-you" && (
              <>
                {/* Tab Info */}
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-green-900 mb-1">Thank You Page</h3>
                  <p className="text-sm text-green-700">Configure the completion message shown after participants successfully submit their responses. This applies globally to Surveys, Polls, and Evaluations.</p>
                </div>

                {/* Thank You Page Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle>Thank You Page Configuration</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Customize the thank you message and appearance shown after successful submission</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Thank You Title</Label>
                      <Input
                        value={config.thankYouTitle}
                        onChange={(e) => updateConfig("thankYouTitle", e.target.value)}
                        placeholder="Thank you!"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Main Message</Label>
                      <Input
                        value={config.thankYouMessage}
                        onChange={(e) => updateConfig("thankYouMessage", e.target.value)}
                        placeholder="Your response has been submitted"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Sub Message</Label>
                      <Input
                        value={config.thankYouSubMessage}
                        onChange={(e) => updateConfig("thankYouSubMessage", e.target.value)}
                        placeholder="We appreciate your participation"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Icon Color</Label>
                      <p className="text-xs text-gray-500 mt-1">Color of the checkmark icon</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <input
                          type="color"
                          value={config.thankYouIconColor}
                          onChange={(e) => updateConfig("thankYouIconColor", e.target.value)}
                          className="h-10 w-20"
                        />
                        <Input
                          value={config.thankYouIconColor}
                          onChange={(e) => updateConfig("thankYouIconColor", e.target.value)}
                          placeholder="#10B981"
                        />
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.thankYouShowConfirmation !== false}
                          onChange={(e) => updateConfig("thankYouShowConfirmation", e.target.checked)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">Show email confirmation message</span>
                          <p className="text-xs text-gray-600 mt-0.5">Display "A confirmation has been sent to your email"</p>
                        </div>
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* CSS & Fonts Tab */}
            {activeTab === "css-fonts" && (
              <>
                {/* Tab Info */}
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Code className="w-4 h-4 text-purple-700" />
                    <h3 className="text-sm font-semibold text-purple-900">CSS & Fonts - Advanced Styling</h3>
                  </div>
                  <p className="text-sm text-purple-700">Centralized styling control for participant & anonymous event pages. These settings only affect presentation — no content or logic changes.</p>
                </div>

                {/* Theme Presets */}
                <Card>
                  <CardHeader>
                    <CardTitle>Theme Presets</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Quick-apply predefined style presets</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: "default", name: "Default", description: "Standard professional styling" },
                        { id: "professional", name: "Professional", description: "Clean corporate look" },
                        { id: "minimal", name: "Minimal", description: "Simple and clean design" },
                        { id: "high-contrast", name: "High Contrast", description: "Accessibility-friendly" },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            updateConfig("cssThemePreset", preset.id);
                            // Apply preset values
                            if (preset.id === "professional") {
                              setConfig(prev => ({
                                ...prev,
                                cssThemePreset: preset.id,
                                cssTypography: { ...prev.cssTypography, primaryFontFamily: "inter", fontWeight: "normal", baseFontSize: "15px" },
                                cssHeadings: { ...prev.cssHeadings, headingFontWeight: "semibold", headingColor: "#111827", letterSpacing: "-0.02em" },
                                cssButtons: { ...prev.cssButtons, buttonBorderRadius: "6px", buttonFontSize: "14px" },
                              }));
                            } else if (preset.id === "minimal") {
                              setConfig(prev => ({
                                ...prev,
                                cssThemePreset: preset.id,
                                cssTypography: { ...prev.cssTypography, primaryFontFamily: "system", fontWeight: "normal", baseFontSize: "16px" },
                                cssHeadings: { ...prev.cssHeadings, headingFontWeight: "medium", headingColor: "#374151", letterSpacing: "normal" },
                                cssButtons: { ...prev.cssButtons, buttonBorderRadius: "4px", buttonFontSize: "14px" },
                              }));
                            } else if (preset.id === "high-contrast") {
                              setConfig(prev => ({
                                ...prev,
                                cssThemePreset: preset.id,
                                cssTypography: { ...prev.cssTypography, primaryFontFamily: "system", fontWeight: "medium", baseFontSize: "18px", lineHeight: "1.6" },
                                cssHeadings: { ...prev.cssHeadings, headingFontWeight: "bold", headingColor: "#000000", letterSpacing: "normal" },
                                cssButtons: { ...prev.cssButtons, buttonBorderRadius: "4px", buttonFontSize: "16px" },
                              }));
                            } else {
                              setConfig(prev => ({
                                ...prev,
                                cssThemePreset: preset.id,
                                cssTypography: defaultConfig.cssTypography,
                                cssHeadings: defaultConfig.cssHeadings,
                                cssButtons: defaultConfig.cssButtons,
                              }));
                            }
                            toast({ title: "Theme Applied", description: `${preset.name} theme has been applied.`, duration: 2000 });
                          }}
                          className={`p-3 border-2 rounded-lg text-left transition-all ${
                            config.cssThemePreset === preset.id
                              ? "border-purple-600 bg-purple-50"
                              : "border-gray-200 hover:border-purple-400"
                          }`}
                        >
                          <div className="font-medium text-sm text-gray-900">{preset.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{preset.description}</div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Typography (Global) */}
                <Card>
                  <CardHeader>
                    <CardTitle>Typography (Global)</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Configure fonts for all event pages</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Primary Font Family</Label>
                      <select
                        value={config.cssTypography?.primaryFontFamily || "system"}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          cssTypography: { ...prev.cssTypography, primaryFontFamily: e.target.value }
                        }))}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <optgroup label="System Fonts">
                          <option value="system">System Default</option>
                          <option value="sans-serif">Sans-Serif</option>
                          <option value="serif">Serif</option>
                          <option value="monospace">Monospace</option>
                        </optgroup>
                        <optgroup label="Google Fonts">
                          <option value="inter">Inter</option>
                          <option value="roboto">Roboto</option>
                          <option value="poppins">Poppins</option>
                          <option value="open-sans">Open Sans</option>
                          <option value="lato">Lato</option>
                          <option value="montserrat">Montserrat</option>
                          <option value="nunito">Nunito</option>
                          <option value="raleway">Raleway</option>
                          <option value="source-sans-pro">Source Sans Pro</option>
                          <option value="ubuntu">Ubuntu</option>
                        </optgroup>
                        <optgroup label="Custom">
                          <option value="custom">Custom Google Font URL</option>
                        </optgroup>
                      </select>
                    </div>
                    
                    {config.cssTypography?.primaryFontFamily === "custom" && (
                      <div>
                        <Label>Custom Google Font URL</Label>
                        <Input
                          value={config.cssTypography?.customGoogleFontUrl || ""}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            cssTypography: { ...prev.cssTypography, customGoogleFontUrl: e.target.value }
                          }))}
                          placeholder="https://fonts.googleapis.com/css2?family=YourFont:wght@400;500;700&display=swap"
                          className="mt-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">Paste the full Google Fonts embed URL</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Font Weight</Label>
                        <select
                          value={config.cssTypography?.fontWeight || "normal"}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            cssTypography: { ...prev.cssTypography, fontWeight: e.target.value }
                          }))}
                          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="light">Light (300)</option>
                          <option value="normal">Normal (400)</option>
                          <option value="medium">Medium (500)</option>
                          <option value="semibold">Semibold (600)</option>
                          <option value="bold">Bold (700)</option>
                        </select>
                      </div>
                      <div>
                        <Label>Base Font Size</Label>
                        <select
                          value={config.cssTypography?.baseFontSize || "16px"}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            cssTypography: { ...prev.cssTypography, baseFontSize: e.target.value }
                          }))}
                          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="14px">14px (Small)</option>
                          <option value="15px">15px</option>
                          <option value="16px">16px (Default)</option>
                          <option value="17px">17px</option>
                          <option value="18px">18px (Large)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Line Height</Label>
                      <select
                        value={config.cssTypography?.lineHeight || "1.5"}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          cssTypography: { ...prev.cssTypography, lineHeight: e.target.value }
                        }))}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="1.3">1.3 (Compact)</option>
                        <option value="1.4">1.4</option>
                        <option value="1.5">1.5 (Default)</option>
                        <option value="1.6">1.6</option>
                        <option value="1.75">1.75 (Relaxed)</option>
                      </select>
                    </div>
                    
                    {/* Font Preview */}
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-500 mb-2">Font Preview</p>
                      <p 
                        style={{ 
                          fontFamily: config.cssTypography?.primaryFontFamily === "system" ? "system-ui, sans-serif" : config.cssTypography?.primaryFontFamily,
                          fontWeight: config.cssTypography?.fontWeight === "bold" ? 700 : config.cssTypography?.fontWeight === "semibold" ? 600 : config.cssTypography?.fontWeight === "medium" ? 500 : config.cssTypography?.fontWeight === "light" ? 300 : 400,
                          fontSize: config.cssTypography?.baseFontSize || "16px",
                          lineHeight: config.cssTypography?.lineHeight || "1.5"
                        }}
                        className="text-gray-900"
                      >
                        The quick brown fox jumps over the lazy dog. 0123456789
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Heading Styles */}
                <Card>
                  <CardHeader>
                    <CardTitle>Heading Styles</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Configure heading typography</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>H1 Size</Label>
                        <Input
                          value={config.cssHeadings?.h1Size || "2.25rem"}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            cssHeadings: { ...prev.cssHeadings, h1Size: e.target.value }
                          }))}
                          placeholder="2.25rem"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>H2 Size</Label>
                        <Input
                          value={config.cssHeadings?.h2Size || "1.875rem"}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            cssHeadings: { ...prev.cssHeadings, h2Size: e.target.value }
                          }))}
                          placeholder="1.875rem"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>H3 Size</Label>
                        <Input
                          value={config.cssHeadings?.h3Size || "1.5rem"}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            cssHeadings: { ...prev.cssHeadings, h3Size: e.target.value }
                          }))}
                          placeholder="1.5rem"
                          className="mt-2"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Heading Font Weight</Label>
                        <select
                          value={config.cssHeadings?.headingFontWeight || "bold"}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            cssHeadings: { ...prev.cssHeadings, headingFontWeight: e.target.value }
                          }))}
                          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="normal">Normal (400)</option>
                          <option value="medium">Medium (500)</option>
                          <option value="semibold">Semibold (600)</option>
                          <option value="bold">Bold (700)</option>
                          <option value="extrabold">Extra Bold (800)</option>
                        </select>
                      </div>
                      <div>
                        <Label>Letter Spacing</Label>
                        <select
                          value={config.cssHeadings?.letterSpacing || "normal"}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            cssHeadings: { ...prev.cssHeadings, letterSpacing: e.target.value }
                          }))}
                          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="-0.05em">Tight (-0.05em)</option>
                          <option value="-0.02em">Slightly Tight (-0.02em)</option>
                          <option value="normal">Normal</option>
                          <option value="0.02em">Slightly Wide (0.02em)</option>
                          <option value="0.05em">Wide (0.05em)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Heading Color</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <input
                          type="color"
                          value={config.cssHeadings?.headingColor || "#1F2937"}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            cssHeadings: { ...prev.cssHeadings, headingColor: e.target.value }
                          }))}
                          className="h-10 w-20"
                        />
                        <Input
                          value={config.cssHeadings?.headingColor || "#1F2937"}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            cssHeadings: { ...prev.cssHeadings, headingColor: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Button Styles */}
                <Card>
                  <CardHeader>
                    <CardTitle>Button Styles</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Configure button appearance</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Button Font Family</Label>
                        <select
                          value={config.cssButtons?.buttonFontFamily || "inherit"}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            cssButtons: { ...prev.cssButtons, buttonFontFamily: e.target.value }
                          }))}
                          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="inherit">Inherit from Typography</option>
                          <option value="system">System Default</option>
                          <option value="inter">Inter</option>
                          <option value="roboto">Roboto</option>
                        </select>
                      </div>
                      <div>
                        <Label>Button Font Size</Label>
                        <select
                          value={config.cssButtons?.buttonFontSize || "14px"}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            cssButtons: { ...prev.cssButtons, buttonFontSize: e.target.value }
                          }))}
                          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="12px">12px (Small)</option>
                          <option value="14px">14px (Default)</option>
                          <option value="16px">16px (Large)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Button Border Radius</Label>
                      <select
                        value={config.cssButtons?.buttonBorderRadius || "8px"}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          cssButtons: { ...prev.cssButtons, buttonBorderRadius: e.target.value }
                        }))}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="0px">Square (0px)</option>
                        <option value="4px">Slightly Rounded (4px)</option>
                        <option value="6px">Rounded (6px)</option>
                        <option value="8px">More Rounded (8px)</option>
                        <option value="12px">Very Rounded (12px)</option>
                        <option value="999px">Pill (999px)</option>
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Hover Opacity (%)</Label>
                        <div className="space-y-2 mt-2">
                          <input
                            type="range"
                            min="50"
                            max="100"
                            value={config.cssButtons?.buttonHoverOpacity || 90}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              cssButtons: { ...prev.cssButtons, buttonHoverOpacity: parseInt(e.target.value) }
                            }))}
                            className="w-full"
                          />
                          <div className="text-xs text-gray-500 text-center">{config.cssButtons?.buttonHoverOpacity || 90}%</div>
                        </div>
                      </div>
                      <div>
                        <Label>Disabled Opacity (%)</Label>
                        <div className="space-y-2 mt-2">
                          <input
                            type="range"
                            min="30"
                            max="80"
                            value={config.cssButtons?.buttonDisabledOpacity || 50}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              cssButtons: { ...prev.cssButtons, buttonDisabledOpacity: parseInt(e.target.value) }
                            }))}
                            className="w-full"
                          />
                          <div className="text-xs text-gray-500 text-center">{config.cssButtons?.buttonDisabledOpacity || 50}%</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Button Preview */}
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-500 mb-3">Button Preview</p>
                      <div className="flex items-center gap-4">
                        <button
                          style={{
                            backgroundColor: config.loginButtonColor || "#3B82F6",
                            borderRadius: config.cssButtons?.buttonBorderRadius || "8px",
                            fontSize: config.cssButtons?.buttonFontSize || "14px",
                          }}
                          className="px-4 py-2 text-white font-medium transition-opacity hover:opacity-90"
                        >
                          Normal Button
                        </button>
                        <button
                          style={{
                            backgroundColor: config.loginButtonColor || "#3B82F6",
                            borderRadius: config.cssButtons?.buttonBorderRadius || "8px",
                            fontSize: config.cssButtons?.buttonFontSize || "14px",
                            opacity: (config.cssButtons?.buttonDisabledOpacity || 50) / 100,
                          }}
                          className="px-4 py-2 text-white font-medium cursor-not-allowed"
                          disabled
                        >
                          Disabled
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* CSS Scope Control */}
                <Card>
                  <CardHeader>
                    <CardTitle>CSS Scope Control</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Control where styles are applied at runtime</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">Apply to Pages:</p>
                      <div className="space-y-2">
                        {[
                          { key: "applyToLandingPage", label: "Landing Page" },
                          { key: "applyToPostLandingPage", label: "Post Landing Page" },
                          { key: "applyToThankYouPage", label: "Thank You Page" },
                        ].map((item) => (
                          <label key={item.key} className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.cssScopeControl?.[item.key as keyof typeof config.cssScopeControl] !== false}
                              onChange={(e) => setConfig(prev => ({
                                ...prev,
                                cssScopeControl: { ...prev.cssScopeControl, [item.key]: e.target.checked }
                              }))}
                              className="w-4 h-4 text-purple-600 rounded"
                            />
                            <span className="text-sm text-gray-700">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4 space-y-3">
                      <p className="text-sm font-medium text-gray-700">Apply to User Types:</p>
                      <div className="space-y-2">
                        {[
                          { key: "applyToLoggedInParticipants", label: "Logged-in Participants" },
                          { key: "applyToAnonymousUsers", label: "Anonymous Users" },
                        ].map((item) => (
                          <label key={item.key} className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.cssScopeControl?.[item.key as keyof typeof config.cssScopeControl] !== false}
                              onChange={(e) => setConfig(prev => ({
                                ...prev,
                                cssScopeControl: { ...prev.cssScopeControl, [item.key]: e.target.checked }
                              }))}
                              className="w-4 h-4 text-purple-600 rounded"
                            />
                            <span className="text-sm text-gray-700">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Global CSS Editor (Advanced) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Global CSS Editor (Advanced)
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Add custom CSS for complete control over appearance</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>⚠️ Advanced users only.</strong> Improper CSS may affect layout. CSS is scoped only to event pages (no admin UI impact).
                      </p>
                    </div>
                    
                    <div>
                      <Label>Custom CSS Code</Label>
                      <textarea
                        value={config.customCss || ""}
                        onChange={(e) => updateConfig("customCss", e.target.value)}
                        placeholder={`/* Example: Custom styles for event pages */
.login-box {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.btn-primary:hover {
  transform: translateY(-1px);
}

h1, h2, h3 {
  font-family: 'Your Custom Font', sans-serif;
}`}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm resize-none bg-gray-900 text-green-400"
                        rows={12}
                        style={{ tabSize: 2 }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Preview Panel */}
          <div className="lg:sticky lg:top-6">
            <Card className="border-2 border-gray-200">
              <CardHeader className="bg-gray-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-700">Live Preview</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreview}
                    className="text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Full Screen
                  </Button>
                </div>
                {/* Device Preview Toggle */}
                <div className="flex items-center gap-1 mt-3 p-1 bg-gray-200 rounded-lg">
                  <button
                    onClick={() => setPreviewDevice("desktop")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      previewDevice === "desktop"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    Desktop
                  </button>
                  <button
                    onClick={() => setPreviewDevice("tablet")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      previewDevice === "tablet"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Tablet className="w-3.5 h-3.5" />
                    Tablet
                  </button>
                  <button
                    onClick={() => setPreviewDevice("mobile")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      previewDevice === "mobile"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Mobile
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div 
                  className="bg-gray-100 relative overflow-hidden flex justify-center"
                  style={{ 
                    height: previewDevice === "mobile" ? "700px" : previewDevice === "tablet" ? "650px" : "600px",
                    padding: previewDevice !== "desktop" ? "16px" : "0"
                  }}
                >
                  {previewDevice === "desktop" ? (
                    <div
                      style={{
                        width: "100%",
                        height: "600px",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      <iframe
                        src={`/activities/take/${activityId}?preview=true`}
                        className="border-0"
                        title="Landing Page Preview"
                        style={{ 
                          transform: 'scale(0.5)',
                          transformOrigin: 'top left',
                          width: '200%',
                          height: '1200px',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: previewDevice === "mobile" ? "375px" : "768px",
                        height: previewDevice === "mobile" ? "667px" : "600px",
                        border: "8px solid #1F2937",
                        borderRadius: "24px",
                        overflow: "hidden",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                      }}
                    >
                      <iframe
                        src={`/activities/take/${activityId}?preview=true`}
                        className="w-full h-full border-0"
                        title="Landing Page Preview"
                      />
                    </div>
                  )}
                </div>
                <div className="p-3 bg-gray-50 border-t text-center">
                  <p className="text-xs text-gray-500">Preview updates when you click Save Configuration</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RoleBasedLayout>
  );
}
