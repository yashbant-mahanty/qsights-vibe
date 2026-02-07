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
  Cloud,
  HardDrive,
  MessageSquare,
  Clock,
  ArrowLeft,
  Database,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { fetchWithAuth } from "@/lib/api";
import DataSafetySettings from "@/components/admin/DataSafetySettings";

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingS3, setSavingS3] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingS3, setTestingS3] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAwsSecretKey, setShowAwsSecretKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'email' | 'sms' | 's3' | 'data-safety'>('email');
  
  const [emailConfig, setEmailConfig] = useState({
    sendgrid_api_key: "",
    sender_email: "",
    sender_name: "",
    sendgrid_api_id: "",
  });

  const [s3Config, setS3Config] = useState({
    aws_s3_bucket: "",
    aws_s3_folder: "",
    aws_region: "",
    aws_access_key_id: "",
    aws_secret_access_key: "",
    aws_s3_url: "",
    aws_cloudfront_url: "",
  });

  useEffect(() => {
    loadSystemSettings();
  }, []);

  const loadSystemSettings = async () => {
    try {
      setLoading(true);
      
      // Fetch email config and S3 config in parallel
      const [emailResult, s3Result] = await Promise.all([
        fetchWithAuth("/system-settings", { method: "GET" }),
        fetchWithAuth("/system-settings/s3", { method: "GET" }).catch((err) => {
          console.error('Failed to load S3 settings:', err);
          return null;
        }),
      ]);

      console.log('Email result:', emailResult);
      console.log('S3 result:', s3Result);

      // Load email config
      if (emailResult?.data) {
        setEmailConfig({
          sendgrid_api_key: emailResult.data.sendgrid_api_key || "",
          sender_email: emailResult.data.sender_email || "",
          sender_name: emailResult.data.sender_name || "",
          sendgrid_api_id: emailResult.data.sendgrid_api_id || "",
        });
      } else {
        setEmailConfig({
          sendgrid_api_key: "",
          sender_email: "info@qsights.com",
          sender_name: "QSights Support",
          sendgrid_api_id: "",
        });
      }

      // Load S3 config
      if (s3Result?.data) {
        setS3Config({
          aws_s3_bucket: s3Result.data.aws_s3_bucket || "",
          aws_s3_folder: s3Result.data.aws_s3_folder || "",
          aws_region: s3Result.data.aws_region || "",
          aws_access_key_id: s3Result.data.aws_access_key_id || "",
          aws_secret_access_key: s3Result.data.aws_secret_access_key || "",
          aws_s3_url: s3Result.data.aws_s3_url || "",
          aws_cloudfront_url: s3Result.data.aws_cloudfront_url || "",
        });
      } else {
        setS3Config({
          aws_s3_bucket: "",
          aws_s3_folder: "",
          aws_region: "ap-southeast-1",
          aws_access_key_id: "",
          aws_secret_access_key: "",
          aws_s3_url: "",
          aws_cloudfront_url: "",
        });
      }
    } catch (error) {
      console.error("Error loading system settings:", error);
      // Use default values on error
      setEmailConfig({
        sendgrid_api_key: "",
        sender_email: "info@qsights.com",
        sender_name: "QSights Support",
        sendgrid_api_id: "",
      });
      setS3Config({
        aws_s3_bucket: "",
        aws_s3_folder: "",
        aws_region: "ap-southeast-1",
        aws_access_key_id: "",
        aws_secret_access_key: "",
        aws_s3_url: "",
        aws_cloudfront_url: "",
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

  const handleSaveS3Configuration = async () => {
    try {
      setSavingS3(true);

      const result = await fetchWithAuth("/system-settings/s3", {
        method: "POST",
        body: JSON.stringify(s3Config),
      });
      
      toast({
        title: "Success!",
        description: result.message || "AWS S3 configuration saved successfully",
        variant: "success"
      });

    } catch (error) {
      console.error("Error saving S3 configuration:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save S3 configuration",
        variant: "error"
      });
    } finally {
      setSavingS3(false);
    }
  };

  const handleTestS3Connection = async () => {
    try {
      setTestingS3(true);
      
      const result = await fetchWithAuth("/system-settings/s3/test", {
        method: "POST",
        body: JSON.stringify({ config: s3Config }),
      });
      
      toast({
        title: "Success!",
        description: result.message || "S3 connection test successful!",
        variant: "success"
      });

    } catch (error) {
      console.error("Error testing S3 connection:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to test S3 connection",
        variant: "error"
      });
    } finally {
      setTestingS3(false);
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
      <div className="p-6 space-y-6">
        {/* Back Button */}
        <a 
          href="/settings" 
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </a>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
            <p className="text-gray-600 mt-2">Configure system-wide settings and integrations</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('email')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'email'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email Configuration
            </button>
            <button
              onClick={() => setActiveTab('sms')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'sms'
                  ? 'border-green-600 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              SMS Configuration
              <span className="ml-1 px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">Coming Soon</span>
            </button>
            <button
              onClick={() => setActiveTab('s3')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 's3'
                  ? 'border-orange-600 text-orange-600 bg-orange-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Cloud className="w-4 h-4" />
              AWS S3 Storage
            </button>
            <button
              onClick={() => setActiveTab('data-safety')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'data-safety'
                  ? 'border-qsights-cyan text-qsights-cyan bg-qsights-light'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Database className="w-4 h-4" />
              Data Safety
            </button>
          </nav>
        </div>

        {/* Info Box - Always at top */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-blue-900">
              <p className="font-semibold mb-2">Configuration Notes:</p>
              <ul className="space-y-1">
                <li>• All API credentials are encrypted before storage</li>
                <li>• Test emails are sent to the super admin email address</li>
                <li>• S3 images are stored publicly for questionnaire display</li>
                <li>• CloudFront CDN is recommended for better performance</li>
                <li>• All configuration changes are logged for audit purposes</li>
              </ul>
            </div>
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

        {/* Tab Content */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            {/* Email Configuration */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  SendGrid Email Configuration
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

            {/* Email Action Buttons */}
            <div className="flex items-center justify-between">
              <Button
                onClick={handleTestConnection}
                disabled={testing || !emailConfig.sendgrid_api_key || !emailConfig.sender_email}
                variant="outline"
                className="flex items-center gap-2"
              >
                <TestTube className="w-4 h-4" />
                {testing ? "Testing..." : "Test Email Connection"}
              </Button>

              <Button
                onClick={handleSaveConfiguration}
                disabled={saving || !emailConfig.sendgrid_api_key || !emailConfig.sender_email}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Email Configuration"}
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'sms' && (
          <div className="space-y-6">
            {/* SMS Configuration - Coming Soon */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  SMS Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    SMS notification configuration will be available in a future update. 
                    This will allow you to send SMS notifications to participants using 
                    services like Twilio or AWS SNS.
                  </p>
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg max-w-sm mx-auto">
                    <p className="text-sm text-gray-500">
                      <strong>Planned Features:</strong>
                    </p>
                    <ul className="text-sm text-gray-500 mt-2 space-y-1">
                      <li>• Twilio SMS Integration</li>
                      <li>• AWS SNS Support</li>
                      <li>• SMS Templates</li>
                      <li>• Delivery Tracking</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 's3' && (
          <div className="space-y-6">
            {/* AWS S3 Configuration */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-orange-600" />
                  AWS S3 Storage Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                {/* S3 Bucket Name */}
                <div className="space-y-2">
                  <Label htmlFor="aws_s3_bucket" className="text-sm font-medium text-red-600">
                    S3 Bucket Name *
                  </Label>
                  <Input
                    id="aws_s3_bucket"
                    type="text"
                    value={s3Config.aws_s3_bucket}
                    onChange={(e) => setS3Config(prev => ({
                      ...prev,
                      aws_s3_bucket: e.target.value
                    }))}
                    placeholder="qsights"
                  />
                  <p className="text-xs text-gray-500">
                    Name of your S3 bucket where images will be stored
                  </p>
                </div>

                {/* S3 Folder/Prefix */}
                <div className="space-y-2">
                  <Label htmlFor="aws_s3_folder" className="text-sm font-medium">
                    Folder/Prefix (Optional)
                  </Label>
                  <Input
                    id="aws_s3_folder"
                    type="text"
                    value={s3Config.aws_s3_folder}
                    onChange={(e) => setS3Config(prev => ({
                      ...prev,
                      aws_s3_folder: e.target.value
                    }))}
                    placeholder="qsightsprod"
                  />
                  <p className="text-xs text-gray-500">
                    Optional folder inside the bucket where uploads will be stored (e.g., "qsightsprod")
                  </p>
                </div>

                {/* AWS Region */}
                <div className="space-y-2">
                  <Label htmlFor="aws_region" className="text-sm font-medium text-red-600">
                    AWS Region *
                  </Label>
                  <select
                    id="aws_region"
                    value={s3Config.aws_region}
                    onChange={(e) => setS3Config(prev => ({
                      ...prev,
                      aws_region: e.target.value
                    }))}
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a region</option>
                    <option value="ap-south-1">Asia Pacific (Mumbai) - ap-south-1</option>
                    <option value="ap-southeast-1">Asia Pacific (Singapore) - ap-southeast-1</option>
                    <option value="ap-southeast-2">Asia Pacific (Sydney) - ap-southeast-2</option>
                    <option value="ap-northeast-1">Asia Pacific (Tokyo) - ap-northeast-1</option>
                    <option value="us-east-1">US East (N. Virginia) - us-east-1</option>
                    <option value="us-east-2">US East (Ohio) - us-east-2</option>
                    <option value="us-west-1">US West (N. California) - us-west-1</option>
                    <option value="us-west-2">US West (Oregon) - us-west-2</option>
                    <option value="eu-west-1">Europe (Ireland) - eu-west-1</option>
                    <option value="eu-west-2">Europe (London) - eu-west-2</option>
                    <option value="eu-central-1">Europe (Frankfurt) - eu-central-1</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    AWS region where your S3 bucket is located
                  </p>
                </div>

                {/* AWS Access Key ID */}
                <div className="space-y-2">
                  <Label htmlFor="aws_access_key_id" className="text-sm font-medium text-red-600">
                    AWS Access Key ID *
                  </Label>
                  <Input
                    id="aws_access_key_id"
                    type="text"
                    value={s3Config.aws_access_key_id}
                    onChange={(e) => setS3Config(prev => ({
                      ...prev,
                      aws_access_key_id: e.target.value
                    }))}
                    placeholder="AKIA..."
                  />
                  <p className="text-xs text-gray-500">
                    IAM user access key with S3 permissions
                  </p>
                </div>

                {/* AWS Secret Access Key */}
                <div className="space-y-2">
                  <Label htmlFor="aws_secret_access_key" className="text-sm font-medium text-red-600">
                    AWS Secret Access Key *
                  </Label>
                  <div className="relative">
                    <Input
                      id="aws_secret_access_key"
                      type={showAwsSecretKey ? "text" : "password"}
                      value={s3Config.aws_secret_access_key}
                      onChange={(e) => setS3Config(prev => ({
                        ...prev,
                        aws_secret_access_key: e.target.value
                      }))}
                      placeholder="Your AWS secret access key"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAwsSecretKey(!showAwsSecretKey)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showAwsSecretKey ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Secret key for the IAM user (encrypted at rest)
                  </p>
                </div>

                {/* S3 Base URL */}
                <div className="space-y-2">
                  <Label htmlFor="aws_s3_url" className="text-sm font-medium">
                    S3 Base URL (Optional)
                  </Label>
                  <Input
                    id="aws_s3_url"
                    type="url"
                    value={s3Config.aws_s3_url}
                    onChange={(e) => setS3Config(prev => ({
                      ...prev,
                      aws_s3_url: e.target.value
                    }))}
                    placeholder="https://qsights.s3.ap-southeast-1.amazonaws.com"
                  />
                  <p className="text-xs text-gray-500">
                    Base URL for accessing S3 files. Auto-generated if not provided.
                  </p>
                </div>

                {/* CloudFront URL */}
                <div className="space-y-2">
                  <Label htmlFor="aws_cloudfront_url" className="text-sm font-medium">
                    CloudFront Distribution URL (Optional)
                  </Label>
                  <Input
                    id="aws_cloudfront_url"
                    type="url"
                    value={s3Config.aws_cloudfront_url}
                    onChange={(e) => setS3Config(prev => ({
                      ...prev,
                      aws_cloudfront_url: e.target.value
                    }))}
                    placeholder="https://d1234567890.cloudfront.net"
                  />
                  <p className="text-xs text-gray-500">
                    Optional CDN URL for faster image delivery. If not provided, direct S3 URLs will be used.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* S3 Action Buttons */}
            <div className="flex items-center justify-between">
              <Button
                onClick={handleTestS3Connection}
                disabled={testingS3 || !s3Config.aws_s3_bucket || !s3Config.aws_region || !s3Config.aws_access_key_id || !s3Config.aws_secret_access_key}
                variant="outline"
                className="flex items-center gap-2"
              >
                <HardDrive className="w-4 h-4" />
                {testingS3 ? "Testing..." : "Test S3 Connection"}
              </Button>

              <Button
                onClick={handleSaveS3Configuration}
                disabled={savingS3 || !s3Config.aws_s3_bucket || !s3Config.aws_region || !s3Config.aws_access_key_id || !s3Config.aws_secret_access_key}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Save className="w-4 h-4" />
                {savingS3 ? "Saving..." : "Save S3 Configuration"}
              </Button>
            </div>
          </div>
        )}

        {/* Data Safety Tab */}
        {activeTab === 'data-safety' && (
          <div className="space-y-6">
            <DataSafetySettings />
          </div>
        )}
      </div>
    </RoleBasedLayout>
  );
}