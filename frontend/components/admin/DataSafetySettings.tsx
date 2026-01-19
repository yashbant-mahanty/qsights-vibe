"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, Database, Bell, CheckCircle2, XCircle, AlertCircle, Download, RefreshCw, Eye } from "lucide-react";
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
    response_backups: boolean;
  };
  timestamp: string;
}

interface BackupRecord {
  id: string;
  response_id: string;
  activity_id: string;
  participant_id: string | null;
  question_id: string;
  value: string | null;
  value_array: any;
  created_at: string;
}

interface MigrationStats {
  total_responses: number;
  responses_with_json: number;
  responses_with_backups: number;
  total_backups: number;
}

export default function DataSafetySettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [migrationStats, setMigrationStats] = useState<MigrationStats | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [settings, setSettings] = useState<DataSafetySettings>({
    enable_response_backup: true,
    include_anonymous: true,
    retention_policy: "never",
    enable_notification_logging: true,
    log_notification_content: true,
  });
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchHealth();
  }, []);

  useEffect(() => {
    if (activeTab === 'backups') {
      fetchMigrationStats();
    }
  }, [activeTab]);

  const fetchMigrationStats = async () => {
    try {
      const data = await fetchWithAuth('/data-safety/migration-stats', {
        method: 'GET',
      });

      if (data.success) {
        setMigrationStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch migration stats:', error);
    }
  };

  const fetchBackups = async (limit = 100) => {
    setBackupsLoading(true);
    try {
      const data = await fetchWithAuth(`/data-safety/backups?limit=${limit}`, {
        method: 'GET',
      });

      if (data.success) {
        setBackups(data.backups);
      }
    } catch (error) {
      console.error('Failed to fetch backups:', error);
      toast({
        title: "Error",
        description: "Failed to load backup data",
        variant: "destructive",
      });
    } finally {
      setBackupsLoading(false);
    }
  };

  const migrateJsonToBackups = async () => {
    if (!confirm('This will migrate all existing JSON response data to the backup table. Continue?')) {
      return;
    }

    setMigrating(true);
    try {
      const data = await fetchWithAuth('/data-safety/migrate', {
        method: 'POST',
      });

      toast({
        title: "Success",
        description: `Migrated ${data.migrated} responses with ${data.total_backups} backup records`,
      });
      fetchMigrationStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to migrate data",
        variant: "destructive",
      });
    } finally {
      setMigrating(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await fetchWithAuth('/data-safety/settings', {
        method: 'GET',
      });

      if (data.success) {
        const formatted: DataSafetySettings = {
          enable_response_backup: data.settings.enable_response_backup?.value ?? true,
          include_anonymous: data.settings.include_anonymous?.value ?? true,
          retention_policy: data.settings.retention_policy?.value ?? 'never',
          enable_notification_logging: data.settings.enable_notification_logging?.value ?? true,
          log_notification_content: data.settings.log_notification_content?.value ?? true,
        };
        setSettings(formatted);
        setAuthError(false);
      }
    } catch (error: any) {
      console.error('Failed to fetch settings:', error);
      
      // Check if it's an authorization error
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        setAuthError(true);
        toast({
          title: "Access Denied",
          description: "You need Super Admin privileges to access Data Safety settings.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load data safety settings",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const data = await fetchWithAuth('/data-safety/health', {
        method: 'GET',
      });

      if (data.success) {
        setHealth(data.health);
        setAuthError(false);
      }
    } catch (error: any) {
      console.error('Failed to fetch health:', error);
      
      // Check if it's an authorization error
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        setAuthError(true);
      }
      // Don't show toast here, already shown in fetchSettings
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await fetchWithAuth('/data-safety/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
      });

      if (data.success) {
        toast({
          title: "Success",
          description: "Data safety settings updated successfully",
        });
        setHasChanges(false);
        fetchHealth(); // Refresh health status
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

  // Show access denied message if user is not authorized
  if (authError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Data Safety & Audit Logging
          </h2>
          <p className="text-muted-foreground mt-2">
            Enterprise-grade data protection and comprehensive audit trail for all activities
          </p>
        </div>
        
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Access Denied:</strong> You need Super Admin privileges to access Data Safety settings.
            Please contact your system administrator if you believe you should have access.
          </AlertDescription>
        </Alert>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="backups">View Backups</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6 mt-6">
          {/* System Health Card */}
          {health ? (
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
                  <Badge variant={health?.response_backup_enabled ? "success" : "secondary"}>
                    {health?.response_backup_enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Notification Logging</span>
                  <Badge variant={health?.notification_logging_enabled ? "success" : "secondary"}>
                    {health?.notification_logging_enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Audit Logs Table</span>
                  {health?.tables_exist?.response_audit_logs ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Notification Logs Table</span>
                  {health?.tables_exist?.notification_logs ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading health status...</span>
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
        </TabsContent>

        <TabsContent value="health" className="space-y-6 mt-6">
          {/* System Health */}
          {health ? (
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
                  <Badge variant={health?.response_backup_enabled ? "success" : "secondary"}>
                    {health?.response_backup_enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Notification Logging</span>
                  <Badge variant={health?.notification_logging_enabled ? "success" : "secondary"}>
                    {health?.notification_logging_enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Audit Logs Table</span>
                  {health?.tables_exist?.response_audit_logs ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Notification Logs Table</span>
                  {health?.tables_exist?.notification_logs ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Response Backups Table</span>
                  {health?.tables_exist?.response_backups ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="backups" className="space-y-6 mt-6">
          {/* Migration Stats */}
          {migrationStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Backup Status
                </CardTitle>
                <CardDescription>Response data migration and backup statistics</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <div>
                  <div className="text-2xl font-bold">{migrationStats.total_responses}</div>
                  <div className="text-xs text-muted-foreground">Total Responses</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{migrationStats.responses_with_json}</div>
                  <div className="text-xs text-muted-foreground">With JSON Data</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{migrationStats.responses_with_backups}</div>
                  <div className="text-xs text-muted-foreground">Backed Up</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{migrationStats.total_backups}</div>
                  <div className="text-xs text-muted-foreground">Backup Records</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Backup Management</CardTitle>
              <CardDescription>Migrate JSON data and view backup records</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={migrateJsonToBackups} disabled={migrating} variant="outline">
                {migrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Database className="mr-2 h-4 w-4" />
                Migrate JSON to Backups
              </Button>
              <Button onClick={() => fetchBackups(100)} disabled={backupsLoading} variant="outline">
                {backupsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Eye className="mr-2 h-4 w-4" />
                View Recent Backups
              </Button>
              <Button onClick={fetchMigrationStats} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Stats
              </Button>
            </CardContent>
          </Card>

          {/* Backups Table */}
          {backups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Backup Records</CardTitle>
                <CardDescription>Showing last {backups.length} backup entries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Response ID</th>
                        <th className="px-4 py-2 text-left">Question ID</th>
                        <th className="px-4 py-2 text-left">Value</th>
                        <th className="px-4 py-2 text-left">Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backups.map((backup) => (
                        <tr key={backup.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-xs">{backup.response_id.substring(0, 8)}...</td>
                          <td className="px-4 py-2">{backup.question_id}</td>
                          <td className="px-4 py-2 max-w-xs truncate">
                            {backup.value || (backup.value_array ? JSON.stringify(backup.value_array) : 'N/A')}
                          </td>
                          <td className="px-4 py-2">{new Date(backup.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
