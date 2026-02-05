"use client";

import React, { useState, useEffect } from "react";
import LandingPageAdvanced from "./landing-page-new";
import LandingPageRegular from "./landing-page";
import { themeApi } from "@/lib/api";

export default function TemplateWrapper() {
  // Load from cache immediately for instant rendering
  const [template, setTemplate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('qsights_template') || 'advanced';
    }
    return 'advanced';
  });

  useEffect(() => {
    // Load template setting in background and update cache
    async function loadTemplate() {
      try {
        const settings = await themeApi.getAll().catch(() => null);
        if (settings?.general?.template_style?.value) {
          const templateValue = settings.general.template_style.value;
          setTemplate(templateValue);
          if (typeof window !== 'undefined') {
            localStorage.setItem('qsights_template', templateValue);
          }
        }
      } catch (error) {
        // Keep cached/default template on error
      }
    }
    loadTemplate();
  }, []);

  // Render based on selected template
  if (template === "regular") {
    return <LandingPageRegular />;
  }

  return <LandingPageAdvanced />;
}
