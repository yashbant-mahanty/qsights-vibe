"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { ActivityParticipantsAndNotifications } from "@/src/components/notifications";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, Mail, Users, CheckCircle2 } from "lucide-react";
import { activitiesApi, type Activity } from "@/lib/api";

export default function ActivityNotificationsPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string>("");

  useEffect(() => {
    // Get auth token from localStorage immediately
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem("token") || "";
      setAuthToken(token);
    }
    loadActivity();
  }, [activityId]);

  async function loadActivity() {
    try {
      setLoading(true);
      setError(null);
      const data = await activitiesApi.getById(activityId);
      setActivity(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
      console.error("Error loading activity:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <RoleBasedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-qsights-blue mx-auto" />
            <p className="mt-2 text-sm text-gray-500">Loading activity...</p>
          </div>
        </div>
      </RoleBasedLayout>
    );
  }

  if (error || !activity) {
    return (
      <RoleBasedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600">{error || "Activity not found"}</p>
            <button
              onClick={() => router.push("/activities")}
              className="mt-4 px-4 py-2 bg-qsights-blue text-white rounded-lg"
            >
              Back to Activities
            </button>
          </div>
        </div>
      </RoleBasedLayout>
    );
  }

  return (
    <RoleBasedLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Page Header with Breadcrumb */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/activities')}
                className="group p-3 hover:bg-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-qsights-blue transition-colors" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <span>Activities</span>
                  <span>/</span>
                  <span className="text-qsights-blue font-medium">Notifications</span>
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Participant Notifications
                </h1>
              </div>
            </div>
          </div>

          {/* Enhanced Activity Info Card */}
          <Card className="overflow-hidden border-0 shadow-xl">
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 relative">
              {/* Decorative Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-24"></div>
              </div>
              
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Mail className="w-6 h-6 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">{activity.name}</h2>
                    </div>
                    {activity.description && (
                      <p className="text-white/90 text-sm leading-relaxed max-w-3xl">
                        {activity.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-6">
                      <span className="inline-flex items-center px-4 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium capitalize">
                        <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
                        {activity.type}
                      </span>
                      <span className="inline-flex items-center px-4 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium capitalize">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {activity.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Main Content Card with Enhanced Styling */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-white px-8 py-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Manage Participants & Send Notifications</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Add participants, manage their details, and send email notifications</p>
                </div>
              </div>
            </div>
            <CardContent className="p-8">
              <ActivityParticipantsAndNotifications
                activityId={activityId}
                activityName={activity.name}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleBasedLayout>
  );
}
