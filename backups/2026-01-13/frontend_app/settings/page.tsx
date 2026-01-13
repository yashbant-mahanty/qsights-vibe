"use client";

import React, { useState } from "react";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Mail,
  Phone,
  Building2,
  Bell,
  Globe,
  Save,
  Camera,
  Shield,
  Key,
  CheckCircle,
  AlertCircle,
  Palette,
  Settings as SettingsIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    organization: "",
    role: "",
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    activityReminders: true,
    responseAlerts: false,
    weeklyReports: true,
    systemUpdates: true,
    participantActivity: false,
  });

  const [languageSettings, setLanguageSettings] = useState({
    interfaceLanguage: "en",
    timezone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
  });

  const [appSettings, setAppSettings] = useState({
    appVersion: "2.0",
    copyrightText: "© 2025 QSights. All rights reserved.",
  });

  const [savedNotification, setSavedNotification] = useState(false);

  // Load current user data
  React.useEffect(() => {
    async function loadUser() {
      try {
        setLoading(true);
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          const user = data.user;
          setCurrentUser(user);
          
          // Parse name into first and last name
          const nameParts = (user.name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          setProfileData({
            firstName,
            lastName,
            email: user.email || '',
            phone: user.phone || '',
            organization: user.organization?.name || '',
            role: user.role || '',
          });
        }

        // Load app settings
        try {
          const appSettingsResponse = await fetch('/api/app-settings');
          if (appSettingsResponse.ok) {
            const appSettingsData = await appSettingsResponse.json();
            if (appSettingsData.data) {
              const updates: any = {};
              if (appSettingsData.data.app_version) updates.appVersion = appSettingsData.data.app_version;
              if (appSettingsData.data.copyright_text) updates.copyrightText = appSettingsData.data.copyright_text;
              setAppSettings(prev => ({ ...prev, ...updates }));
            }
          }
        } catch (err) {
          console.log('Failed to load app settings');
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNotificationToggle = (key: string) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Combine first and last name
      const fullName = `${profileData.firstName.trim()} ${profileData.lastName.trim()}`.trim();
      
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fullName,
          email: profileData.email,
          phone: profileData.phone,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      const result = await response.json();
      
      // Update current user with new data
      setCurrentUser(result.user);

      // Save app settings if modified
      if (appSettings.appVersion || appSettings.copyrightText) {
        try {
          const appSettingsResponse = await fetch('/api/app-settings', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              app_version: appSettings.appVersion,
              copyright_text: appSettings.copyrightText,
            }),
          });

          if (!appSettingsResponse.ok) {
            const errorData = await appSettingsResponse.json();
            console.error('Failed to save app settings:', errorData);
            toast({
              title: "Warning",
              description: 'Profile saved but app settings failed to update',
              variant: "default"
            });
          } else {
            const successData = await appSettingsResponse.json();
            console.log('App settings saved:', successData);
          }
        } catch (err) {
          console.error('Error saving app settings:', err);
          toast({
            title: "Warning",
            description: 'Profile saved but app settings failed to update',
            variant: "default"
          });
        }
      }
      
      // Show success notification
      setSavedNotification(true);
      setTimeout(() => setSavedNotification(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : 'Failed to save profile', 
        variant: "error" 
      });
    } finally {
      setSaving(false);
    }
  };

  // Only show Theme Settings tab for super-admin role
  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
    { code: "fr", name: "Français" },
    { code: "de", name: "Deutsch" },
    { code: "it", name: "Italiano" },
    { code: "pt", name: "Português" },
    { code: "zh", name: "中文" },
    { code: "ja", name: "日本語" },
  ];

  const timezones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
  ];

  // Show loading state while fetching user data
  if (loading) {
    return (
      <RoleBasedLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account preferences and settings</p>
          </div>
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Loading settings...</p>
          </div>
        </div>
      </RoleBasedLayout>
    );
  }

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account preferences and settings</p>
        </div>

        {/* Tabs - Modern Dashboard Style */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="inline-flex h-auto items-center justify-start rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 p-1.5 text-gray-600 shadow-inner border border-gray-200 flex-wrap gap-1">
            <TabsTrigger 
              value="profile" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100 hover:text-gray-900"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-lg data-[state=active]:shadow-amber-100 hover:text-gray-900"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger 
              value="language" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-100 hover:text-gray-900"
            >
              <Globe className="w-4 h-4 mr-2" />
              Language & Region
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-lg data-[state=active]:shadow-red-100 hover:text-gray-900"
            >
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            {currentUser?.role !== 'program-admin' && currentUser?.role !== 'program-manager' && (
              <TabsTrigger 
                value="app" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-100 hover:text-gray-900"
              >
                <SettingsIcon className="w-4 h-4 mr-2" />
                App Settings
              </TabsTrigger>
            )}
            {currentUser?.role === 'super-admin' && (
              <TabsTrigger 
                value="theme"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-lg data-[state=active]:shadow-pink-100 hover:text-gray-900"
              >
                <Palette className="w-4 h-4 mr-2" />
                Landing Page Theme
              </TabsTrigger>
            )}
            {(currentUser?.role === 'super-admin' || currentUser?.role === 'admin') && (
              <TabsTrigger 
                value="cms"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-100 hover:text-gray-900"
              >
                <Mail className="w-4 h-4 mr-2" />
                CMS & Content
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab Content */}
          <TabsContent value="profile" className="space-y-6">
                {/* Profile Picture */}
                <Card>
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Camera className="w-5 h-5 text-qsights-blue" />
                      Profile Picture
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                          {profileData.firstName[0]}
                          {profileData.lastName[0]}
                        </div>
                        <button className="absolute bottom-0 right-0 p-2 bg-qsights-blue text-white rounded-full hover:bg-qsights-blue/90 transition-colors shadow-lg">
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {profileData.firstName} {profileData.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">{profileData.role}</p>
                        <button className="mt-2 text-sm text-qsights-blue hover:underline">
                          Upload new picture
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Personal Information */}
                <Card>
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <User className="w-5 h-5 text-qsights-blue" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={profileData.firstName}
                          onChange={handleProfileChange}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={profileData.lastName}
                          onChange={handleProfileChange}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={profileData.email}
                          onChange={handleProfileChange}
                          className="w-full pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                        Phone Number
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={profileData.phone}
                          onChange={handleProfileChange}
                          className="w-full pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="organization" className="text-sm font-medium text-gray-700">
                        Organization
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="organization"
                          name="organization"
                          value={profileData.organization}
                          disabled
                          className="w-full pl-10 bg-gray-50"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
          </TabsContent>

          {/* Notifications Tab Content */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Bell className="w-5 h-5 text-qsights-blue" />
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Info Box at Top */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Email Notification Frequency
                        </p>
                        <p className="text-xs text-blue-800 mt-1">
                          You can adjust how often you receive bundled notifications in your
                          email preferences.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {/* Email Notifications */}
                    <div className="flex items-start justify-between py-3 border-b border-gray-200">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Email Notifications
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          Receive email updates about your account activity
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.emailNotifications}
                          onChange={() => handleNotificationToggle("emailNotifications")}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-qsights-blue"></div>
                      </label>
                    </div>

                    {/* Activity Reminders */}
                    <div className="flex items-start justify-between py-3 border-b border-gray-200">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Activity Reminders
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          Get reminders about upcoming and pending activities
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.activityReminders}
                          onChange={() => handleNotificationToggle("activityReminders")}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-qsights-blue"></div>
                      </label>
                    </div>

                    {/* Response Alerts */}
                    <div className="flex items-start justify-between py-3 border-b border-gray-200">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">Response Alerts</h4>
                        <p className="text-xs text-gray-600 mt-1">
                          Receive notifications when participants submit responses
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.responseAlerts}
                          onChange={() => handleNotificationToggle("responseAlerts")}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-qsights-blue"></div>
                      </label>
                    </div>

                    {/* Weekly Reports */}
                    <div className="flex items-start justify-between py-3 border-b border-gray-200">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">Weekly Reports</h4>
                        <p className="text-xs text-gray-600 mt-1">
                          Get a weekly summary of activity and engagement metrics
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.weeklyReports}
                          onChange={() => handleNotificationToggle("weeklyReports")}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-qsights-blue"></div>
                      </label>
                    </div>

                    {/* System Updates */}
                    <div className="flex items-start justify-between py-3 border-b border-gray-200">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">System Updates</h4>
                        <p className="text-xs text-gray-600 mt-1">
                          Important announcements and system maintenance notices
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.systemUpdates}
                          onChange={() => handleNotificationToggle("systemUpdates")}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-qsights-blue"></div>
                      </label>
                    </div>

                    {/* Participant Activity */}
                    <div className="flex items-start justify-between py-3">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Participant Activity
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          Notifications when participants join or complete activities
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.participantActivity}
                          onChange={() => handleNotificationToggle("participantActivity")}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-qsights-blue"></div>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

          {/* Language & Region Tab Content */}
          <TabsContent value="language" className="space-y-6">
            <Card>
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Globe className="w-5 h-5 text-qsights-blue" />
                    Language & Region Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Regional Settings</p>
                        <p className="text-xs text-green-800 mt-1">
                          Changes to language and region settings will take effect immediately across the application.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Interface Language */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Interface Language
                    </Label>
                    <select
                      value={languageSettings.interfaceLanguage}
                      onChange={(e) =>
                        setLanguageSettings((prev) => ({
                          ...prev,
                          interfaceLanguage: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">
                      Choose the language for the application interface
                    </p>
                  </div>

                  {/* Timezone */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Timezone</Label>
                    <select
                      value={languageSettings.timezone}
                      onChange={(e) =>
                        setLanguageSettings((prev) => ({
                          ...prev,
                          timezone: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                    >
                      {timezones.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">
                      All dates and times will be displayed in this timezone
                    </p>
                  </div>

                  {/* Date Format */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Date Format</Label>
                    <select
                      value={languageSettings.dateFormat}
                      onChange={(e) =>
                        setLanguageSettings((prev) => ({
                          ...prev,
                          dateFormat: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY (12/02/2025)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (02/12/2025)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2025-12-02)</option>
                      <option value="DD MMM YYYY">DD MMM YYYY (02 Dec 2025)</option>
                    </select>
                    <p className="text-xs text-gray-500">How dates are displayed throughout the app</p>
                  </div>

                  {/* Time Format */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Time Format</Label>
                    <select
                      value={languageSettings.timeFormat}
                      onChange={(e) =>
                        setLanguageSettings((prev) => ({
                          ...prev,
                          timeFormat: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                    >
                      <option value="12h">12-hour (2:30 PM)</option>
                      <option value="24h">24-hour (14:30)</option>
                    </select>
                    <p className="text-xs text-gray-500">Choose between 12-hour or 24-hour time display</p>
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

          {/* Security Tab Content */}
          <TabsContent value="security" className="space-y-6">
            <Card>
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Key className="w-5 h-5 text-qsights-blue" />
                      Change Password
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Current Password
                      </Label>
                      <Input type="password" placeholder="Enter current password" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">New Password</Label>
                      <Input type="password" placeholder="Enter new password" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Confirm New Password
                      </Label>
                      <Input type="password" placeholder="Confirm new password" />
                    </div>
                    <button className="px-6 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors">
                      Update Password
                    </button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Shield className="w-5 h-5 text-qsights-blue" />
                      Security Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between py-3 border-b border-gray-200">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Two-Factor Authentication
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                        Enable
                      </button>
                    </div>
                    <div className="flex items-start justify-between py-3">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">Active Sessions</h4>
                        <p className="text-xs text-gray-600 mt-1">
                          Manage your active login sessions
                        </p>
                      </div>
                      <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">
                        View
                      </button>
                    </div>
                  </CardContent>
                </Card>
          </TabsContent>

          {/* App Settings Tab Content */}
          <TabsContent value="app" className="space-y-6">
            <Card>
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Globe className="w-5 h-5 text-qsights-blue" />
                      Application Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">Global Application Settings</p>
                          <p className="text-xs text-blue-800 mt-1">
                            These settings apply to the main QSights application only and do not affect event-specific pages or surveys.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">App Version</Label>
                      <p className="text-xs text-gray-600">Set the application version number to display across all surveys and activities</p>
                      <Input
                        value={appSettings.appVersion}
                        onChange={(e) => setAppSettings(prev => ({ ...prev, appVersion: e.target.value }))}
                        placeholder="2.0"
                        className="mt-2"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Copyright Text</Label>
                      <p className="text-xs text-gray-600">Copyright notice displayed in the main application footer (not on event pages)</p>
                      <Input
                        value={appSettings.copyrightText}
                        onChange={(e) => setAppSettings(prev => ({ ...prev, copyrightText: e.target.value }))}
                        placeholder="© 2025 QSights. All rights reserved."
                        className="mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>
          </TabsContent>

          {/* Landing Page Theme Tab Content */}
          {currentUser?.role === 'super-admin' && (
            <TabsContent value="theme" className="space-y-6">
              {/* Info Box at Top */}
              <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Palette className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-pink-900">
                      Complete Landing Page Customization
                    </p>
                    <p className="text-xs text-pink-800 mt-1">
                      Customize logos, images, colors, fonts, templates, and all landing page content from the dedicated Theme Management page.
                    </p>
                  </div>
                </div>
              </div>

              <Card>
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Palette className="w-5 h-5 text-qsights-blue" />
                    Theme & Landing Page Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Feature Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <SettingsIcon className="w-8 h-8 text-blue-600 mb-3" />
                      <h3 className="font-semibold text-sm text-gray-900 mb-1">Template Selection</h3>
                      <p className="text-xs text-gray-600">Choose between Advanced or Regular landing page templates</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <Camera className="w-8 h-8 text-purple-600 mb-3" />
                      <h3 className="font-semibold text-sm text-gray-900 mb-1">Branding & Images</h3>
                      <p className="text-xs text-gray-600">Upload logos, banners, hero images, and icons</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <Palette className="w-8 h-8 text-green-600 mb-3" />
                      <h3 className="font-semibold text-sm text-gray-900 mb-1">Colors & Fonts</h3>
                      <p className="text-xs text-gray-600">Customize color schemes and typography</p>
                    </div>
                  </div>

                  {/* Call to Action */}
                  <div className="p-6 bg-gradient-to-br from-qsights-blue to-blue-600 rounded-xl text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold mb-2">Manage All Theme Settings</h3>
                        <p className="text-sm text-blue-100 mb-4">
                          Access the complete theme management interface to customize:
                        </p>
                        <ul className="space-y-1.5 text-sm text-blue-50">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Landing page templates (Advanced/Regular)
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            App logo, favicon, login banners
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Hero images and feature icons
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Color palette (primary, secondary, accent)
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Typography and font selections
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Preview changes before publishing
                          </li>
                        </ul>
                      </div>
                      <div className="ml-6">
                        <button
                          onClick={() => router.push('/settings/theme')}
                          className="px-6 py-3 bg-white text-qsights-blue rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg flex items-center gap-2"
                        >
                          <SettingsIcon className="w-5 h-5" />
                          Open Theme Manager
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick Preview */}
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Current Landing Page</h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Preview your landing page</p>
                        <p className="text-xs text-gray-600 mt-1">See how your theme changes appear to visitors</p>
                      </div>
                      <a
                        href="/"
                        target="_blank"
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors"
                      >
                        <AlertCircle className="w-4 h-4" />
                        Preview
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* CMS & Content Tab */}
          {(currentUser?.role === 'super-admin' || currentUser?.role === 'admin') && (
            <TabsContent value="cms" className="space-y-6">
              <Card>
                <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Mail className="w-6 h-6 text-indigo-600" />
                    CMS & Content Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">No Hardcoded Content</p>
                        <p className="text-xs text-blue-800 mt-1">
                          All page titles, descriptions, form labels, placeholders, and messages are managed through the CMS. Changes take effect immediately without code deployment.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Feature Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Mail className="w-8 h-8 text-blue-600 mb-3" />
                      <h3 className="font-semibold text-sm text-gray-900 mb-1">Contact Forms</h3>
                      <p className="text-xs text-gray-600">Edit Contact Sales, Request Demo, and Contact Us forms</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <Shield className="w-8 h-8 text-purple-600 mb-3" />
                      <h3 className="font-semibold text-sm text-gray-900 mb-1">Legal Pages</h3>
                      <p className="text-xs text-gray-600">Manage Privacy Policy and Terms of Service with rich-text</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
                      <h3 className="font-semibold text-sm text-gray-900 mb-1">Live Updates</h3>
                      <p className="text-xs text-gray-600">Changes reflect immediately on all pages</p>
                    </div>
                  </div>

                  {/* Call to Action */}
                  <div className="p-6 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold mb-2">Content Management System</h3>
                        <p className="text-sm text-indigo-100 mb-4">
                          Manage all dynamic content from one central location:
                        </p>
                        <ul className="space-y-1.5 text-sm text-indigo-50">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Contact Sales form labels, placeholders, and messages
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Request Demo form configuration
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Contact Us page content
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Privacy Policy with rich-text editor
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Terms of Service with rich-text editor
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Success/error messages for all forms
                          </li>
                        </ul>
                      </div>
                      <div className="ml-6">
                        <button
                          onClick={() => router.push('/settings/cms')}
                          className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg flex items-center gap-2"
                        >
                          <Mail className="w-5 h-5" />
                          Open CMS Manager
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Save Button - Below All Tabs */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Make sure to save your changes before leaving this page
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-qsights-blue text-white rounded-lg font-medium hover:bg-qsights-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Success Notification */}
        {savedNotification && (
          <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Settings saved successfully!</span>
          </div>
        )}
      </div>
    </RoleBasedLayout>
  );
}
