import React, { useState } from 'react';
import { 
  Link2, 
  Copy, 
  Check, 
  UserPlus, 
  LogIn, 
  Users 
} from 'lucide-react';

interface ActivityLinksMenuProps {
  activityId: string;
  authToken?: string;
  apiUrl?: string;
}

interface LinkData {
  label: string;
  description: string;
  url: string;
}

interface LinksResponse {
  links?: Record<string, LinkData>;
  activity?: {
    allow_guests: boolean;
  };
  [key: string]: any;
}

/**
 * ActivityLinksMenu Component
 * 
 * Displays a dropdown menu with three types of event links:
 * 1. Registration Link - For participants to register with custom fields
 * 2. Preview Link - Preview link for participants to view/take the event
 * 3. Anonymous Link - Guest access without registration
 */
const ActivityLinksMenu: React.FC<ActivityLinksMenuProps> = ({ 
  activityId, 
  authToken, 
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [links, setLinks] = useState<LinksResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Fetch event links from backend
  const fetchLinks = async () => {
    if (links) {
      setIsOpen(!isOpen);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Use the full backend URL, not the Next.js API route
      const backendUrl = apiUrl || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';
      const url = `${backendUrl}/activities/${activityId}/links`;
      
      console.log('Fetching activity links from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch links:', response.status, errorText);
        throw new Error(`Failed to fetch event links (${response.status})`);
      }

      const data = await response.json();
      console.log('Received activity links:', data);
      setLinks(data); // Store entire response including activity data
      setIsOpen(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch event links';
      setError(errorMessage);
      console.error('Error fetching event links:', err);
    } finally {
      setLoading(false);
    }
  };

  // Copy link to clipboard with fallback methods
  const copyToClipboard = async (url: string, linkType: string) => {
    try {
      // Method 1: Modern Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setCopiedLink(linkType);
        setTimeout(() => setCopiedLink(null), 2000);
        console.log(`✓ Copied ${linkType} link to clipboard`);
        return;
      }

      // Method 2: Fallback for older browsers or non-HTTPS
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setCopiedLink(linkType);
          setTimeout(() => setCopiedLink(null), 2000);
          console.log(`✓ Copied ${linkType} link to clipboard using fallback`);
        } else {
          throw new Error('Copy command failed');
        }
      } finally {
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      // Show the URL in a prompt so user can manually copy
      const message = `Copy this link:\n\n${url}`;
      if (window.prompt) {
        window.prompt(message, url);
      } else {
        alert(`Failed to copy automatically. Link: ${url}`);
      }
    }
  };

  // Get icon for each link type
  const getLinkIcon = (type: string) => {
    const icons: Record<string, React.ReactElement> = {
      registration: <UserPlus className="w-4 h-4" />,
      preview: <LogIn className="w-4 h-4" />,
      anonymous: <Users className="w-4 h-4" />
    };
    return icons[type] || <Link2 className="w-4 h-4" />;
  };

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      <button
        onClick={fetchLinks}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Get Event Links"
      >
        <Link2 className="w-4 h-4" />
        {loading ? 'Loading...' : 'Links'}
      </button>

      {/* Dropdown Menu - Rendered with maximum z-index */}
      {isOpen && links && (
        <>
          {/* Backdrop - Fixed position, highest z-index */}
          <div 
            className="fixed inset-0 z-[99998]" 
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', zIndex: 99998 }}
          />
          
          {/* Menu Panel - Fixed positioning to ensure it appears outside everything */}
          <div 
            className="fixed mt-2 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
            style={{ 
              position: 'fixed',
              zIndex: 99999,
              right: '20px',
              top: '140px'
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Event Links</h3>
              <p className="text-xs text-gray-500 mt-1">Copy and share these links to access the event</p>
            </div>

            {/* Links List */}
            <div className="py-2">
              {links && links.links && Object.entries(links.links).map(([type, linkData]) => {
                const link = linkData as LinkData;
                // Skip anonymous link if guest access is not enabled
                if (type === 'anonymous' && links.activity && !links.activity.allow_guests) {
                  return null;
                }
                
                return (
                  <div 
                    key={type}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-1 text-blue-600">
                          {getLinkIcon(type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 mb-1">
                            {link.label}
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            {link.description}
                          </div>
                          <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded font-mono truncate">
                            {link.url}
                          </div>
                        </div>
                      </div>
                      
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => copyToClipboard(link.url, type)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedLink === type ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        {copiedLink === type && (
                          <div className="absolute -top-8 right-0 bg-green-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-[10000]">
                            Copied!
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Note */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                💡 Share these links with participants to access the event
              </p>
            </div>
          </div>
        </>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute right-0 z-[9999] mt-2 w-80 bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
};

export default ActivityLinksMenu;
