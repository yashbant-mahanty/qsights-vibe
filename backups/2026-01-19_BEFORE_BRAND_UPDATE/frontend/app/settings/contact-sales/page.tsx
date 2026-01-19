"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { contactSalesApi } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import {
  Mail,
  Phone,
  Building,
  Calendar,
  User,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Briefcase,
  Target,
} from "lucide-react";

export default function ContactSalesManagement() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  async function loadRequests() {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const data = await contactSalesApi.getAll(params);
      setRequests(data.data || data);
    } catch (error) {
      console.error('Error loading contact sales requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await contactSalesApi.updateStatus(id, status);
      toast({
        title: "Success",
        description: "Status updated successfully!",
        variant: "success",
      });
      loadRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "error",
      });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      await contactSalesApi.delete(id);
      toast({
        title: "Success",
        description: "Request deleted successfully!",
        variant: "success",
      });
      loadRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Error",
        description: "Failed to delete request",
        variant: "error",
      });
    }
  }

  function getStatusBadge(status: string) {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      contacted: 'bg-blue-100 text-blue-700',
      closed: 'bg-green-100 text-green-700',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700';
  }

  function getStatusIcon(status: string) {
    const icons = {
      pending: Clock,
      contacted: CheckCircle,
      closed: XCircle,
    };
    const Icon = icons[status as keyof typeof icons] || Clock;
    return <Icon className="w-4 h-4 inline mr-1" />;
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contact Sales Requests</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage sales inquiries from potential customers
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {requests.filter(r => r.status === 'pending').length}
                  </p>
                </div>
                <Clock className="w-10 h-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Contacted</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {requests.filter(r => r.status === 'contacted').length}
                  </p>
                </div>
                <CheckCircle className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Closed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {requests.filter(r => r.status === 'closed').length}
                  </p>
                </div>
                <XCircle className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <div className="grid grid-cols-1 gap-6">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No sales inquiries found</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id}>
                <CardHeader className="border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <CardTitle className="text-lg">
                          {request.first_name} {request.last_name}
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                          Submitted on {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(request.status)}`}>
                      {getStatusIcon(request.status)}
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a href={`mailto:${request.email}`} className="text-qsights-blue hover:underline">
                          {request.email}
                        </a>
                      </div>
                      {request.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <a href={`tel:${request.phone}`} className="text-qsights-blue hover:underline">
                            {request.phone}
                          </a>
                        </div>
                      )}
                      {request.company && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span>{request.company}</span>
                        </div>
                      )}
                      {request.company_size && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span>Company Size: {request.company_size}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {request.role && (
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          <span>Role: {request.role}</span>
                        </div>
                      )}
                      {request.interest && (
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="w-4 h-4 text-gray-400" />
                          <span>Interest: {request.interest}</span>
                        </div>
                      )}
                      {request.contacted_at && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>
                            Contacted: {new Date(request.contacted_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {request.message && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Message:</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{request.message}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <select
                      value={request.status}
                      onChange={(e) => handleStatusChange(request.id, e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue"
                    >
                      <option value="pending">Pending</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </select>
                    <button
                      onClick={() => handleDelete(request.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      Delete
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
