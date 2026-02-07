"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { handleLogout } from "@/lib/logout";
import { useAuth } from "@/contexts/AuthContext";
import { themeApi } from "@/lib/api";
import { GlobalSearchBar } from "@/components/global-search-bar";
import NotificationBell from "@/components/notification-bell";
import {
  LayoutDashboard,
  FolderTree,
  UserCheck,
  FileText,
  Activity,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserCog,
} from "lucide-react";
import { getNavigationItems, getRoleDisplayName as getDisplayName, UserRole } from "@/lib/permissions";

interface ProgramAdminLayoutProps {
  children: React.ReactNode;
}

// Icon mapping for dynamic navigation - define outside component to prevent recreation
const iconMap: { [key: string]: any } = {
  LayoutDashboard,
  FolderTree,
  UserCheck,
  FileText,
  Activity,
  BarChart3,
  Settings,
  UserCog,
};

// Memoized sidebar item component to prevent re-renders
const SidebarItem = React.memo(
  ({ item, isActive, sidebarOpen }: { item: any; isActive: boolean; sidebarOpen: boolean }) => {
    // Get icon component safely - use a default if not found
    const IconComponent = React.useMemo(() => {
      return iconMap[item.iconName] || iconMap[item.icon] || LayoutDashboard;
    }, [item.iconName, item.icon]);
    
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
          !sidebarOpen && "justify-center"
        } ${
          isActive 
            ? "bg-qsights-dark text-white" 
            : "text-gray-700 hover:bg-qsights-cyan/10 hover:text-qsights-dark"
        }`}
        title={!sidebarOpen ? item.label : ""}
      >
        <IconComponent className="w-5 h-5 flex-shrink-0" />
        {sidebarOpen && (
          <span className="text-sm font-medium">{item.label}</span>
        )}
      </Link>
    );
  },
  // Custom comparison function - only re-render if these props actually change
  (prevProps, nextProps) => {
    return (
      prevProps.item.href === nextProps.item.href &&
      prevProps.item.icon === nextProps.item.icon &&
      prevProps.item.iconName === nextProps.item.iconName &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.sidebarOpen === nextProps.sidebarOpen
    );
  }
);

SidebarItem.displayName = 'SidebarItem';

export default function ProgramAdminLayout({ children }: ProgramAdminLayoutProps) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const lastUserKeyRef = useRef<string>('');
  const [sidebarItems, setSidebarItems] = useState<any[]>(() => {
    // Try to get cached sidebar items on initial load
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('qsights_program_admin_sidebar');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {}
      }
    }
    return [];
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('qsights_logo');
    }
    return null;
  });
  const [logoLoading, setLogoLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('qsights_logo');
    }
    return true;
  });
  const pathname = usePathname();

  useEffect(() => {
    async function loadLogo() {
      try {
        if (typeof window !== 'undefined') {
          const cachedLogo = localStorage.getItem('qsights_logo');
          if (cachedLogo) {
            setLogoUrl(cachedLogo);
          }
        }
        const settings = await themeApi.getAll();
        const logo = settings?.branding?.logo?.value;
        if (logo) {
          setLogoUrl(logo);
          if (typeof window !== 'undefined') {
            localStorage.setItem('qsights_logo', logo);
          }
        }
      } catch (error) {
        console.error("Failed to load logo:", error);
      } finally {
        setLogoLoading(false);
      }
    }
    loadLogo();
  }, []);

  // Create a stable key for user based on role and services
  const userRole = currentUser?.role || '';
  const servicesKey = currentUser?.services?.join(',') || '';
  const userKey = `${userRole}:${servicesKey}`;

  // Use useMemo for navigation items to prevent recreation
  // Store only plain objects with icon names (strings), not component references
  const navigationItems = useMemo(() => {
    if (!currentUser) return null;
    
    const userServices = currentUser.services || [];
    const navItems = getNavigationItems(currentUser.role as UserRole, userServices);
    
    // Filter out Settings for non-super-admin roles
    const filteredItems = navItems.filter(item => {
      if (item.href === '/settings' && currentUser.role !== 'super-admin') {
        return false;
      }
      return true;
    });
    
    // Return plain objects with icon name strings, not component references
    return filteredItems.map(item => ({
      ...item,
      iconName: item.icon  // Store icon name as string
    }));
  }, [userRole, servicesKey]);

  // Only update sidebar items when navigation items actually change
  useEffect(() => {
    if (navigationItems && userKey !== lastUserKeyRef.current) {
      lastUserKeyRef.current = userKey;
      setSidebarItems(navigationItems);
      // Cache for instant load on navigation
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('qsights_program_admin_sidebar', JSON.stringify(navigationItems));
      }
    }
  }, [navigationItems, userKey]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        } ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className={`object-contain transition-all ${sidebarOpen ? 'h-8' : 'h-10 w-10'}`}
              />
            ) : logoLoading ? (
              <div className={`bg-gray-100 rounded ${sidebarOpen ? 'h-8 w-24' : 'h-10 w-10'}`} />
            ) : sidebarOpen ? (
              <div></div>
            ) : (
              <div></div>
            )}
          
          {/* Desktop Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {/* Mobile Close */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-4rem)]">
          {sidebarItems.map((item, index) => {
            // FIXED: Exact match OR child routes - this keeps Programs tab highlighted when on /programs/create
            // Special case: dashboard and program-admin routes should only match exactly to prevent conflicts
            const isDashboardOrProgramAdmin = item.href === '/dashboard' || item.href === '/program-admin';
            const isActive = isDashboardOrProgramAdmin 
              ? pathname === item.href
              : (pathname === item.href || pathname.startsWith(item.href + '/'));
            
            return (
              <SidebarItem
                key={`${item.href}-${index}`}
                item={item}
                isActive={isActive}
                sidebarOpen={sidebarOpen}
              />
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="h-full px-4 lg:px-6 flex items-center justify-between">
            {/* Left Side */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>

              {/* Breadcrumbs */}
              <div className="hidden md:flex items-center gap-2 text-sm">
                <span className="text-gray-500">{currentUser?.role ? getDisplayName(currentUser.role as UserRole) : 'Loading...'}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900 font-medium">Dashboard</span>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <GlobalSearchBar className="hidden md:flex" />

              {/* Notifications */}
              <NotificationBell />

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {isLoading ? (
                    <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
                  ) : (
                    <div className="w-8 h-8 bg-qsights-blue rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {currentUser?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">{currentUser?.role ? getDisplayName(currentUser.role as UserRole) : 'Loading...'}</p>
                    <p className="text-xs text-gray-500">{currentUser?.email || 'Not logged in'}</p>
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
                          {currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : currentUser?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{currentUser?.role ? getDisplayName(currentUser.role as UserRole) : 'User'}</p>
                          <p className="text-blue-100 text-xs lowercase truncate">{currentUser?.role?.replace('_', '-') || 'program-admin'}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <p className="text-white/90 text-xs break-words">{currentUser?.email || 'user@example.com'}</p>
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
                        href="/account"
                        className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                          <svg className="w-4 h-4 text-qsights-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="font-medium">Account Settings</span>
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
                        onClick={() => handleLogout(router)}
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
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
