'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Short Link Redirect Page
 * Handles redirects from short URLs like https://prod.qsights.com/e/demo-poll-2026
 */
export default function ShortLinkRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      router.replace('/e/error?reason=invalid_link');
      return;
    }

    const fetchAndRedirect = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://prod.qsights.com/api'}/public/short-link/${slug}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            router.replace('/e/error?reason=link_not_found');
          } else {
            router.replace('/e/error?reason=redirect_failed');
          }
          return;
        }

        const data = await response.json();
        
        if (data.status === 'success' && data.redirect_url) {
          // Redirect to the original URL
          window.location.href = data.redirect_url;
        } else {
          router.replace('/e/error?reason=invalid_response');
        }
      } catch (err) {
        console.error('Short link redirect error:', err);
        router.replace('/e/error?reason=redirect_failed');
      }
    };

    fetchAndRedirect();
  }, [slug, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
        <p className="text-sm text-gray-400 mt-2">Please wait while we redirect you</p>
        {error && (
          <p className="text-sm text-red-500 mt-4">{error}</p>
        )}
      </div>
    </div>
  );
}
