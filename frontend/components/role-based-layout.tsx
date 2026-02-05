"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import AppLayout from "./app-layout";
import ProgramAdminLayout from "./program-admin-layout";
import ProgramManagerLayout from "./program-manager-layout";
import ProgramModeratorLayout from "./program-moderator-layout";
import EvaluationAdminLayout from "./evaluation-admin-layout";

interface RoleBasedLayoutProps {
  children: React.ReactNode;
}

export default function RoleBasedLayout({ children }: RoleBasedLayoutProps) {
  const { currentUser, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Fix hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug logging
  useEffect(() => {
    if (mounted && currentUser) {
      console.log('🔍 RoleBasedLayout - User Role:', currentUser.role);
      console.log('🔍 RoleBasedLayout - Full User:', currentUser);
    }
  }, [mounted, currentUser]);

  // Don't block rendering - show content immediately
  if (!mounted) {
    return null;
  }

  const role = currentUser?.role;
  console.log('🎯 RoleBasedLayout - Rendering with role:', role);

  // Route to specific layout based on role
  if (role === 'program-admin') {
    console.log('✅ Rendering ProgramAdminLayout');
    return <ProgramAdminLayout>{children}</ProgramAdminLayout>;
  }
  
  if (role === 'program-manager') {
    console.log('✅ Rendering ProgramManagerLayout');
    return <ProgramManagerLayout>{children}</ProgramManagerLayout>;
  }
  
  if (role === 'program-moderator') {
    console.log('✅ Rendering ProgramModeratorLayout');
    return <ProgramModeratorLayout>{children}</ProgramModeratorLayout>;
  }

  if (role === 'evaluation-admin') {
    console.log('✅ Rendering EvaluationAdminLayout');
    return <EvaluationAdminLayout>{children}</EvaluationAdminLayout>;
  }

  // Default to AppLayout for super-admin, admin, and other roles
  console.log('⚠️ Rendering AppLayout (default) for role:', role);
  return <AppLayout>{children}</AppLayout>;
}
