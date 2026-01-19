"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { themeApi } from "@/lib/api";
import {
  Palette,
  Image as ImageIcon,
  Type,
  Upload,
  Save,
  Trash2,
  Eye,
  Settings,
  ArrowLeft,
  FileText,
  Menu,
  CreditCard,
  Sparkles,
  Plus,
  GripVertical,
  Edit,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ThemeSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ key: string; category: string } | null>(null);
  const [featureCards, setFeatureCards] = useState<any[]>([
    { id: 1, title: 'Real-time Analytics', description: 'Track responses as they come in', icon: '', enabled: true, order: 1 },
    { id: 2, title: 'Custom Surveys', description: 'Build tailored questionnaires', icon: '', enabled: true, order: 2 },
    { id: 3, title: 'Data Export', description: 'Export to multiple formats', icon: '', enabled: true, order: 3 },
  ]);

  const brandingSettings = [
    { key: 'logo', label: 'App Logo', type: 'image', category: 'branding' },
    { key: 'favicon', label: 'Favicon', type: 'image', category: 'branding' },
    { key: 'login_banner', label: 'Login Page Banner', type: 'image', category: 'branding' },
    { key: 'landing_hero_image', label: 'Landing Hero Image', type: 'image', category: 'branding' },
  ];

  const colorSettings = [
    { key: 'primary_color', label: 'Primary Color', type: 'color', category: 'colors', default: '#3B82F6' },
    { key: 'secondary_color', label: 'Secondary Color', type: 'color', category: 'colors', default: '#10B981' },
    { key: 'accent_color', label: 'Accent Color', type: 'color', category: 'colors', default: '#F59E0B' },
    { key: 'login_bg_color', label: 'Login Box Background', type: 'color', category: 'colors', default: '#FFFFFF' },
  ];

  const fontSettings = [
    { key: 'primary_font', label: 'Primary Font', type: 'text', category: 'fonts', default: 'Inter' },
    { key: 'heading_font', label: 'Heading Font', type: 'text', category: 'fonts', default: 'Poppins' },
  ];

  // Content Management Settings
  const heroContentSettings = [
    { key: 'hero_badge_text', label: 'Badge Text', type: 'text', category: 'hero_content', default: 'Professional Survey & Analytics Platform', placeholder: 'Badge text above heading' },
    { key: 'hero_main_heading', label: 'Main Heading', type: 'textarea', category: 'hero_content', default: 'Actionable Insights', placeholder: 'Main headline' },
    { key: 'hero_highlighted_text', label: 'Highlighted Text', type: 'text', category: 'hero_content', default: 'Insights', placeholder: 'Text to highlight in heading' },
    { key: 'hero_subheading', label: 'Subheading', type: 'textarea', category: 'hero_content', default: 'Transform data into decisions with our powerful survey platform', placeholder: 'Description below heading' },
    { key: 'hero_background_type', label: 'Background Type', type: 'select', category: 'hero_content', default: 'gradient', options: ['gradient', 'color', 'image'] },
    { key: 'hero_background_value', label: 'Background Value', type: 'text', category: 'hero_content', default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', placeholder: 'CSS gradient, color code, or image URL' },
  ];

  const navigationSettings = [
    { key: 'nav_features_label', label: 'Features Menu Label', type: 'text', category: 'navigation', default: 'Features', enabled_key: 'nav_features_enabled' },
    { key: 'nav_benefits_label', label: 'Benefits Menu Label', type: 'text', category: 'navigation', default: 'Benefits', enabled_key: 'nav_benefits_enabled' },
    { key: 'nav_compliance_label', label: 'Compliance Menu Label', type: 'text', category: 'navigation', default: 'Compliance', enabled_key: 'nav_compliance_enabled' },
    { key: 'nav_cta_text', label: 'CTA Button Text', type: 'text', category: 'navigation', default: 'Request Demo' },
    { key: 'nav_cta_link', label: 'CTA Button Link', type: 'text', category: 'navigation', default: '/request-demo', placeholder: 'URL or path' },
  ];

  const loginPanelSettings = [
    { key: 'login_panel_title', label: 'Panel Title', type: 'text', category: 'login_panel', default: 'Welcome Back', placeholder: 'Login panel heading' },
    { key: 'login_panel_subtitle', label: 'Panel Subtitle', type: 'text', category: 'login_panel', default: 'Sign in to your account', placeholder: 'Subtitle text' },
    { key: 'login_email_label', label: 'Email Label', type: 'text', category: 'login_panel', default: 'Email Address' },
    { key: 'login_email_placeholder', label: 'Email Placeholder', type: 'text', category: 'login_panel', default: 'Enter your email' },
    { key: 'login_password_label', label: 'Password Label', type: 'text', category: 'login_panel', default: 'Password' },
    { key: 'login_password_placeholder', label: 'Password Placeholder', type: 'text', category: 'login_panel', default: 'Enter your password' },
    { key: 'login_button_text', label: 'Login Button Text', type: 'text', category: 'login_panel', default: 'Sign In' },
    { key: 'login_footer_text', label: 'Footer Text', type: 'text', category: 'login_panel', default: 'Need help? Contact sales' },
    { key: 'login_footer_link', label: 'Footer Link', type: 'text', category: 'login_panel', default: '/contact-us' },
    { key: 'login_support_text', label: 'Support Text', type: 'text', category: 'login_panel', default: 'Support: support@qsights.com', placeholder: 'Support contact information' },
  ];

  const footerSettings = [
    { key: 'footer_text', label: 'Footer Text', type: 'text', category: 'footer', default: 'QSights © 2025', placeholder: 'Copyright text' },
    { key: 'footer_terms_url', label: 'Terms & Conditions URL', type: 'text', category: 'footer', default: '/terms-of-service', placeholder: '/terms-of-service' },
    { key: 'footer_privacy_url', label: 'Privacy Policy URL', type: 'text', category: 'footer', default: '/privacy-policy', placeholder: '/privacy-policy' },
    { key: 'footer_contact_url', label: 'Contact URL', type: 'text', category: 'footer', default: '/contact-us', placeholder: '/contact-us' },
    { key: 'footer_contact_label', label: 'Contact Link Label', type: 'text', category: 'footer', default: 'Contact Us', placeholder: 'Link text' },
  ];

  const templateOptions = [
    { 
      value: 'advanced', 
      label: 'Advanced Template', 
      description: 'Modern, feature-rich design with split layout',
      features: [
        'Gradient hero section with "Actionable Insights"',
        'Login panel on the right side',
        'Feature cards below hero',
        'Modern animations and effects',
        'Benefits section with icons',
        'Professional Survey & Analytics badge'
      ]
    },
    { 
      value: 'regular', 
      label: 'Regular Template', 
      description: 'Classic, clean design with centered login',
      features: [
        'Blue sidebar with feature descriptions',
        'Centered white login card',
        'QSights branding at top',
        'Simple, clean layout',
        'Traditional corporate design',
        'Footer with terms & privacy links'
      ]
    },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await themeApi.getAll();
      
      // Set Advanced template as default if no template is selected
      if (!data.general?.template_style?.value) {
        data.general = data.general || {};
        data.general.template_style = { value: 'advanced', type: 'text' };
      }
      
      setSettings(data);
      
      // Load feature cards if they exist
      if (data.content?.feature_cards?.value) {
        try {
          const cards = JSON.parse(data.content.feature_cards.value);
          setFeatureCards(cards);
        } catch (e) {
          console.error('Failed to parse feature cards:', e);
        }
      }
    } catch (error) {
      console.error('Error loading theme settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(key: string, category: string, file: File) {
    try {
      setUploading(key);
      const result = await themeApi.uploadImage(file, key, category);
      
      // Update settings with new image URL
      setSettings((prev: any) => ({
        ...prev,
        [category]: {
          ...prev[category],
          [key]: { value: result.url, type: 'image' },
        },
      }));

      toast({ 
        title: "Success!", 
        description: "Image uploaded successfully", 
        variant: "success" 
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ 
        title: "Error", 
        description: "Failed to upload image. Please try again.", 
        variant: "error" 
      });
    } finally {
      setUploading(null);
    }
  }

  async function handleColorChange(key: string, category: string, value: string) {
    setSettings((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: { value, type: 'color' },
      },
    }));
  }

  async function handleTextChange(key: string, category: string, value: string) {
    setSettings((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: { value, type: 'text' },
      },
    }));
  }

  async function handleSaveSettings() {
    try {
      setSaving(true);
      
      // Build settings array for bulk update
      const settingsArray: any[] = [];
      
      Object.entries(settings).forEach(([category, categorySettings]: [string, any]) => {
        Object.entries(categorySettings).forEach(([key, setting]: [string, any]) => {
          // Only include settings that have a value (skip null, undefined, empty string)
          if (setting.value !== null && setting.value !== undefined && setting.value !== '') {
            settingsArray.push({
              key,
              value: setting.value,
              type: setting.type,
              category,
            });
          }
        });
      });

      // Add feature cards as a JSON setting
      settingsArray.push({
        key: 'feature_cards',
        value: JSON.stringify(featureCards),
        type: 'json',
        category: 'content',
      });

      await themeApi.bulkUpdate(settingsArray);
      toast({ 
        title: "Success!", 
        description: "All settings saved successfully", 
        variant: "success" 
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save settings. Please try again.", 
        variant: "error" 
      });
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteImage(key: string, category: string) {
    setDeleteConfirm({ key, category });
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;

    try {
      await themeApi.delete(deleteConfirm.key);
      
      setSettings((prev: any) => ({
        ...prev,
        [deleteConfirm.category]: {
          ...prev[deleteConfirm.category],
          [deleteConfirm.key]: { value: null, type: 'image' },
        },
      }));

      toast({ 
        title: "Success!", 
        description: "Image deleted successfully", 
        variant: "success" 
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({ 
        title: "Error", 
        description: "Failed to delete image. Please try again.", 
        variant: "error" 
      });
    } finally {
      setDeleteConfirm(null);
    }
  }

  function getSettingValue(key: string, category: string, defaultValue?: string): string {
    return settings[category]?.[key]?.value || defaultValue || '';
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/settings')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Settings</span>
        </button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Theme Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Customize the look and feel of your QSights landing and login pages
            </p>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-qsights-blue text-white rounded-lg hover:bg-qsights-blue/90 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>

        {/* Tabs for organizing sections */}
        <Tabs defaultValue="template" className="space-y-6">
          <TabsList className="inline-flex h-auto items-center justify-start rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 p-1.5 text-gray-600 shadow-inner border border-gray-200 flex-wrap gap-1">
            <TabsTrigger 
              value="template" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100 hover:text-gray-900"
            >
              <Settings className="w-4 h-4 mr-2" />
              Template & Branding
            </TabsTrigger>
            <TabsTrigger 
              value="content" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-100 hover:text-gray-900"
            >
              <FileText className="w-4 h-4 mr-2" />
              Hero & Content
            </TabsTrigger>
            <TabsTrigger 
              value="navigation" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-100 hover:text-gray-900"
            >
              <Menu className="w-4 h-4 mr-2" />
              Navigation
            </TabsTrigger>
            <TabsTrigger 
              value="features" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-lg data-[state=active]:shadow-amber-100 hover:text-gray-900"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Feature Cards
            </TabsTrigger>
            <TabsTrigger 
              value="login" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-lg data-[state=active]:shadow-pink-100 hover:text-gray-900"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Login Panel
            </TabsTrigger>
            <TabsTrigger 
              value="footer" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-100 hover:text-gray-900"
            >
              <FileText className="w-4 h-4 mr-2" />
              Footer
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Template & Branding (Existing) */}
          <TabsContent value="template" className="space-y-6">
            {/* Template Selection */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-qsights-blue" />
                  Landing Page Template
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Choose between two predefined templates for your landing and login pages
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {templateOptions.map((template) => (
                    <div
                      key={template.value}
                      onClick={() => {
                        setSettings((prev: any) => ({
                          ...prev,
                          general: {
                            ...prev.general,
                            template_style: { value: template.value, type: 'text' },
                          },
                        }));
                      }}
                      className={`cursor-pointer border-2 rounded-xl p-6 transition-all ${
                        getSettingValue('template_style', 'general') === template.value
                          ? 'border-qsights-blue bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{template.label}</h3>
                          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            getSettingValue('template_style', 'general') === template.value
                              ? 'border-qsights-blue bg-qsights-blue'
                              : 'border-gray-300'
                          }`}
                        >
                          {getSettingValue('template_style', 'general') === template.value && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mt-4">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Features:</p>
                        <ul className="space-y-1">
                          {template.features.map((feature, idx) => (
                            <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">✓</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

        {/* Branding Section */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-qsights-blue" />
              Branding & Images
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {brandingSettings.map((setting) => (
                <div key={setting.key} className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    {setting.label}
                  </label>
                  
                  {/* URL Input Field */}
                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="https://example.com/image.png"
                      value={getSettingValue(setting.key, setting.category)}
                      onChange={(e) => handleTextChange(setting.key, setting.category, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                    />
                    <p className="text-xs text-gray-500">Enter image URL or upload a file</p>
                  </div>
                  
                  {getSettingValue(setting.key, setting.category) ? (
                    <div className="space-y-2">
                      <div className="relative w-full h-40 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={getSettingValue(setting.key, setting.category)}
                          alt={setting.label}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e: any) => {
                              const file = e.target.files[0];
                              if (file) handleImageUpload(setting.key, setting.category, file);
                            };
                            input.click();
                          }}
                          disabled={uploading === setting.key}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Upload className="w-4 h-4 inline mr-2" />
                          {uploading === setting.key ? 'Uploading...' : 'Replace'}
                        </button>
                        <button
                          onClick={() => handleDeleteImage(setting.key, setting.category)}
                          className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 inline mr-2" />
                          Clear
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e: any) => {
                          const file = e.target.files[0];
                          if (file) handleImageUpload(setting.key, setting.category, file);
                        };
                        input.click();
                      }}
                      disabled={uploading === setting.key}
                      className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg hover:border-qsights-blue hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {uploading === setting.key ? (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-qsights-blue"></div>
                          <span className="text-sm text-gray-600">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400" />
                          <span className="text-sm text-gray-600">Click to upload {setting.label}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Colors Section */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-qsights-blue" />
              Colors & Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {colorSettings.map((setting) => (
                <div key={setting.key} className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    {setting.label}
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={getSettingValue(setting.key, setting.category, setting.default)}
                      onChange={(e) => handleColorChange(setting.key, setting.category, e.target.value)}
                      className="h-12 w-20 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={getSettingValue(setting.key, setting.category, setting.default)}
                      onChange={(e) => handleColorChange(setting.key, setting.category, e.target.value)}
                      placeholder="#000000"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fonts Section */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Type className="w-5 h-5 text-qsights-blue" />
              Typography
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fontSettings.map((setting) => (
                <div key={setting.key} className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    {setting.label}
                  </label>
                  <select
                    value={getSettingValue(setting.key, setting.category, setting.default)}
                    onChange={(e) => handleTextChange(setting.key, setting.category, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Poppins">Poppins</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Open Sans">Open Sans</option>
                    <option value="Lato">Lato</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Raleway">Raleway</option>
                  </select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

            {/* Preview Link */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Preview Changes</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      View how your theme changes look on the public landing page
                    </p>
                  </div>
                  <a
                    href="/"
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    Preview Landing Page
                  </a>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Hero & Content Management */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-qsights-blue" />
                  Hero Section Content
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {heroContentSettings.map((setting) => (
                  <div key={setting.key} className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      {setting.label}
                    </label>
                    {setting.type === 'textarea' ? (
                      <textarea
                        value={getSettingValue(setting.key, setting.category, setting.default)}
                        onChange={(e) => handleTextChange(setting.key, setting.category, e.target.value)}
                        placeholder={setting.placeholder}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue resize-none"
                      />
                    ) : setting.type === 'select' ? (
                      <select
                        value={getSettingValue(setting.key, setting.category, setting.default)}
                        onChange={(e) => handleTextChange(setting.key, setting.category, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue"
                      >
                        {setting.options?.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={getSettingValue(setting.key, setting.category, setting.default)}
                        onChange={(e) => handleTextChange(setting.key, setting.category, e.target.value)}
                        placeholder={setting.placeholder}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue"
                      />
                    )}
                    {setting.key === 'hero_background_value' && (
                      <p className="text-xs text-gray-500">
                        Example: linear-gradient(135deg, #667eea 0%, #764ba2 100%) or #3B82F6 or https://example.com/bg.jpg
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Navigation Management */}
          <TabsContent value="navigation" className="space-y-6">
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <Menu className="w-5 h-5 text-qsights-blue" />
                  Header Navigation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {navigationSettings.map((setting) => (
                  <div key={setting.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        {setting.label}
                      </label>
                      {setting.enabled_key && (
                        <button
                          onClick={() => {
                            const currentValue = getSettingValue(setting.enabled_key!, setting.category, 'true');
                            handleTextChange(setting.enabled_key!, setting.category, currentValue === 'true' ? 'false' : 'true');
                          }}
                          className="flex items-center gap-2 text-sm"
                        >
                          {getSettingValue(setting.enabled_key, setting.category, 'true') === 'true' ? (
                            <>
                              <ToggleRight className="w-5 h-5 text-green-600" />
                              <span className="text-green-600 font-medium">Enabled</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-5 h-5 text-gray-400" />
                              <span className="text-gray-500">Disabled</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={getSettingValue(setting.key, setting.category, setting.default)}
                      onChange={(e) => handleTextChange(setting.key, setting.category, e.target.value)}
                      placeholder={setting.placeholder || setting.label}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Feature Cards Management */}
          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader className="border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-qsights-blue" />
                    Feature Cards
                  </CardTitle>
                  <button
                    onClick={() => {
                      const newCard = {
                        id: Date.now(),
                        title: 'New Feature',
                        description: 'Feature description',
                        icon: '',
                        enabled: true,
                        order: featureCards.length + 1,
                      };
                      setFeatureCards([...featureCards, newCard]);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-qsights-blue text-white rounded-lg text-sm hover:bg-qsights-blue/90"
                  >
                    <Plus className="w-4 h-4" />
                    Add Card
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {featureCards.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No feature cards yet. Click "Add Card" to create one.</p>
                  </div>
                ) : (
                  featureCards.map((card, index) => (
                    <div
                      key={card.id}
                      className="border-2 border-gray-200 rounded-lg p-4 space-y-3 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                          <span className="text-sm font-semibold text-gray-900">Card {index + 1}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const updated = [...featureCards];
                              updated[index].enabled = !updated[index].enabled;
                              setFeatureCards(updated);
                            }}
                            className="text-sm"
                          >
                            {card.enabled ? (
                              <ToggleRight className="w-5 h-5 text-green-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setFeatureCards(featureCards.filter((c) => c.id !== card.id));
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-600">Title</label>
                          <input
                            type="text"
                            value={card.title}
                            onChange={(e) => {
                              const updated = [...featureCards];
                              updated[index].title = e.target.value;
                              setFeatureCards(updated);
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-600">Icon URL</label>
                          <input
                            type="text"
                            value={card.icon}
                            onChange={(e) => {
                              const updated = [...featureCards];
                              updated[index].icon = e.target.value;
                              setFeatureCards(updated);
                            }}
                            placeholder="https://example.com/icon.svg"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Description</label>
                        <textarea
                          value={card.description}
                          onChange={(e) => {
                            const updated = [...featureCards];
                            updated[index].description = e.target.value;
                            setFeatureCards(updated);
                          }}
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue resize-none"
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Login Panel Management */}
          <TabsContent value="login" className="space-y-6">
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-qsights-blue" />
                  Login Panel Content
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {loginPanelSettings.map((setting) => (
                  <div key={setting.key} className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      {setting.label}
                    </label>
                    <input
                      type="text"
                      value={getSettingValue(setting.key, setting.category, setting.default)}
                      onChange={(e) => handleTextChange(setting.key, setting.category, e.target.value)}
                      placeholder={setting.placeholder || setting.default}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 6: Footer Management */}
          <TabsContent value="footer" className="space-y-6">
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-qsights-blue" />
                  Footer Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> Footer appears on all public pages including landing, login, registration, terms, privacy, and contact pages.
                  </p>
                </div>
                {footerSettings.map((setting) => (
                  <div key={setting.key} className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      {setting.label}
                    </label>
                    <input
                      type="text"
                      value={getSettingValue(setting.key, setting.category, setting.default)}
                      onChange={(e) => handleTextChange(setting.key, setting.category, e.target.value)}
                      placeholder={setting.placeholder || setting.default}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Image</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to delete this image? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
