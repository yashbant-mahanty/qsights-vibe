"use client";

import React, { useState } from "react";
import ProgramModeratorLayout from "@/components/program-moderator-layout";
import { LayoutDashboard, Activity, BarChart3, ClipboardCheck } from "lucide-react";

// Import shared dashboard (same as Program Admin)
import SharedDashboardContent from "@/components/shared/SharedDashboardContent";

type TabType = "dashboard" | "events" | "reports" | "evaluation";

export default function ProgramModeratorUnifiedPage() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  const tabs = [
    { id: "dashboard" as TabType, label: "Dashboard", icon: LayoutDashboard },
    { id: "events" as TabType, label: "Events", icon: Activity },
    { id: "reports" as TabType, label: "Reports", icon: BarChart3 },
    { id: "evaluation" as TabType, label: "Evaluation", icon: ClipboardCheck },
  ];

  return (
    <ProgramModeratorLayout>
      <div className="h-full flex flex-col">
        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="flex space-x-1 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                    isActive
                      ? "text-qsights-cyan border-qsights-cyan bg-blue-50"
                      : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "dashboard" && <SharedDashboardContent />}
          {activeTab === "events" && (
            <iframe 
              src="/activities" 
              className="w-full h-full border-0"
              style={{ minHeight: "calc(100vh - 180px)" }}
            />
          )}
          {activeTab === "reports" && (
            <iframe 
              src="/analytics" 
              className="w-full h-full border-0"
              style={{ minHeight: "calc(100vh - 180px)" }}
            />
          )}
          {activeTab === "evaluation" && (
            <iframe 
              src="/evaluation-new" 
              className="w-full h-full border-0"
              style={{ minHeight: "calc(100vh - 180px)" }}
            />
          )}
        </div>
      </div>
    </ProgramModeratorLayout>
  );
}
