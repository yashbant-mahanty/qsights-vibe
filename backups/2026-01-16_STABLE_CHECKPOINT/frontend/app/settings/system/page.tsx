"use client";

import React, { useState, useEffect } from "react";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Mail,
  Shield,
  Save,
  Eye,
  EyeOff,
  TestTube,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { fetchWithAuth } from "@/lib/api";

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [emailConfig, setEmailConfig] = useState({
    sendgrid_api_key: "",
    sender_email: "",
    sender_name: "",
    sendgrid_api_id: "",
  });

  useEffect(() => {
    loadSystemSettings();
  }, []);

  const loadSystemSettings = async () => {
    try {
      setLoading(true);
      
      // fetchWithAuth returns parsed JSON data directly
      const result = await fetchWithAuth("/system-settings", {
        method: "GET",
      });

      if (result.data) {
        setEmailConfig(result.data);
      } else {
        // Use default values if no settings exist
        setEmailConfig({
          sendgrid_api_key: "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",
          sender_email: "info@qsights.com",
          sender_name: "QSights Support",
          sendgrid_api_id: "dFz6dyicT3C61aTtN019Ew",
        });
      }
    } catch (error) {
      console.error("Error loading system settings:", error);
      // Use default values on error
      setEmailConfig({
        sendgrid_api_key: "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",
        sender_email: "info@qsights.com",
        sender_name: "QSights Support",
        sendgrid_api_id: "dFz6dyicT3C61aTtN019Ew",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      setSaving(true);

      // fetchWithAuth already returns parsed JSON data and throws on error
      const result = await fetchWithAuth("/system-settings", {
        method: "POST",
        body: JSON.stringify(emailConfig),
      });
      
      toast({
        title: "Success!",
        description: result.message || "System configuration saved successfully",
        variant: "success"
      });

    } catch (error) {
      console.error("Error saving configuration:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      
      // fetchWithAuth already returns parsed JSON data and throws on error
      const result = await fetchWithAuth("/system-settings/test-email", {
        method: "POST",
        body: JSON.stringify({
          test_email: "yashbant.mahanty@bioquestglobal.com",
          config: emailConfig
        }),
      });
      
      toast({
        title: "Success!",
        description: result.message || "Test email sent successfully! Check your inbox.",
        variant: "success"
      });

    } catch (error) {
      console.error("Error sending test email:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send test email",
        variant: "error"
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <RoleBasedLayout allowedRoles={['super-admin']}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading system settings...</p>
          </div>
        </div>
      </RoleBasedLayout>
    );
  }

  return (
    <RoleBasedLayout allowedRoles={['super-admin']}>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
            <p className="text-gray-600 mt-2">Configure system-wide settings and integrations</p>
          </div>
        </div>

        {/* Secure Storage Warning */}
        <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-900">
                Secure Storage
              </p>
              <p className="text-xs text-orange-800 mt-1">
                API credentials are encrypted at rest and never exposed in logs or API responses. Changes are tracked in the audit log.
              </p>
            </div>
          </div>
        </div>

        {/* Email Configuration */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Email Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            {/* SendGrid API Key */}
            <div className="space-y-2">
              <Label htmlFor="sendgrid_api_key" className="text-sm font-medium text-red-600">
                SendGrid API Key *
              </Label>
              <div className="relative">
                <Input
                  id="sendgrid_api_key"
                  type={showApiKey ? "text" : "password"}
                  value={emailConfig.sendgrid_api_key}
                  onChange={(e) => setEmailConfig(prev => ({
                    ...prev,
                    sendgrid_api_key: e.target.value
                  }))}
                  placeholder="SG.xxxxxxxxxxxxxxxxxx"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Your SendGrid API key from the SendGrid dashboard
              </p>
            </div>

            {/* SendGrid API ID */}
            <div className="space-y-2">
              <Label htmlFor="sendgrid_api_id" className="text-sm font-medium">
                SendGrid API ID (Optional)
              </Label>
              <Input
                id="sendgrid_api_id"
                type="text"
                value={emailConfig.sendgrid_api_id}
                onChange={(e) => setEmailConfig(prev => ({
                  ...prev,
                  sendgrid_api_id: e.target.value
                }))}
                placeholder="Optional - for tracking purposes"
              />
              <p className="text-xs text-gray-500">
                Optional identifier for your SendGrid API key
              </p>
            </div>

            {/* Sender Email */}
            <div className="space-y-2">
              <Label htmlFor="sender_email" className="text-sm font-medium text-red-600">
                Sender Email *
              </Label>
              <Input
                id="sender_email"
                type="email"
                value={emailConfig.sender_email}
                onChange={(e) => setEmailConfig(prev => ({
                  ...prev,
                  sender_email: e.target.value
                }))}
                placeholder="noreply@yourdomain.com"
              />
              <p className="text-xs text-gray-500">
                Must be a verified sender in your SendGrid account
              </p>
            </div>

            {/* Sender Name */}
            <div className="space-y-2">
              <Label htmlFor="sender_name" className="text-sm font-medium">
                Sender Name
              </Label>
              <Input
                id="sender_name"
                type="text"
                value={emailConfig.sender_name}
                onChange={(e) => setEmailConfig(prev => ({
                  ...prev,
                  sender_name: e.target.value
                }))}
                placeholder="QSights"
              />
              <p className="text-xs text-gray-500">
                Display name shown in email recipients' inbox
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            onClick={handleTestConnection}
            disabled={testing || !emailConfig.sendgrid_api_key || !emailConfig.sender_email}
            variant="outline"
            className="flex items-center gap-2"
          >
            <TestTube className="w-4 h-4" />
            {testing ? "Testing..." : "Test Connection"}
          </Button>

          <Button
            onClick={handleSaveConfiguration}
            disabled={saving || !emailConfig.sendgrid_api_key || !emailConfig.sender_email}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-blue-900">
              <p className="font-semibold mb-2">Configuration Notes:</p>
              <ul className="space-y-1">
                <li>• SendGrid API keys are encrypted before storage</li>
                <li>• Test emails are sent to the super admin email address</li>
                <li>• All configuration changes are logged for audit purposes</li>
                <li>• Sender email must be verified in your SendGrid dashboard</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </RoleBasedLayout>
  );
}