"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  MousePointer, 
  AlertTriangle,
  RefreshCw,
  Download,
  Filter,
  Search,
  Loader2
} from 'lucide-react';

export default function NotificationLogsPage() {
  const params = useParams();
  const activityId = params.id as string;
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    dropped: 0,
  });

  useEffect(() => {
    loadLogs();
  }, [activityId]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      
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
      setStats({
        sent: fetchedLogs.length,
        delivered: fetchedLogs.filter((l: any) => l.delivered_at).length,
        opened: fetchedLogs.filter((l: any) => l.opened_at).length,
        clicked: fetchedLogs.filter((l: any) => l.clicked_at).length,
        bounced: fetchedLogs.filter((l: any) => l.status === 'bounced').length,
        dropped: fetchedLogs.filter((l: any) => l.status === 'dropped').length,
      });
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (logId: number) => {
    try {
      // Call resend API
      console.log('Resending email for log:', logId);
      await loadLogs();
    } catch (error) {
      console.error('Error resending email:', error);
    }
  };

  const handleExport = () => {
    // Export logs to CSV
    const csv = [
      ['Recipient', 'Template', 'Status', 'Sent', 'Delivered', 'Opened', 'Clicked', 'Error'].join(','),
      ...logs.map(log => [
        log.recipient,
        log.template,
        log.status,
        log.sent_at,
        log.delivered_at || '',
        log.opened_at || '',
        log.clicked_at || '',
        log.error || '',
      ].join(',')),
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-logs-${activityId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.status !== filter) return false;
    if (searchTerm && !log.recipient.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'opened':
        return <Eye className="w-5 h-5 text-blue-600" />;
      case 'clicked':
        return <MousePointer className="w-5 h-5 text-purple-600" />;
      case 'bounced':
      case 'dropped':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'opened':
        return 'bg-blue-100 text-blue-800';
      case 'clicked':
        return 'bg-purple-100 text-purple-800';
      case 'bounced':
      case 'dropped':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-qsights-blue" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Logs</h1>
          <p className="text-sm text-gray-600 mt-1">Track email delivery and engagement</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadLogs} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Sent</p>
                <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
              </div>
              <Mail className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Delivered</p>
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
                <p className="text-xs text-gray-600">Opened</p>
                <p className="text-2xl font-bold text-blue-600">{stats.opened}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Clicked</p>
                <p className="text-2xl font-bold text-purple-600">{stats.clicked}</p>
              </div>
              <MousePointer className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Bounced</p>
                <p className="text-2xl font-bold text-red-600">{stats.bounced}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Dropped</p>
                <p className="text-2xl font-bold text-orange-600">{stats.dropped}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'delivered' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('delivered')}
              >
                Delivered
              </Button>
              <Button
                variant={filter === 'opened' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('opened')}
              >
                Opened
              </Button>
              <Button
                variant={filter === 'bounced' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('bounced')}
              >
                Failed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Email Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Recipient</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Template</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Sent</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Delivered</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Opened</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 text-sm">{log.recipient}</td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded-full capitalize">
                        {log.template}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {new Date(log.sent_at).toLocaleString()}
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {log.delivered_at ? new Date(log.delivered_at).toLocaleString() : '-'}
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {log.opened_at ? new Date(log.opened_at).toLocaleString() : '-'}
                    </td>
                    <td className="p-3">
                      {(log.status === 'bounced' || log.status === 'dropped') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResend(log.id)}
                          className="text-xs"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Resend
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No notification logs found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
