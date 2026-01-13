"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";

interface PerQuestionLanguageSwitcherProps {
  availableLanguages: string[];
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
  questionId: string | number;
  isEnabled: boolean;
}

const LANGUAGE_NAMES: Record<string, string> = {
  EN: "English",
  HI: "हिंदी (Hindi)",
  TA: "தமிழ் (Tamil)",
  TE: "తెలుగు (Telugu)",
  BN: "বাংলা (Bengali)",
  MR: "मराठी (Marathi)",
  GU: "ગુજરાતી (Gujarati)",
  KN: "ಕನ್ನಡ (Kannada)",
  ML: "മലയാളം (Malayalam)",
  PA: "ਪੰਜਾਬੀ (Punjabi)",
  OR: "ଓଡ଼ିଆ (Odia)",
  AS: "অসমীয়া (Assamese)",
  UR: "اردو (Urdu)",
  AR: "العربية (Arabic)",
  FR: "Français (French)",
  ES: "Español (Spanish)",
  DE: "Deutsch (German)",
  PT: "Português (Portuguese)",
  RU: "Русский (Russian)",
  ZH: "中文 (Chinese)",
  JA: "日本語 (Japanese)",
  KO: "한국어 (Korean)",
};

const PerQuestionLanguageSwitcher: React.FC<PerQuestionLanguageSwitcherProps> = ({
  availableLanguages,
  currentLanguage,
  onLanguageChange,
  questionId,
  isEnabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Don't render if feature is disabled or less than 2 languages available
  if (!isEnabled || !availableLanguages || availableLanguages.length < 2) {
    return null;
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageSelect = (lang: string) => {
    onLanguageChange(lang);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        title="Switch language for this question only"
        aria-label={`Change language for question, currently ${LANGUAGE_NAMES[currentLanguage] || currentLanguage}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="w-3 h-3" />
        <span>{currentLanguage}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1 min-w-[160px] bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1"
          role="listbox"
          aria-label="Available languages"
        >
          {availableLanguages.map((lang) => (
            <button
              key={`${questionId}-${lang}`}
              type="button"
              onClick={() => handleLanguageSelect(lang)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                lang === currentLanguage
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-700"
              }`}
              role="option"
              aria-selected={lang === currentLanguage}
            >
              {LANGUAGE_NAMES[lang] || lang}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PerQuestionLanguageSwitcher;
