import DOMPurify from "dompurify";

// Function to scope CSS rules to email container
export const scopeEmailStyles = (
  htmlContent: string,
  scopeId: string,
): string => {
  if (!htmlContent) return "";

  // Scope all style tags to only apply within the email container
  const scopedHTML = htmlContent.replace(
    /<style[^>]*>([\s\S]*?)<\/style>/gi,
    (match, styleContent) => {
      if (!styleContent.trim()) return "";

      // Split CSS rules and scope each one
      const rules = styleContent
        .split("}")
        .filter((rule: string) => rule.trim());
      const scopedRules = rules.map((rule: string) => {
        const trimmedRule = rule.trim();
        if (!trimmedRule) return "";

        // Find the selector part (before the first {)
        const openBraceIndex = trimmedRule.indexOf("{");
        if (openBraceIndex === -1) return trimmedRule + "}";

        const selector = trimmedRule.substring(0, openBraceIndex).trim();
        const declarations = trimmedRule.substring(openBraceIndex);

        // Skip @rules (like @media, @keyframes, etc.)
        if (selector.startsWith("@")) {
          return trimmedRule + "}";
        }

        // Scope the selector to only apply within our email container
        const scopedSelector = selector
          .split(",")
          .map((s: string) => `#${scopeId} ${s.trim()}`)
          .join(", ");

        return `${scopedSelector} ${declarations}}`;
      });

      return `<style>${scopedRules.join("\n")}</style>`;
    },
  );

  return scopedHTML;
};

