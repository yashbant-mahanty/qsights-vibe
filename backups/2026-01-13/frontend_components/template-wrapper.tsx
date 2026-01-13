"use client";

import React, { useState, useEffect } from "react";
import LandingPageAdvanced from "./landing-page-new";
import LandingPageRegular from "./landing-page";
import { themeApi } from "@/lib/api";

export default function TemplateWrapper() {
  const [template, setTemplate] = useState<string>("advanced");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Show content immediately
    setMounted(true);
    
    // Load template setting in background (non-blocking)
    loadTemplate();
  }, []);

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

  // Show content immediately without loading screen
  if (!mounted) {
    return <LandingPageAdvanced />;
  }

  // Render based on selected template
  if (template === "regular") {
    return <LandingPageRegular />;
  }

  return <LandingPageAdvanced />;
}
