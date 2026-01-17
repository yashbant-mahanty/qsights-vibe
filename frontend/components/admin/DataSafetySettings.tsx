"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Database, Bell, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface DataSafetySettings {
  enable_response_backup: boolean;
  include_anonymous: boolean;
  retention_policy: string;
  enable_notification_logging: boolean;
  log_notification_content: boolean;
}

interface HealthStatus {
  response_backup_enabled: boolean;
  notification_logging_enabled: boolean;
  retention_policy: string;
  tables_exist: {
    response_audit_logs: boolean;
    notification_logs: boolean;
  };
  timestamp: string;
}

export default function DataSafetySettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<DataSafetySettings>({
    enable_response_backup: true,
    include_anonymous: true,
    retention_policy: "never",
    enable_notification_logging: true,
    log_notification_content: true,
  });
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchHealth();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/data-safety/settings', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const formatted: DataSafetySettings = {
            enable_response_backup: data.settings.enable_response_backup?.value ?? true,
            include_anonymous: data.settings.include_anonymous?.value ?? true,
            retention_policy: data.settings.retention_policy?.value ?? 'never',
            enable_notification_logging: data.settings.enable_notification_logging?.value ?? true,
            log_notification_content: data.settings.log_notification_content?.value ?? true,
          };
          setSettings(formatted);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast({
        title: "Error",
        description: "Failed to load data safety settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/data-safety/health', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setHealth(data.health);
        }
      }
    } catch (error) {
      console.error('Failed to fetch health:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/data-safety/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: "Success",
            description: "Data safety settings updated successfully",
          });
          setHasChanges(false);
          fetchHealth(); // Refresh health status
        }
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof DataSafetySettings>(
    key: K,
    value: DataSafetySettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Data Safety & Audit Logging
        </h2>
        <p className="text-muted-foreground mt-2">
          Enterprise-grade data protection and comprehensive audit trail for all activities
        </p>
      </div>

      {/* System Health */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              System Health
            </CardTitle>
            <CardDescription>Current status of data safety systems</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Response Backup</span>
              <Badge variant={health.response_backup_enabled ? "success" : "secondary"}>
                {health.response_backup_enabled ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Notification Logging</span>
              <Badge variant={health.notification_logging_enabled ? "success" : "secondary"}>
                {health.notification_logging_enabled ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Audit Logs Table</span>
              {health.tables_exist.response_audit_logs ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Notification Logs Table</span>
              {health.tables_exist.notification_logs ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response Data Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Response Data Backup
          </CardTitle>
          <CardDescription>
            Granular backup of all response data at the question level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Response backup creates a secondary audit trail for every answer submitted. 
              This ensures data safety and provides detailed analytics.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="enable-backup" className="text-base">
                Enable Response Backup
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically log all responses to secondary audit table
              </p>
            </div>
            <Switch
              id="enable-backup"
              checked={settings.enable_response_backup}
              onCheckedChange={(checked) => updateSetting('enable_response_backup', checked)}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="include-anonymous" className="text-base">
                Include Anonymous Responses
              </Label>
              <p className="text-sm text-muted-foreground">
                Backup guest and anonymous submissions
              </p>
            </div>
            <Switch
              id="include-anonymous"
              checked={settings.include_anonymous}
              onCheckedChange={(checked) => updateSetting('include_anonymous', checked)}
              disabled={!settings.enable_response_backup}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="retention" className="text-base">
              Data Retention Policy
            </Label>
            <Select
              value={settings.retention_policy}
              onValueChange={(value) => updateSetting('retention_policy', value)}
              disabled={!settings.enable_response_backup}
            >
              <SelectTrigger id="retention">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never Delete</SelectItem>
                <SelectItem value="1year">1 Year</SelectItem>
                <SelectItem value="2years">2 Years</SelectItem>
                <SelectItem value="5years">5 Years</SelectItem>
                <SelectItem value="7years">7 Years (Compliance)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {settings.retention_policy === 'never' 
                ? 'Audit logs will be retained indefinitely'
                : `Audit logs older than ${settings.retention_policy.replace('year', ' year')} will be automatically deleted`
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Logging Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Logging
          </CardTitle>
          <CardDescription>
            Track delivery status of all email and notification sends
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Notification logging tracks sent, delivered, opened, clicked, and bounced statuses
              for comprehensive delivery analytics.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="enable-notification-logging" className="text-base">
                Enable Notification Logging
              </Label>
              <p className="text-sm text-muted-foreground">
                Log all email and notification sends with status tracking
              </p>
            </div>
            <Switch
              id="enable-notification-logging"
              checked={settings.enable_notification_logging}
              onCheckedChange={(checked) => updateSetting('enable_notification_logging', checked)}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="log-content" className="text-base">
                Log Message Content
              </Label>
              <p className="text-sm text-muted-foreground">
                Store message preview for audit trail (first 500 characters)
              </p>
            </div>
            <Switch
              id="log-content"
              checked={settings.log_notification_content}
              onCheckedChange={(checked) => updateSetting('log_notification_content', checked)}
              disabled={!settings.enable_notification_logging}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        {hasChanges && (
          <Badge variant="outline" className="py-2">
            Unsaved Changes
          </Badge>
        )}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>

      {/* Important Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> These settings apply to all NEW data going forward. 
          Existing data remains intact and unchanged. Changes take effect immediately after saving.
        </AlertDescription>
      </Alert>
    </div>
  );
}
