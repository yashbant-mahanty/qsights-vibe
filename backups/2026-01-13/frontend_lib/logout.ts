export async function handleLogout() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });

    // Clear any cached data before redirect
    if (typeof window !== 'undefined') {
      // Small delay to ensure logout API completes
      await new Promise(resolve => setTimeout(resolve, 100));
      // Hard redirect to clear all state
      window.location.href = "/";
    }
  } catch (error) {
    // Silently handle logout errors and redirect anyway
    if (typeof window !== 'undefined') {
      window.location.href = "/";
    }
  }
}
