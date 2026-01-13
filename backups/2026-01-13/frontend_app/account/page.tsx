"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Key,
  Mail,
  Bell,
  Globe,
  Eye,
  EyeOff,
  Save,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

export default function AccountSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accountData, setAccountData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    activityReminders: true,
    weeklyReports: false,
    language: "EN",
    timezone: "UTC",
  });

  useEffect(() => {
    loadAccountSettings();
  }, []);

  async function loadAccountSettings() {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        // Load user preferences if available
        setPreferences({
          emailNotifications: data.user?.preferences?.email_notifications ?? true,
          activityReminders: data.user?.preferences?.activity_reminders ?? true,
          weeklyReports: data.user?.preferences?.weekly_reports ?? false,
          language: data.user?.preferences?.language || "EN",
          timezone: data.user?.preferences?.timezone || "UTC",
        });
      }
    } catch (error) {
      console.error("Failed to load account settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordChange() {
    if (accountData.newPassword !== accountData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "error",
      });
      return;
    }

    if (accountData.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "error",
      });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          current_password: accountData.currentPassword,
          new_password: accountData.newPassword,
          new_password_confirmation: accountData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success!",
          description: data.message || "Password changed successfully",
          variant: "success",
        });
        setAccountData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        let errorMessage = "Failed to change password";
        if (data && data.message) {
          errorMessage = data.message;
        } else if (data && data.errors && typeof data.errors === 'object') {
          errorMessage = Object.values(data.errors).flat().join(", ");
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error("Password change error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePreferences() {
    try {
      setSaving(true);
      const response = await fetch("/api/account/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Preferences updated successfully",
          variant: "success",
        });
      } else {
        throw new Error("Failed to update preferences");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleBasedLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
              <p className="text-sm text-gray-600">Manage your account security and preferences</p>
            </div>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading settings...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Password Requirements</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="currentPassword"
                      type={showPassword ? "text" : "password"}
                      value={accountData.currentPassword}
                      onChange={(e) =>
                        setAccountData({ ...accountData, currentPassword: e.target.value })
                      }
                      className="pl-10 pr-10"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={accountData.newPassword}
                      onChange={(e) =>
                        setAccountData({ ...accountData, newPassword: e.target.value })
                      }
                      className="pr-10"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={accountData.confirmPassword}
                      onChange={(e) =>
                        setAccountData({ ...accountData, confirmPassword: e.target.value })
                      }
                      className="pr-10"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handlePasswordChange}
                  disabled={
                    saving ||
                    !accountData.currentPassword ||
                    !accountData.newPassword ||
                    !accountData.confirmPassword
                  }
                  className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Changing Password..." : "Change Password"}
                </button>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive email notifications for important updates</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications}
                      onChange={(e) =>
                        setPreferences({ ...preferences, emailNotifications: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Activity Reminders</p>
                    <p className="text-sm text-gray-600">Get reminders about upcoming activities</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.activityReminders}
                      onChange={(e) =>
                        setPreferences({ ...preferences, activityReminders: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Weekly Reports</p>
                    <p className="text-sm text-gray-600">Receive weekly activity summary reports</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.weeklyReports}
                      onChange={(e) =>
                        setPreferences({ ...preferences, weeklyReports: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <button
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Preferences"}
                </button>
              </CardContent>
            </Card>

            {/* Language & Region */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Language & Region
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="language">Language</Label>
                  <select
                    id="language"
                    value={preferences.language}
                    onChange={(e) =>
                      setPreferences({ ...preferences, language: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="EN">English</option>
                    <option value="HI">हिन्दी (Hindi)</option>
                    <option value="AR">العربية (Arabic)</option>
                    <option value="FR">Français (French)</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    value={preferences.timezone}
                    onChange={(e) =>
                      setPreferences({ ...preferences, timezone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Asia/Dubai">Dubai (GST)</option>
                    <option value="Asia/Kolkata">India (IST)</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RoleBasedLayout>
  );
}