// Function to detect and remove tracking content and external images
export const sanitizeEmailContent = (
  htmlContent: string,
  blockTracking: boolean,
  blockExternalImages: boolean,
): string => {
  if (!htmlContent) return htmlContent;

  let cleanedHTML = htmlContent;

  // Handle image blocking
  cleanedHTML = cleanedHTML.replace(/<img[^>]*>/gi, (match) => {
    const srcMatch = match.match(/src\s*=\s*["']([^"']*)["']/i);
    if (!srcMatch || !srcMatch[1]) return match;

    const src = srcMatch[1];

    // Always remove tracking pixels (1x1 images) regardless of settings
    if (
      /width\s*=\s*["']?1["']?/i.test(match) &&
      /height\s*=\s*["']?1["']?/i.test(match)
    ) {
      return "";
    }

    // Block external images if setting is enabled
    if (blockExternalImages) {
      // Check if it's an external image (not data URI, not relative path)
      if (src.startsWith("http://") || src.startsWith("https://")) {
        // Replace with placeholder
        return `<div style="border: 1px dashed #ccc; padding: 20px; text-align: center; background-color: #f9f9f9; margin: 10px 0;">
          <span style="color: #666; font-size: 12px;">🖼️ External image blocked for privacy</span>
        </div>`;
      }
    }

    // Remove tracking-specific images if tracking protection is enabled
    if (blockTracking) {
      const trackingDomains = [
        "google-analytics.com",
        "googletagmanager.com",
        "doubleclick.net",
        "facebook.com",
        "linkedin.com",
        "mailchimp.com",
        "constantcontact.com",
        "hubspot.com",
        "salesforce.com",
        "pardot.com",
        "marketo.com",
        "mailgun.com",
        "sendgrid.com",
        "mandrillapp.com",
        "mixpanel.com",
        "segment.com",
        "amplitude.com",
      ];

      if (trackingDomains.some((domain) => src.includes(domain))) {
        return "";
      }

      // Check for tracking parameters
      if (/[?&](utm_|track|pixel|open|click|id=)/i.test(src)) {
        return "";
      }
    }

    return match;
  });

  // Remove tracking links if tracking protection is enabled
  if (blockTracking) {
    cleanedHTML = cleanedHTML.replace(
      /<a[^>]*href\s*=\s*["']([^"']*)["'][^>]*>/gi,
      (match, href) => {
        if (/[?&](utm_|track|click|redirect)/i.test(href)) {
          // Extract the actual URL if it's a redirect
          const actualUrlMatch = href.match(
            /[?&](?:url|link|redirect)=([^&]*)/i,
          );
          if (actualUrlMatch) {
            return match.replace(href, decodeURIComponent(actualUrlMatch[1]));
          }
        }
        return match;
      },
    );
  }

  return cleanedHTML;
};

// Function to sanitize HTML content while preserving styling
export const sanitizeHTML = (
  htmlContent: string,
  blockTracking: boolean = false,
  blockExternalImages: boolean = false,
): string => {
  if (!htmlContent) return "";

  // Generate unique scope ID for this email
  const scopeId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Remove tracking content and external images if enabled
  let cleanedHTML = sanitizeEmailContent(
    htmlContent,
    blockTracking,
    blockExternalImages,
  );

  // Scope styles to prevent bleeding
  cleanedHTML = scopeEmailStyles(cleanedHTML, scopeId);

  // DOMPurify configuration - keep most content but remove dangerous attributes
  const config = {
    FORBID_TAGS: [
      "script",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "button",
    ],
    FORBID_ATTR: [
      "onload",
      "onerror",
      "onclick",
      "onmouseover",
      "onmouseout",
      "onfocus",
      "onblur",
      "onsubmit",
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target", "style"],
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM: false,
  };

  const sanitized = DOMPurify.sanitize(cleanedHTML, config);

  // Wrap in scoped container
  return `<div id="${scopeId}" class="email-content-container">${sanitized}</div>`;
};

// Function to detect and split quoted content
export const splitQuotedContent = (
  htmlContent: string,
  blockTracking: boolean = false,
  blockExternalImages: boolean = false,
) => {
  if (!htmlContent) return { mainContent: "", quotedContent: "" };

  // First sanitize the entire content
  const sanitizedContent = sanitizeHTML(
    htmlContent,
    blockTracking,
    blockExternalImages,
  );

  // Gmail-specific quoted content detection
  // Look for the gmail_quote container which wraps all quoted content
  const gmailQuoteMatch = sanitizedContent.match(
    /(<br\s*\/?>)*\s*<div[^>]*class="gmail_quote[^"]*"[^>]*>/i,
  );

  if (gmailQuoteMatch && gmailQuoteMatch.index !== undefined) {
    const splitIndex = gmailQuoteMatch.index;
    const mainContent = sanitizedContent.substring(0, splitIndex).trim();
    const quotedContent = sanitizedContent.substring(splitIndex).trim();

    // Only split if we have substantial content in both parts
    if (mainContent.length >= 10 && quotedContent.length >= 20) {
      return { mainContent, quotedContent };
    }
  }

  // Fallback to other common patterns if Gmail structure not found
  const quotedPatterns = [
    /(<br\s*\/?>|\n)*\s*On\s+.+?wrote:\s*(<br\s*\/?>|\n)*/gi,
    /(<br\s*\/?>|\n)*\s*From:\s*.+?Sent:\s*.+?/gi,
    /(<br\s*\/?>|\n)*\s*-----Original Message-----/gi,
    /(<br\s*\/?>|\n)*\s*&gt;\s*/gi, // Traditional quoted lines
    /(<br\s*\/?>|\n)*\s*<blockquote(?!\s+class="gmail_quote")/gi, // Blockquote but not Gmail's
  ];

  let splitIndex = -1;

  // Find the first occurrence of any quoted pattern
  for (const pattern of quotedPatterns) {
    const match = sanitizedContent.match(pattern);
    if (match && match.index !== undefined) {
      if (splitIndex === -1 || match.index < splitIndex) {
        splitIndex = match.index;
      }
    }
  }

  if (splitIndex === -1) {
    return { mainContent: sanitizedContent, quotedContent: "" };
  }

  const mainContent = sanitizedContent.substring(0, splitIndex).trim();
  const quotedContent = sanitizedContent.substring(splitIndex).trim();

  // Only split if we have substantial content in both parts
  if (mainContent.length < 10 || quotedContent.length < 20) {
    return { mainContent: sanitizedContent, quotedContent: "" };
  }

  return { mainContent, quotedContent };
};
