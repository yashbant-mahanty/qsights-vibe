'use client';

import { useParams } from 'next/navigation';

export default function ProgramReportsPage() {
  const params = useParams();
  const programId = params?.programId as string;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Reports & Analytics</h1>
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <p className="text-gray-600">
          Program-specific reports and analytics will be displayed here.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Showing data for Program ID: {programId}
        </p>
      </div>
    </div>
  );
}
