"use client";

import React from "react";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";
import {
  Building2,
  Users,
  FolderTree,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  MoreVertical,
  ArrowUpRight,
} from "lucide-react";

export default function AdminDashboard() {
  const mainStats = [
    {
      title: "Organizations",
      value: "12",
      subtitle: "+3 this month",
      icon: Building2,
      variant: "blue" as const,
    },
    {
      title: "Group Heads",
      value: "28",
      subtitle: "+5 this month",
      icon: Users,
      variant: "purple" as const,
    },
    {
      title: "Programs",
      value: "156",
      subtitle: "+18 this month",
      icon: FolderTree,
      variant: "green" as const,
    },
    {
      title: "Total Activities",
      value: "892",
      change: "+64 this month",
      icon: Calendar,
      color: "bg-orange-500",
      lightColor: "bg-orange-50",
      textColor: "text-orange-600",
    },
  ];

  const activityStatus = [
    {
      label: "Upcoming",
      count: 124,
      percentage: 45,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      barColor: "bg-blue-500",
    },
    {
      label: "Live",
      count: 89,
      percentage: 32,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
      barColor: "bg-green-500",
    },
    {
      label: "Expired",
      count: 63,
      percentage: 23,
      icon: XCircle,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      barColor: "bg-gray-500",
    },
  ];

  const participationMetrics = [
    { label: "Total Participants", value: "1,248", change: "+12.5%", trend: "up" },
    { label: "Active Participants", value: "892", change: "+8.2%", trend: "up" },
    { label: "Completion Rate", value: "78.5%", change: "+5.3%", trend: "up" },
    { label: "Average Response Time", value: "2.4 hrs", change: "-15%", trend: "down" },
  ];

  const recentPrograms = [
    {
      name: "Employee Wellness 2024",
      organization: "Healthcare Solutions",
      activities: 24,
      participants: 340,
      status: "active",
      completion: 65,
    },
    {
      name: "Customer Satisfaction Survey",
      organization: "Tech Innovators",
      activities: 12,
      participants: 180,
      status: "active",
      completion: 82,
    },
    {
      name: "Annual Training Assessment",
      organization: "Global Education",
      activities: 18,
      participants: 290,
      status: "pending",
      completion: 45,
    },
    {
      name: "Q4 Performance Review",
      organization: "Finance Corp",
      activities: 8,
      participants: 120,
      status: "active",
      completion: 91,
    },
  ];

  const upcomingActivities = [
    { title: "Health Assessment Survey", date: "Dec 5, 2025", time: "09:00 AM", participants: 45 },
    { title: "Training Evaluation", date: "Dec 7, 2025", time: "02:00 PM", participants: 32 },
    { title: "Customer Feedback Poll", date: "Dec 10, 2025", time: "10:30 AM", participants: 68 },
    { title: "Employee Engagement Survey", date: "Dec 12, 2025", time: "03:00 PM", participants: 54 },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage organizations, programs, and activities</p>
          </div>
          <div className="flex items-center gap-3">
            <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option>Last 30 days</option>
              <option>Last 7 days</option>
              <option>Last 90 days</option>
            </select>
            <button className="px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue-dark">
              Create Program
            </button>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mainStats.map((stat, index) => (
            <GradientStatCard
              key={index}
              title={stat.title}
              value={stat.value}
              subtitle={stat.subtitle}
              icon={stat.icon}
              variant={stat.variant}
            />
          ))}
        </div>

        {/* Activity Status & Participation Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Status */}
          <Card>
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold">Activity Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {activityStatus.map((status, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`${status.bgColor} w-10 h-10 rounded-lg flex items-center justify-center`}>
                          <status.icon className={`w-5 h-5 ${status.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{status.label}</p>
                          <p className="text-xs text-gray-500">{status.count} activities</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{status.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`${status.barColor} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${status.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">276</p>
                    <p className="text-xs text-gray-600 mt-1">Total Activities</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">89</p>
                    <p className="text-xs text-gray-600 mt-1">Currently Live</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">124</p>
                    <p className="text-xs text-gray-600 mt-1">Scheduled</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participation Metrics */}
          <Card>
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold">Participation Metrics</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {participationMetrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">{metric.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center gap-1 ${
                        metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {metric.trend === 'up' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <TrendingUp className="w-4 h-4 rotate-180" />
                        )}
                        <span className="text-sm font-semibold">{metric.change}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">vs last month</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Participation Chart Placeholder */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Participation Trends</CardTitle>
              <button className="text-gray-500 hover:text-gray-700">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-80 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Area Chart Placeholder</p>
                <p className="text-sm text-gray-400 mt-1">Participation trends over time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Programs */}
          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Recent Programs</CardTitle>
                <button className="text-sm text-qsights-blue font-medium hover:underline">
                  View All
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Program</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Activities</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Participants</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentPrograms.map((program, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{program.name}</p>
                            <p className="text-xs text-gray-500">{program.organization}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{program.activities}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{program.participants}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-qsights-blue h-2 rounded-full"
                                style={{ width: `${program.completion}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{program.completion}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            program.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {program.status === 'active' ? 'Active' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Activities */}
          <Card>
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold">Upcoming Activities</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {upcomingActivities.map((activity, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">{activity.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{activity.date}</span>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{activity.time}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Users className="w-3.5 h-3.5" />
                      <span>{activity.participants} participants</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200 text-center">
                <button className="text-sm text-qsights-blue font-medium hover:underline">
                  View All Activities
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
