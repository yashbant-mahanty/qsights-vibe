"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalSearchBarProps {
  className?: string;
  placeholder?: string;
  widthClassName?: string;
}

const placeholderByPath: Record<string, string> = {
  "/organizations": "Search organizations...",
  "/group-heads": "Search group heads...",
  "/programs": "Search programs...",
  "/participants": "Search participants...",
  "/questionnaires": "Search questionnaires...",
  "/activities": "Search events...",
  "/reports": "Search reports...",
  "/analytics": "Search activities...",
};

export function GlobalSearchBar({ className, placeholder, widthClassName = "w-64" }: GlobalSearchBarProps) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const resolvedPlaceholder = placeholder || placeholderByPath[pathname] || "Search...";

  useEffect(() => {
    setQuery("");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("global-search-clear"));
    }
  }, [pathname]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (typeof window === "undefined") return;

    if (value.trim() === "") {
      window.dispatchEvent(new CustomEvent("global-search-clear"));
      return;
    }

    window.dispatchEvent(
      new CustomEvent("global-search", {
        detail: { query: value, pathname },
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("global-search-submit", {
        detail: { query: query.trim(), pathname },
      })
    );
  };

  const handleClear = () => {
    setQuery("");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("global-search-clear"));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg",
        widthClassName,
        className
      )}
    >
      <Search className="w-4 h-4 text-gray-500" />
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={resolvedPlaceholder}
        className="bg-transparent border-none outline-none text-sm w-full"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  );
}

export default GlobalSearchBar;
