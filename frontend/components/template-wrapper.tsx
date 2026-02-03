"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LandingPageAdvanced from "./landing-page-new";
import LandingPageRegular from "./landing-page";
import { themeApi } from "@/lib/api";
import { getRedirectUrl } from "@/lib/auth";

export default function TemplateWrapper() {
  const [template, setTemplate] = useState<string>("advanced");
  const [mounted, setMounted] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Show content immediately
    setMounted(true);
    
    // Check authentication and redirect if logged in
    checkAuthAndRedirect();
    
    // Load template setting in background (non-blocking)
    loadTemplate();
  }, []);

  async function checkAuthAndRedirect() {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include"
      });
      
      if (response.ok) {
        const data = await response.json();
        const userRole = data.user?.role;
        
        if (userRole) {
          const redirectUrl = getRedirectUrl(userRole);
          console.log(`✅ User logged in as ${userRole}, redirecting to ${redirectUrl}`);
          router.push(redirectUrl);
          return;
        }
      }
    } catch (error) {
      console.log("Not authenticated, showing landing page");
    } finally {
      setCheckingAuth(false);
    }
  }

  async function loadTemplate() {
    try {
      // Try to load theme settings, but don't block rendering
      const settings = await themeApi.getAll().catch(() => null);
      if (settings?.general?.template_style?.value) {
        setTemplate(settings.general.template_style.value);
      }
    } catch (error) {
      console.error("Error loading template:", error);
      // Keep default template on error
    }
  }

  // Show loading while checking auth
  if (checkingAuth || !mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue"></div>
      </div>
    );
  }

  // Render based on selected template
  if (template === "regular") {
    return <LandingPageRegular />;
  }

  return <LandingPageAdvanced />;
}
