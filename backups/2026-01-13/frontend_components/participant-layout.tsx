"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { handleLogout } from "@/lib/logout";
import {
  LayoutDashboard,
  Activity,
  CheckCircle,
  Bell,
  Search,
  ChevronDown,
  Menu,
  X,
  Globe,
} from "lucide-react";

interface ParticipantLayoutProps {
  children: React.ReactNode;
}

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/participant" },
  { icon: Activity, label: "My Events", href: "/participant/activities" },
  { icon: CheckCircle, label: "Completed", href: "/participant/completed" },
];

export default function ParticipantLayout({ children }: ParticipantLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Side - Logo */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div></div>
            </div>

            {/* Center - Navigation (Desktop) */}
            <nav className="hidden lg:flex items-center gap-1">
              {sidebarItems.map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-qsights-blue hover:text-white transition-colors"
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </a>
              ))}
            </nav>

            {/* Right Side - Actions */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg w-48">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent border-none outline-none text-sm w-full"
                />
              </div>

              {/* Notifications */}
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    JD
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">John Doe</p>
                    <p className="text-xs text-gray-500">Participant</p>
                  </div>
                  <ChevronDown className="hidden md:block w-4 h-4 text-gray-500" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info Header */}
                    <div className="bg-gradient-to-br from-qsights-blue to-blue-600 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-base font-bold border-2 border-white/30">
                          JD
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">John Doe</p>
                          <p className="text-blue-100 text-xs lowercase truncate">participant</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <p className="text-white/90 text-xs break-words">john.doe@example.com</p>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <a
                        href="/profile"
                        className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="font-medium">Profile Settings</span>
                      </a>
                      <a
                        href="/help"
                        className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="font-medium">Help & Support</span>
                      </a>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-gray-100 py-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </div>
                        <span className="font-semibold">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed top-16 left-0 right-0 bg-white border-b border-gray-200 z-50 lg:hidden">
          <nav className="p-4 space-y-1">
            {sidebarItems.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-qsights-blue hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
      )}

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
