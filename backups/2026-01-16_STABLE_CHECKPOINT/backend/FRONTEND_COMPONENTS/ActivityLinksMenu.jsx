import React, { useState } from 'react';
import { 
  Link2, 
  Copy, 
  Check, 
  UserPlus, 
  LogIn, 
  Users 
} from 'lucide-react';

/**
 * ActivityLinksMenu Component
 * 
 * Displays a dropdown menu with three types of activity links:
 * 1. Registration Link - For participants to register with custom fields
 * 2. Direct Link - Direct access to activity (requires login)
 * 3. Anonymous Link - Guest access without registration
 * 
 * Props:
 * @param {string} activityId - The UUID of the activity
 * @param {string} authToken - Bearer token for authentication
 * @param {string} apiUrl - Base API URL (default: http://localhost:8000/api)
 */
const ActivityLinksMenu = ({ activityId, authToken, apiUrl = 'http://localhost:8000/api' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [links, setLinks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);

  // Fetch activity links from backend
  const fetchLinks = async () => {
    if (links) {
      setIsOpen(!isOpen);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiUrl}/activities/${activityId}/links`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activity links');
      }

      const data = await response.json();
      setLinks(data.links);
      setIsOpen(true);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching activity links:', err);
    } finally {
      setLoading(false);
    }
  };

  // Copy link to clipboard
  const copyToClipboard = async (url, linkType) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(linkType);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Get icon for each link type
  const getLinkIcon = (type) => {
    const icons = {
      registration: <UserPlus className="w-4 h-4" />,
      direct: <LogIn className="w-4 h-4" />,
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
        title="Get Activity Links"
      >
        <Link2 className="w-4 h-4" />
        {loading ? 'Loading...' : 'Links'}
      </button>

      {/* Dropdown Menu */}
      {isOpen && links && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="absolute right-0 z-50 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Activity Links</h3>
              <p className="text-xs text-gray-500 mt-1">Copy and share these links</p>
            </div>

            {/* Links List */}
            <div className="py-2">
              {Object.entries(links).map(([type, linkData]) => (
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
                          {linkData.label}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {linkData.description}
                        </div>
                        <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded font-mono truncate">
                          {linkData.url}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => copyToClipboard(linkData.url, type)}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedLink === type ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Note */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                💡 Share these links with participants to access the activity
              </p>
            </div>
          </div>
        </>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute right-0 z-50 mt-2 w-80 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
};

export default ActivityLinksMenu;
