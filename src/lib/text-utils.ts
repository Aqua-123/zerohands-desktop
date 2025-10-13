/**
 * Utility functions for text processing and formatting
 */

// URL detection regex that matches various URL formats
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

/**
 * Check if text contains HTML tags
 */
export function isHtmlContent(text: string): boolean {
  return /<[^>]*>/.test(text);
}

/**
 * Convert plain text URLs to clickable links
 */
export function makeLinksClickable(text: string): string {
  if (!text) return text;

  if (/<a[^>]*href/i.test(text)) {
    return text;
  }

  let processedText = text;

  // First, convert URLs to clickable links
  processedText = processedText.replace(URL_REGEX, (url) => {
    // Clean up the URL (remove trailing punctuation that's not part of URL)
    const cleanUrl = url.replace(/[.,;:!?]*$/, "");
    const trailingPunctuation = url.slice(cleanUrl.length);

    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${cleanUrl}</a>${trailingPunctuation}`;
  });

  // Convert email addresses to mailto links (but only if they're not already part of a URL)
  processedText = processedText.replace(EMAIL_REGEX, (match, email, offset) => {
    // Check if this email is already part of a URL
    const beforeMatch = processedText.slice(Math.max(0, offset - 20), offset);
    if (beforeMatch.includes('href="') || beforeMatch.includes("mailto:")) {
      return match; // Don't modify if already part of a link
    }

    return `<a href="mailto:${email}" class="text-blue-600 hover:text-blue-800 underline">${email}</a>`;
  });

  return processedText;
}

/**
 * Process HTML content to make sure all plain text URLs are clickable
 */
export function enhanceLinksInHtml(htmlContent: string): string {
  if (!htmlContent) return htmlContent;

  // Split content by existing HTML tags to avoid processing URLs inside tags
  const parts = htmlContent.split(/(<[^>]*>)/);

  return parts
    .map((part) => {
      // Skip HTML tags
      if (part.startsWith("<") && part.endsWith(">")) {
        return part;
      }

      // Process text content
      return makeLinksClickable(part);
    })
    .join("");
}

/**
 * Main function to make URLs clickable in any content
 */
export function processLinksInContent(content: string): string {
  if (!content) return content;

  // If it's HTML content, use the HTML-aware processor
  if (isHtmlContent(content)) {
    return enhanceLinksInHtml(content);
  }

  // For plain text, convert directly
  return makeLinksClickable(content);
}

/**
 * Extract all URLs from text content
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];

  const urls = text.match(URL_REGEX);
  return urls ? Array.from(new Set(urls)) : [];
}

/**
 * Extract all email addresses from text content
 */
export function extractEmails(text: string): string[] {
  if (!text) return [];

  const emails = text.match(EMAIL_REGEX);
  return emails ? Array.from(new Set(emails)) : [];
}

/**
 * Sanitize and format text for safe display
 */
export function sanitizeText(text: string): string {
  if (!text) return text;

  // Basic HTML escaping for plain text
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
