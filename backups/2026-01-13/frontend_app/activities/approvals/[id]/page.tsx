"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  FileText,
  AlertCircle,
  Activity as ActivityIcon,
} from "lucide-react";
import { activityApprovalsApi, type ActivityApprovalRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";

export default function ApprovalReviewPage() {
  const router = useRouter();
  const params = useParams();
  const approvalId = params.id as string;

  const [approvalRequest, setApprovalRequest] = useState<ActivityApprovalRequest | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    loadInitialData();
  }, [approvalId]);

  async function loadInitialData() {
    try {
      setLoading(true);
      // Load user and approval request in parallel
      const [userResponse, approvalData] = await Promise.all([
        fetch('/api/auth/me'),
        activityApprovalsApi.getById(approvalId)
      ]);
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setCurrentUser(userData.user);
      }
      
      setApprovalRequest(approvalData);
    } catch (err) {
      console.error("Failed to load data:", err);
      toast({
        title: "Error",
        description: "Failed to load approval request",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }



  const handleReview = async () => {
    if (!action) {
      toast({
        title: "Validation Error",
        description: "Please select an action (Approve or Reject)",
        variant: "warning",
      });
      return;
    }

    if (!remarks.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter remarks for your decision",
        variant: "warning",
      });
      return;
    }

    try {
      setProcessing(true);
      await activityApprovalsApi.review(approvalId, action, remarks);
      toast({
        title: "Success!",
        description: `Event ${action === 'approve' ? 'approved' : 'rejected'} successfully!`,
        variant: "success",
      });
      router.push("/activities");
    } catch (err) {
      console.error("Failed to review approval:", err);
      toast({
        title: "Error",
        description: "Failed to process approval",
        variant: "error",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <RoleBasedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading approval request...</p>
          </div>
        </div>
      </RoleBasedLayout>
    );
  }

  if (!approvalRequest) {
    return (
      <RoleBasedLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Approval request not found</p>
        </div>
      </RoleBasedLayout>
    );
  }

  const isAlreadyReviewed = approvalRequest.status !== 'pending';

  return (
    <RoleBasedLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {currentUser && (currentUser.role === 'super-admin' || currentUser.role === 'admin')
                ? 'Event Approval Review'
                : 'Event Approval Request Details'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {currentUser && (currentUser.role === 'super-admin' || currentUser.role === 'admin')
                ? 'Review and approve/reject event creation request'
                : 'View your submitted approval request details'}
            </p>
          </div>
        </div>

        {/* Status Alert */}
        {isAlreadyReviewed && (
          <Card className={`border-2 ${
            approvalRequest.status === 'approved' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <CardContent className="p-4 flex items-center gap-3">
              {approvalRequest.status === 'approved' ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
              <div>
                <p className={`font-semibold ${
                  approvalRequest.status === 'approved' ? 'text-green-900' : 'text-red-900'
                }`}>
                  This request has already been {approvalRequest.status}
                </p>
                <p className="text-sm text-gray-600">
                  Reviewed by {approvalRequest.reviewedBy?.name} on{" "}
                  {new Date(approvalRequest.reviewed_at!).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modern Activity Details Card */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8">
            {/* Decorative background patterns */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
            </div>
            
            {/* Content */}
            <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Event Type */}
              <div className="group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg group-hover:bg-white/30 transition-all">
                    <ActivityIcon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Event Type</p>
                </div>
                <p className="text-lg font-bold text-white pl-11 capitalize">
                  {approvalRequest.type}
                </p>
              </div>

              {/* Status */}
              <div className="group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg group-hover:bg-white/30 transition-all">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Status</p>
                </div>
                <div className="pl-11">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    approvalRequest.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : approvalRequest.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {approvalRequest.status.charAt(0).toUpperCase() + approvalRequest.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Start Date */}
              {approvalRequest.start_date && (
                <div className="group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg group-hover:bg-white/30 transition-all">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Start Date</p>
                  </div>
                  <p className="text-lg font-bold text-white pl-11">
                    {new Date(approvalRequest.start_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              )}

              {/* End Date */}
              {approvalRequest.end_date && (
                <div className="group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg group-hover:bg-white/30 transition-all">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">End Date</p>
                  </div>
                  <p className="text-lg font-bold text-white pl-11">
                    {new Date(approvalRequest.end_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Request Details */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <CardTitle>Event Details (Read-Only)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Request Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600">Requested By</p>
                  <p className="font-semibold text-gray-900">
                    {typeof approvalRequest.requested_by === 'object' && approvalRequest.requested_by !== null
                      ? approvalRequest.requested_by.name
                      : approvalRequest.requestedBy?.name || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {typeof approvalRequest.requested_by === 'object' && approvalRequest.requested_by !== null
                      ? approvalRequest.requested_by.email
                      : approvalRequest.requestedBy?.email || ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600">Requested On</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(approvalRequest.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Event Name</Label>
                <Input value={approvalRequest.name} disabled className="mt-1" />
              </div>
              <div>
                <Label>Event Type</Label>
                <Input
                  value={approvalRequest.type.charAt(0).toUpperCase() + approvalRequest.type.slice(1)}
                  disabled
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <textarea
                value={approvalRequest.description || "N/A"}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 bg-gray-50"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Program</Label>
                <Input
                  value={approvalRequest.program?.name || "N/A"}
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Questionnaire</Label>
                <Input
                  value={approvalRequest.questionnaire?.title || "N/A"}
                  disabled
                  className="mt-1"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Start Date</Label>
                <Input
                  value={
                    approvalRequest.start_date
                      ? new Date(approvalRequest.start_date).toLocaleString()
                      : "N/A"
                  }
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  value={
                    approvalRequest.end_date
                      ? new Date(approvalRequest.end_date).toLocaleString()
                      : "N/A"
                  }
                  disabled
                  className="mt-1"
                />
              </div>
            </div>

            {/* Additional Details - Always show section */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Additional Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Sender Email ID</Label>
                  <Input value={approvalRequest.sender_email || "N/A"} disabled className="mt-1" />
                </div>
                <div>
                  <Label>Manager Name</Label>
                  <Input value={approvalRequest.manager_name || "N/A"} disabled className="mt-1" />
                </div>
                <div>
                  <Label>Manager Email ID</Label>
                  <Input value={approvalRequest.manager_email || "N/A"} disabled className="mt-1" />
                </div>
                <div>
                  <Label>Project Code</Label>
                  <Input value={approvalRequest.project_code || "N/A"} disabled className="mt-1" />
                </div>
                <div>
                  <Label>Configuration Date</Label>
                  <Input
                    value={approvalRequest.configuration_date ? new Date(approvalRequest.configuration_date).toLocaleDateString() : "N/A"}
                    disabled
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Configuration Price (₹)</Label>
                  <Input
                    value={approvalRequest.configuration_price ? `₹${parseFloat(approvalRequest.configuration_price).toFixed(2)}` : "N/A"}
                    disabled
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Subscription Price (₹)</Label>
                  <Input
                    value={approvalRequest.subscription_price ? `₹${parseFloat(approvalRequest.subscription_price).toFixed(2)}` : "N/A"}
                    disabled
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Subscription Frequency</Label>
                  <Input
                    value={approvalRequest.subscription_frequency ? (approvalRequest.subscription_frequency.charAt(0).toUpperCase() + approvalRequest.subscription_frequency.slice(1)) : "N/A"}
                    disabled
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Tax (%)</Label>
                  <Input
                    value={approvalRequest.tax_percentage !== undefined && approvalRequest.tax_percentage !== null ? `${approvalRequest.tax_percentage}%` : "N/A"}
                    disabled
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Number of Expected Participants</Label>
                  <Input value={approvalRequest.number_of_participants || "N/A"} disabled className="mt-1" />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={approvalRequest.allow_guests}
                  disabled
                  className="rounded"
                />
                <Label>Allow Guests</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={approvalRequest.is_multilingual}
                  disabled
                  className="rounded"
                />
                <Label>Multilingual</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={approvalRequest.time_limit_enabled}
                  disabled
                  className="rounded"
                />
                <Label>Time Limit</Label>
              </div>
            </div>

            {/* Assessment Settings */}
            {approvalRequest.type === 'assessment' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Pass Percentage</Label>
                  <Input
                    value={approvalRequest.pass_percentage ? `${approvalRequest.pass_percentage}%` : "N/A"}
                    disabled
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Max Retakes</Label>
                  <Input
                    value={approvalRequest.max_retakes ?? "Unlimited"}
                    disabled
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Form - Only for Super Admin and Admin */}
        {!isAlreadyReviewed && currentUser && (currentUser.role === 'super-admin' || currentUser.role === 'admin') ? (
          <Card>
            <CardHeader className="border-b border-gray-200">
              <CardTitle>Approval Decision (Required)</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Action Selection */}
              <div>
                <Label className="mb-3 block">Select Action *</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setAction('approve')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      action === 'approve'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${
                      action === 'approve' ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <p className="font-semibold">Approve</p>
                    <p className="text-xs text-gray-600">Create event and notify requester</p>
                  </button>
                  <button
                    onClick={() => setAction('reject')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      action === 'reject'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <XCircle className={`w-8 h-8 mx-auto mb-2 ${
                      action === 'reject' ? 'text-red-600' : 'text-gray-400'
                    }`} />
                    <p className="font-semibold">Reject</p>
                    <p className="text-xs text-gray-600">Decline request with remarks</p>
                  </button>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <Label htmlFor="remarks">Remarks / Reason *</Label>
                <textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter your remarks or reason for this decision..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                  rows={4}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  This message will be sent to the requester
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => router.back()}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReview}
                  disabled={processing || !action || !remarks.trim()}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    action === 'approve'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : action === 'reject'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {processing ? "Processing..." : action ? `Confirm ${action === 'approve' ? 'Approval' : 'Rejection'}` : "Select Action"}
                </button>
              </div>
            </CardContent>
          </Card>
        ) : !isAlreadyReviewed && currentUser && (currentUser.role === 'program-admin' || currentUser.role === 'program-manager') ? (
          // Program Admin view - waiting for approval
          <Card className="bg-yellow-50 border-l-4 border-l-yellow-500">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Clock className="w-6 h-6 text-yellow-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Pending Approval</h3>
                  <p className="text-gray-700">
                    Your event creation request is awaiting approval from a Super Admin.
                    You will be notified via email once the request has been reviewed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : isAlreadyReviewed ? (
          <Card className="bg-gray-50">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Review Remarks</h3>
              <p className="text-gray-700">{approvalRequest.remarks}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </RoleBasedLayout>
  );
}
