/**
 * Utility functions for S3 presigned URLs
 */
import { fetchWithAuth } from '@/lib/api';

// Cache for presigned URLs to avoid repeated API calls
const presignedUrlCache: Map<string, { url: string; expiresAt: number }> = new Map();

// Cache duration buffer (generate new URL if expires within this time)
const CACHE_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Extract S3 key from a full S3 URL
 * Example: https://qsights.s3.ap-southeast-1.amazonaws.com/qsightsprod/folder/file.jpg -> qsightsprod/folder/file.jpg
 */
export function extractS3KeyFromUrl(url: string): string | null {
  if (!url) return null;
  
  // If it's already just a key (no https://), return it
  if (!url.startsWith('http')) {
    return url;
  }
  
  try {
    const urlObj = new URL(url);
    // S3 URL format: https://{bucket}.s3.{region}.amazonaws.com/{key}
    // Or: https://s3.{region}.amazonaws.com/{bucket}/{key}
    
    if (urlObj.hostname.includes('.s3.') && urlObj.hostname.includes('.amazonaws.com')) {
      // Format: bucket.s3.region.amazonaws.com/key
      return urlObj.pathname.slice(1); // Remove leading '/'
    } else if (urlObj.hostname.startsWith('s3.') && urlObj.hostname.includes('.amazonaws.com')) {
      // Format: s3.region.amazonaws.com/bucket/key
      const parts = urlObj.pathname.slice(1).split('/');
      return parts.slice(1).join('/'); // Remove bucket name
    }
    
    // CloudFront or other CDN URL - extract path after domain
    return urlObj.pathname.slice(1);
  } catch (e) {
    console.error('Failed to parse S3 URL:', url, e);
    return null;
  }
}

/**
 * Check if a URL is an S3 URL that needs presigning
 */
export function isS3Url(url: string): boolean {
  if (!url) return false;
  return url.includes('.s3.') && url.includes('.amazonaws.com') && !url.includes('X-Amz-Signature');
}

/**
 * Check if a URL is already a presigned URL
 */
export function isPresignedUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('X-Amz-Signature') || url.includes('X-Amz-Credential');
}

/**
 * Get a presigned URL for a single S3 key
 */
export async function getPresignedUrl(keyOrUrl: string, expiresIn: number = 3600): Promise<string | null> {
  if (!keyOrUrl) return null;
  
  // If it's already a presigned URL, return it
  if (isPresignedUrl(keyOrUrl)) {
    return keyOrUrl;
  }
  
  // Extract key from URL if needed
  const key = isS3Url(keyOrUrl) ? extractS3KeyFromUrl(keyOrUrl) : keyOrUrl;
  if (!key) return keyOrUrl; // Return original if we can't extract key
  
  // Check cache
  const cached = presignedUrlCache.get(key);
  if (cached && cached.expiresAt > Date.now() + CACHE_BUFFER_MS) {
    return cached.url;
  }
  
  try {
    const response = await fetchWithAuth('/uploads/s3/view-url', {
      method: 'POST',
      body: JSON.stringify({ key, expires: expiresIn }),
    });
    
    if (response.status === 'success' && response.data?.url) {
      // Cache the URL
      presignedUrlCache.set(key, {
        url: response.data.url,
        expiresAt: Date.now() + (expiresIn * 1000),
      });
      return response.data.url;
    }
    
    return keyOrUrl; // Fallback to original
  } catch (error) {
    console.error('Failed to get presigned URL:', error);
    return keyOrUrl; // Fallback to original
  }
}

/**
 * Get presigned URLs for multiple S3 keys
 */
export async function getPresignedUrls(
  keysOrUrls: string[],
  expiresIn: number = 3600
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  
  if (!keysOrUrls || keysOrUrls.length === 0) {
    return result;
  }
  
  // Separate URLs that need presigning from those that don't
  const keysToFetch: string[] = [];
  
  for (const keyOrUrl of keysOrUrls) {
    if (!keyOrUrl) continue;
    
    // Already presigned - use as-is
    if (isPresignedUrl(keyOrUrl)) {
      result.set(keyOrUrl, keyOrUrl);
      continue;
    }
    
    // Extract key
    const key = isS3Url(keyOrUrl) ? extractS3KeyFromUrl(keyOrUrl) : keyOrUrl;
    if (!key) {
      result.set(keyOrUrl, keyOrUrl);
      continue;
    }
    
    // Check cache
    const cached = presignedUrlCache.get(key);
    if (cached && cached.expiresAt > Date.now() + CACHE_BUFFER_MS) {
      result.set(keyOrUrl, cached.url);
      continue;
    }
    
    keysToFetch.push(key);
  }
  
  // Fetch presigned URLs for uncached keys
  if (keysToFetch.length > 0) {
    try {
      const response = await fetchWithAuth('/uploads/s3/bulk-view-urls', {
        method: 'POST',
        body: JSON.stringify({ keys: keysToFetch, expires: expiresIn }),
      });
      
      if (response.status === 'success' && response.data?.urls) {
        for (const item of response.data.urls) {
          if (item.url) {
            // Cache the URL
            presignedUrlCache.set(item.key, {
              url: item.url,
              expiresAt: Date.now() + (expiresIn * 1000),
            });
            
            // Map back to original key/URL
            for (const original of keysOrUrls) {
              const extractedKey = isS3Url(original) ? extractS3KeyFromUrl(original) : original;
              if (extractedKey === item.key) {
                result.set(original, item.url);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to get bulk presigned URLs:', error);
    }
  }
  
  // Return original URLs for any that failed
  for (const keyOrUrl of keysOrUrls) {
    if (!result.has(keyOrUrl)) {
      result.set(keyOrUrl, keyOrUrl);
    }
  }
  
  return result;
}

/**
 * Clear the presigned URL cache
 */
export function clearPresignedUrlCache(): void {
  presignedUrlCache.clear();
}

/**
 * React hook for using presigned URLs with automatic refresh
 */
export function usePresignedUrls(
  urls: string[] | undefined,
  expiresIn: number = 3600
): { presignedUrls: string[]; loading: boolean; error: string | null } {
  // This would be implemented as a React hook with useState and useEffect
  // For now, we'll just return the utility functions
  // The actual hook implementation should be in a separate file
  throw new Error('Use getPresignedUrls directly or implement usePresignedUrls in a React component');
}
