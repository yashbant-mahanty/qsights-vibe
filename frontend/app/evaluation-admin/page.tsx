'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page has been deprecated. Redirect to the new evaluation page.
export default function EvaluationManagementPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/evaluation-new');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
