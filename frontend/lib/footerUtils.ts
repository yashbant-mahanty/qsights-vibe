/**
 * Utility functions for rendering footer text with hyperlinks
 */

export interface FooterHyperlink {
  text: string;
  url: string;
  target: '_blank' | '_self';
}

/**
 * Landing config interface for footer settings
 */
export interface FooterLandingConfig {
  footerText?: string;
  footerTextUrl?: string;
  footerLinkText?: string;
  footerLinkUrl?: string;
  footerLinkTarget?: string;
  footerHyperlinks?: FooterHyperlink[];
  [key: string]: any;
}

/**
 * Build hyperlinks array from landing config
 * Handles both:
 * 1. footerHyperlinks array (direct array format)
 * 2. Individual fields: footerLinkText, footerLinkUrl, footerLinkTarget
 * 
 * @param landingConfig The landing page configuration object
 * @returns Array of hyperlinks to render
 */
export function getFooterHyperlinksFromConfig(landingConfig?: FooterLandingConfig): FooterHyperlink[] {
  if (!landingConfig) return [];
  
  const hyperlinks: FooterHyperlink[] = [];
  
  // First, check for the array format (footerHyperlinks)
  if (landingConfig.footerHyperlinks && Array.isArray(landingConfig.footerHyperlinks)) {
    hyperlinks.push(...landingConfig.footerHyperlinks);
  }
  
  // Then, check for individual fields (footerLinkText, footerLinkUrl)
  // This is the format used by the landing config editor
  if (landingConfig.footerLinkText && landingConfig.footerLinkUrl) {
    // Only add if not already in the array (avoid duplicates)
    const alreadyExists = hyperlinks.some(
      h => h.text === landingConfig.footerLinkText && h.url === landingConfig.footerLinkUrl
    );
    if (!alreadyExists) {
      hyperlinks.push({
        text: landingConfig.footerLinkText,
        url: landingConfig.footerLinkUrl,
        target: (landingConfig.footerLinkTarget as '_blank' | '_self') || '_blank'
      });
    }
  }
  
  return hyperlinks;
}

/**
 * Renders footer text with hyperlinks
 * @param footerText The base footer text
 * @param hyperlinks Array of hyperlink configurations
 * @returns HTML string with hyperlinks embedded
 */
export function renderFooterWithHyperlinks(
  footerText: string,
  hyperlinks?: FooterHyperlink[]
): string {
  if (!hyperlinks || hyperlinks.length === 0) {
    return footerText || '';
  }

  let result = footerText || '';
  
  // Sort hyperlinks by text length (longest first) to avoid partial replacements
  const sortedLinks = [...hyperlinks].sort((a, b) => b.text.length - a.text.length);
  
  sortedLinks.forEach(link => {
    if (link.text && link.url) {
      // Escape special regex characters in the search text
      const escapedText = link.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Create the hyperlink HTML with proper attributes
      // Use QSights theme colors: primary cyan (#06B6D4) with hover to darker shade
      // Removed inline event handlers to avoid CSP issues, use CSS hover instead
      const linkHtml = `<a href="${escapeHtml(link.url)}" target="${link.target}" rel="${link.target === '_blank' ? 'noopener noreferrer' : ''}" class="footer-hyperlink" style="color: #06B6D4; text-decoration: none; transition: color 0.2s ease; cursor: pointer; pointer-events: auto;">${escapeHtml(link.text)}</a>`;
      
      // Replace all occurrences of the text with the hyperlink
      const regex = new RegExp(escapedText, 'g');
      result = result.replace(regex, linkHtml);
    }
  });
  
  return result;
}

/**
 * Escapes HTML special characters to prevent XSS
 * SSR-safe version that doesn't rely on DOM
 * @param text Text to escape
 * @returns Escaped text
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

/**
 * React component props for footer text with hyperlinks
 */
export interface FooterTextProps {
  text: string;
  hyperlinks?: FooterHyperlink[];
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders footer text with hyperlinks for React components
 * Use this with dangerouslySetInnerHTML
 */
export function getFooterHtml(text: string, hyperlinks?: FooterHyperlink[]): { __html: string } {
  return { __html: renderFooterWithHyperlinks(text, hyperlinks) };
}
