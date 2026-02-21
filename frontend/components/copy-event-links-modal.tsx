'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  XCircle,
  UserPlus,
  Eye,
  Users,
  ExternalLink,
  Copy,
  CheckCircle,
  QrCode,
  LinkIcon,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { activitiesApi, type ShortLinkData } from '@/lib/api';
import { toast } from '@/components/ui/toast';

interface CopyEventLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityId: string;
  activityName: string;
  allowGuests: boolean;
  enableGeneratedLinks: boolean;
  onNavigateToGeneratedLinks?: () => void;
  onOpenQrModal: (url: string, title: string, subtitle: string, color: string) => void;
}

interface LinkState {
  url: string;
  label: string;
  description: string;
}

interface ShortLinkState {
  enabled: boolean;
  slug: string;
  shortUrl: string;
  isLoading: boolean;
  isChecking: boolean;
  isAvailable: boolean | null;
  message: string;
  existingId?: string;
}

const SHORT_URL_BASE = 'https://prod.qsights.com/e/';
const MAX_TOTAL_LENGTH = 50;
const MAX_SLUG_LENGTH = 24; // 50 - 26 (length of base URL)

export default function CopyEventLinksModal({
  isOpen,
  onClose,
  activityId,
  activityName,
  allowGuests,
  enableGeneratedLinks,
  onNavigateToGeneratedLinks,
  onOpenQrModal,
}: CopyEventLinksModalProps) {
  const [links, setLinks] = useState<{
    registration: LinkState;
    preview: LinkState;
    anonymous: LinkState;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Short link states for each link type
  const [shortLinks, setShortLinks] = useState<{
    registration: ShortLinkState;
    preview: ShortLinkState;
    anonymous: ShortLinkState;
  }>({
    registration: { enabled: false, slug: '', shortUrl: '', isLoading: false, isChecking: false, isAvailable: null, message: '' },
    preview: { enabled: false, slug: '', shortUrl: '', isLoading: false, isChecking: false, isAvailable: null, message: '' },
    anonymous: { enabled: false, slug: '', shortUrl: '', isLoading: false, isChecking: false, isAvailable: null, message: '' },
  });

  // Debounce timer refs
  const checkTimers = React.useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Load links and short links when modal opens
  useEffect(() => {
    if (isOpen && activityId) {
      loadLinks();
      loadShortLinks();
    }
  }, [isOpen, activityId]);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const data = await activitiesApi.getActivityLinks(activityId);
      setLinks(data.links);
    } catch (err) {
      console.error('Failed to load links:', err);
      toast({ title: 'Error', description: 'Failed to load activity links', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadShortLinks = async () => {
    try {
      const data = await activitiesApi.getShortLinks(activityId);
      const newState = { ...shortLinks };
      
      (['registration', 'preview', 'anonymous'] as const).forEach((type) => {
        const shortLink = data.data[type];
        if (shortLink) {
          newState[type] = {
            enabled: true,
            slug: shortLink.slug,
            shortUrl: shortLink.short_url,
            isLoading: false,
            isChecking: false,
            isAvailable: true,
            message: `Click count: ${shortLink.click_count}`,
            existingId: shortLink.id,
          };
        }
      });
      
      setShortLinks(newState);
    } catch (err) {
      console.error('Failed to load short links:', err);
    }
  };

  const sanitizeSlug = (input: string): string => {
    return input
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, MAX_SLUG_LENGTH);
  };

  const checkSlugAvailability = useCallback(async (type: 'registration' | 'preview' | 'anonymous', slug: string) => {
    if (!slug || slug.length < 3) {
      setShortLinks(prev => ({
        ...prev,
        [type]: { ...prev[type], isAvailable: null, message: slug.length > 0 ? 'Slug must be at least 3 characters' : '', isChecking: false }
      }));
      return;
    }

    setShortLinks(prev => ({
      ...prev,
      [type]: { ...prev[type], isChecking: true }
    }));

    try {
      const result = await activitiesApi.checkSlugAvailability(slug, shortLinks[type].existingId);
      setShortLinks(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          isChecking: false,
          isAvailable: result.available && result.valid,
          message: result.message,
          slug: result.sanitized_slug,
          shortUrl: result.short_url || '',
        }
      }));
    } catch (err) {
      setShortLinks(prev => ({
        ...prev,
        [type]: { ...prev[type], isChecking: false, isAvailable: false, message: 'Error checking availability' }
      }));
    }
  }, [shortLinks]);

  const handleSlugChange = (type: 'registration' | 'preview' | 'anonymous', value: string) => {
    const sanitized = sanitizeSlug(value);
    setShortLinks(prev => ({
      ...prev,
      [type]: { 
        ...prev[type], 
        slug: sanitized,
        shortUrl: sanitized ? `${SHORT_URL_BASE}${sanitized}` : '',
        isAvailable: null,
        message: ''
      }
    }));

    // Clear existing timer
    if (checkTimers.current[type]) {
      clearTimeout(checkTimers.current[type]);
    }

    // Set new debounced check
    if (sanitized.length >= 3) {
      checkTimers.current[type] = setTimeout(() => {
        checkSlugAvailability(type, sanitized);
      }, 500);
    }
  };

  const handleToggleShortUrl = (type: 'registration' | 'preview' | 'anonymous') => {
    setShortLinks(prev => ({
      ...prev,
      [type]: { 
        ...prev[type], 
        enabled: !prev[type].enabled,
        isAvailable: null,
        message: ''
      }
    }));
  };

  const handleGenerateSlug = async (type: 'registration' | 'preview' | 'anonymous') => {
    setShortLinks(prev => ({
      ...prev,
      [type]: { ...prev[type], isLoading: true }
    }));

    try {
      const result = await activitiesApi.suggestSlug(activityId);
      // Add type suffix to make it unique per link type
      const suggestedSlug = `${result.data.suggested_slug}-${type.slice(0, 3)}`;
      const sanitized = sanitizeSlug(suggestedSlug);
      
      setShortLinks(prev => ({
        ...prev,
        [type]: { 
          ...prev[type], 
          slug: sanitized,
          shortUrl: `${SHORT_URL_BASE}${sanitized}`,
          isLoading: false 
        }
      }));

      // Check availability
      checkSlugAvailability(type, sanitized);
    } catch (err) {
      setShortLinks(prev => ({
        ...prev,
        [type]: { ...prev[type], isLoading: false }
      }));
      toast({ title: 'Error', description: 'Failed to generate slug', variant: 'error' });
    }
  };

  const handleSaveShortLink = async (type: 'registration' | 'preview' | 'anonymous') => {
    if (!links) return;
    
    const shortLink = shortLinks[type];
    if (!shortLink.slug || !shortLink.isAvailable) {
      toast({ title: 'Error', description: 'Please enter a valid and available slug', variant: 'error' });
      return;
    }

    const originalUrl = type === 'registration' ? links.registration.url 
      : type === 'preview' ? links.preview.url 
      : links.anonymous.url;

    setShortLinks(prev => ({
      ...prev,
      [type]: { ...prev[type], isLoading: true }
    }));

    try {
      const result = await activitiesApi.createOrUpdateShortLink(activityId, {
        link_type: type,
        slug: shortLink.slug,
        original_url: originalUrl,
      });

      setShortLinks(prev => ({
        ...prev,
        [type]: { 
          ...prev[type], 
          isLoading: false,
          shortUrl: result.data.short_url,
          existingId: result.data.id,
          message: 'Saved successfully!'
        }
      }));

      toast({ title: 'Success', description: 'Short link saved!', variant: 'success' });
    } catch (err: any) {
      setShortLinks(prev => ({
        ...prev,
        [type]: { ...prev[type], isLoading: false, message: err?.message || 'Failed to save' }
      }));
      toast({ title: 'Error', description: err?.message || 'Failed to save short link', variant: 'error' });
    }
  };

  const copyToClipboard = async (url: string, linkType: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(linkType);
      toast({ title: 'Copied!', description: `${linkType} copied to clipboard`, variant: 'success' });
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to copy link', variant: 'error' });
    }
  };

  const getUrlToCopy = (type: 'registration' | 'preview' | 'anonymous'): string => {
    if (!links) return '';
    const shortLink = shortLinks[type];
    if (shortLink.enabled && shortLink.shortUrl && shortLink.existingId) {
      return shortLink.shortUrl;
    }
    return type === 'registration' ? links.registration.url 
      : type === 'preview' ? links.preview.url 
      : links.anonymous.url;
  };

  if (!isOpen) return null;

  const renderLinkSection = (
    type: 'registration' | 'preview' | 'anonymous',
    icon: React.ReactNode,
    title: string,
    description: string,
    colorClass: string,
    bgClass: string,
    buttonClass: string
  ) => {
    if (!links) return null;
    
    const linkData = type === 'registration' ? links.registration 
      : type === 'preview' ? links.preview 
      : links.anonymous;
    const shortLink = shortLinks[type];
    const displayUrl = getUrlToCopy(type);
    const linkLabel = `${title.replace(' Link', '')} Link`;

    return (
      <div className={`border border-gray-200 rounded-lg p-3 hover:border-${colorClass}-300 hover:bg-${bgClass}/50 transition-all`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 bg-${bgClass} rounded-lg`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            
            {/* Original URL */}
            <div className="mt-2 flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={displayUrl} 
                className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-gray-600 truncate"
              />
              <button
                onClick={() => onOpenQrModal(displayUrl, `${title.replace(' Link', '')} QR`, description, colorClass)}
                className={`p-1.5 rounded text-${colorClass}-600 hover:bg-${bgClass} transition-colors`}
                title="View QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>
              <button
                onClick={() => copyToClipboard(displayUrl, linkLabel)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                  copiedLink === linkLabel 
                    ? 'bg-green-500 text-white' 
                    : buttonClass
                }`}
              >
                {copiedLink === linkLabel ? (
                  <><CheckCircle className="w-3.5 h-3.5" /> Copied!</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy</>
                )}
              </button>
            </div>

            {/* Short URL Toggle */}
            <div className="mt-3 border-t border-gray-100 pt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <div 
                  onClick={() => handleToggleShortUrl(type)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    shortLink.enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    shortLink.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </div>
                <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  Use Short URL
                </span>
              </label>

              {/* Short URL Input */}
              {shortLink.enabled && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1.5 rounded-l border border-r-0 border-gray-200 whitespace-nowrap">
                      {SHORT_URL_BASE}
                    </span>
                    <input
                      type="text"
                      value={shortLink.slug}
                      onChange={(e) => handleSlugChange(type, e.target.value)}
                      placeholder="custom-slug"
                      maxLength={MAX_SLUG_LENGTH}
                      className={`flex-1 text-xs border rounded-r px-2 py-1.5 focus:outline-none focus:ring-1 ${
                        shortLink.isAvailable === true ? 'border-green-300 focus:ring-green-500' :
                        shortLink.isAvailable === false ? 'border-red-300 focus:ring-red-500' :
                        'border-gray-200 focus:ring-blue-500'
                      }`}
                    />
                    <button
                      onClick={() => handleGenerateSlug(type)}
                      disabled={shortLink.isLoading}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Auto-generate from event name"
                    >
                      <RefreshCw className={`w-4 h-4 ${shortLink.isLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Character counter and status */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {shortLink.isChecking ? (
                        <span className="text-gray-400 flex items-center gap-1">
                          <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                          Checking...
                        </span>
                      ) : shortLink.isAvailable === true ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {shortLink.message || 'Available'}
                        </span>
                      ) : shortLink.isAvailable === false ? (
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {shortLink.message || 'Not available'}
                        </span>
                      ) : shortLink.message ? (
                        <span className="text-gray-500">{shortLink.message}</span>
                      ) : null}
                    </div>
                    <span className={`${
                      shortLink.slug.length > MAX_SLUG_LENGTH - 5 ? 'text-orange-500' : 'text-gray-400'
                    }`}>
                      {shortLink.slug.length}/{MAX_SLUG_LENGTH}
                    </span>
                  </div>

                  {/* Save button */}
                  {shortLink.slug && shortLink.isAvailable && (
                    <button
                      onClick={() => handleSaveShortLink(type)}
                      disabled={shortLink.isLoading || !shortLink.isAvailable}
                      className={`w-full px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                        shortLink.existingId 
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {shortLink.isLoading ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : shortLink.existingId ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          Update Short URL
                        </>
                      ) : (
                        <>
                          <LinkIcon className="w-3.5 h-3.5" />
                          Save Short URL
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[480px] max-w-[90vw] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-600" />
            <p className="text-base font-semibold text-gray-900">Copy Event Links</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading links...</p>
          </div>
        ) : links ? (
          <div className="p-4 space-y-3">
            {/* Registration Link */}
            {renderLinkSection(
              'registration',
              <UserPlus className="w-5 h-5 text-blue-600" />,
              'Registration Link',
              'Participants must register before taking survey',
              'blue',
              'blue-100',
              'bg-blue-600 text-white hover:bg-blue-700'
            )}

            {/* Preview Link */}
            {renderLinkSection(
              'preview',
              <Eye className="w-5 h-5 text-purple-600" />,
              'Preview Link',
              'For testing only - responses not saved',
              'purple',
              'purple-100',
              'bg-purple-600 text-white hover:bg-purple-700'
            )}

            {/* Anonymous Link */}
            {allowGuests && renderLinkSection(
              'anonymous',
              <Users className="w-5 h-5 text-orange-600" />,
              'Anonymous Link',
              'No registration required - anonymous responses',
              'orange',
              'orange-100',
              'bg-orange-600 text-white hover:bg-orange-700'
            )}

            {/* Generated Links Section */}
            {enableGeneratedLinks && (
              <div className="border border-purple-200 rounded-lg p-3 hover:border-purple-400 hover:bg-purple-50/50 transition-all">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <ExternalLink className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">Generated Links</p>
                    <p className="text-xs text-gray-500 mt-0.5">Manage unique, trackable links for participants</p>
                    <div className="mt-2">
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToGeneratedLinks?.();
                        }}
                        className="px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1 bg-purple-600 text-white hover:bg-purple-700"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Manage Generated Links
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            <XCircle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="mt-2 text-sm text-red-500">Failed to load links</p>
          </div>
        )}
      </div>
    </div>
  );
}
