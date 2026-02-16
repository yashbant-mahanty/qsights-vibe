"use client";

import { ExternalLink } from "lucide-react";

interface QuestionReference {
  id: string;
  reference_type: 'text' | 'url';
  title?: string;
  content_text?: string;
  content_url?: string;
  display_position: 'AFTER_QUESTION' | 'AFTER_ANSWER';
  order_index: number;
}

interface ReferencesDisplayProps {
  references: QuestionReference[];
  className?: string;
}

export function ReferencesDisplay({ references, className = "" }: ReferencesDisplayProps) {
  if (!references || references.length === 0) {
    return null;
  }

  // Sort by order_index
  const sortedRefs = [...references].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className={`references-section mt-3 mb-3 ${className}`}>
      <div className="space-y-3">
        {sortedRefs.map((ref, index) => (
          <div key={ref.id || index} className="reference-item border-l-2 border-blue-500 pl-4">
            {ref.reference_type === 'text' ? (
              <div>
                {ref.title && (
                  <span className="text-sm font-medium text-gray-900 block mb-1">{ref.title}</span>
                )}
                <div 
                  className="text-sm text-gray-700 prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1"
                  dangerouslySetInnerHTML={{ __html: ref.content_text || '' }}
                />
              </div>
            ) : (
              <div>
                {ref.title && (
                  <span className="text-sm font-medium text-gray-900 block mb-1">{ref.title}</span>
                )}
                <a
                  href={ref.content_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="break-all">{ref.content_url}</span>
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReferencesDisplay;
