"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MousePointerClick,
  AlertTriangle,
  RefreshCw,
  Download,
  Loader2,
  Filter,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

export default function NotificationLogsPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    failed: 0,
  });
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    loadLogs();
  }, [activityId, filterStatus, filterType]);

  async function loadLogs() {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch notification logs from backend API
      const token = localStorage.getItem('token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      
      const response = await fetch(`${API_URL}/notifications/reports/${activityId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification logs');
      }

      const data = await response.json();
      const fetchedLogs = data.data || data || [];
      
      setLogs(fetchedLogs);
      
      // Calculate stats from fetched data
      const newStats = {
        total: fetchedLogs.length,
        sent: fetchedLogs.filter((l: any) => l.status !== "failed").length,
        delivered: fetchedLogs.filter((l: any) => l.status === "delivered" || l.status === "opened" || l.status === "clicked").length,
        opened: fetchedLogs.filter((l: any) => l.opened_at).length,
        clicked: fetchedLogs.filter((l: any) => l.clicked_at).length,
        bounced: fetchedLogs.filter((l: any) => l.status === "bounced").length,
        failed: fetchedLogs.filter((l: any) => l.status === "failed").length,
      };
      setStats(newStats);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notification logs");
      console.error("Error loading logs:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(logId: string) {
    try {
      const log = logs.find(l => l.id === logId);
      if (!log) return;

      // Call resend API
      const response = await fetch(`/api/activities/${activityId}/notifications/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logId: logId,
          email: log.recipient_email,
          notificationType: log.notification_type,
        }),
      });

      if (!response.ok) throw new Error("Failed to resend email");

      // Reload logs
      await loadLogs();
    } catch (err) {
      console.error("Error resending email:", err);
      toast({
        title: "Error",
        description: "Failed to resend email",
        variant: "error",
      });
    }
  }

  async function handleExport() {
    try {
      // Export logs to CSV
      const csv = [
        ["Recipient", "Email", "Type", "Status", "Sent At", "Delivered At", "Opened At", "Clicked At"].join(","),
        ...logs.map(log => [
          log.recipient_name || "",
          log.recipient_email,
          log.notification_type,
          log.status,
          log.sent_at ? new Date(log.sent_at).toLocaleString() : "",
          log.delivered_at ? new Date(log.delivered_at).toLocaleString() : "",
          log.opened_at ? new Date(log.opened_at).toLocaleString() : "",
          log.clicked_at ? new Date(log.clicked_at).toLocaleString() : "",
        ].join(","))
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `notification-logs-${activityId}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting logs:", err);
      toast({
        title: "Error",
        description: "Failed to export logs",
        variant: "error",
      });
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Mail className="w-4 h-4 text-blue-600" />;
      case "delivered":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "opened":
        return <Eye className="w-4 h-4 text-purple-600" />;
      case "clicked":
        return <MousePointerClick className="w-4 h-4 text-indigo-600" />;
      case "bounced":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "delivered":
        return "bg-green-50 text-green-700 border-green-200";
      case "opened":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "clicked":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "bounced":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "failed":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterStatus !== "all" && log.status !== filterStatus) return false;
    if (filterType !== "all" && log.notification_type !== filterType) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-qsights-blue mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Loading notification logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/activities/${activityId}/notifications`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notification Logs</h1>
              <p className="text-sm text-gray-500 mt-1">View email delivery status and history</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Mail className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Sent</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
                </div>
                <Mail className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Delivered</p>
                  <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Opened</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.opened}</p>
                </div>
                <Eye className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Clicked</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats.clicked}</p>
                </div>
                <MousePointerClick className="w-8 h-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Bounced</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.bounced}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All</option>
                  <option value="sent">Sent</option>
                  <option value="delivered">Delivered</option>
                  <option value="opened">Opened</option>
                  <option value="clicked">Clicked</option>
                  <option value="bounced">Bounced</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Type:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All</option>
                  <option value="invitation">Invitation</option>
                  <option value="reminder">Reminder</option>
                  <option value="thank-you">Thank You</option>
                  <option value="program-expiry">Program Expiry</option>
                  <option value="activity-summary">Activity Summary</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Email Logs ({filteredLogs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm mb-4">
                {error}
              </div>
            )}

            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No notification logs found</p>
                <p className="text-sm text-gray-500 mt-1">Send some emails to see logs here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{log.recipient_name || "N/A"}</p>
                            <p className="text-xs text-gray-500">{log.recipient_email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-gray-700 capitalize">
                            {log.notification_type.replace(/-/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900 max-w-xs truncate">{log.subject}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(log.status)}`}>
                            {getStatusIcon(log.status)}
                            <span className="capitalize">{log.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-600">
                            {log.sent_at ? new Date(log.sent_at).toLocaleString() : "N/A"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {(log.status === "failed" || log.status === "bounced") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResend(log.id)}
                              className="flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Resend
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
