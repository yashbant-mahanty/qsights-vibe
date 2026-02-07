import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export async function handleLogout(router?: AppRouterInstance) {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });

    // Clear any cached data
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      
      // Small delay to ensure logout API completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use hard redirect to ensure clean logout
      window.location.href = "/";
    }
  } catch (error) {
    // Silently handle logout errors and redirect anyway
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    }
  }
}
