export type ContentBlock = {
  id: string;
  type:
    | "text"
    | "heading1"
    | "heading2"
    | "heading3"
    | "image"
    | "gif"
    | "list"
    | "orderedlist"
    | "divider"
    | "button";
  content: string;
  metadata?: {
    level?: number;
    src?: string;
    alt?: string;
    width?: number;
    height?: number;
    listItems?: string[];
  };
};

export function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function parseLLMContentToBlocks(content: string): ContentBlock[] {
  if (!content.trim()) {
    return [];
  }

  // Clean up HTML content if present
  let cleanContent = content;
  if (content.includes("<") && content.includes(">")) {
    // Remove HTML tags but preserve line breaks
    cleanContent = content
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?p[^>]*>/gi, "\n")
      .replace(/<\/?div[^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  const lines = cleanContent.split("\n");
  const blocks: ContentBlock[] = [];
  let currentListType: "list" | "orderedlist" | null = null;
  let currentListItems: string[] = [];
  let currentParagraph: string[] = [];

  const flushCurrentList = () => {
    if (currentListType && currentListItems.length > 0) {
      blocks.push({
        id: generateBlockId(),
        type: currentListType,
        content: currentListItems.join("\n"),
        metadata: {
          listItems: currentListItems,
        },
      });
      currentListItems = [];
      currentListType = null;
    }
  };

  const flushCurrentParagraph = () => {
    if (currentParagraph.length > 0) {
      const paragraphText = currentParagraph.join(" ").trim();
      if (paragraphText) {
        blocks.push({
          id: generateBlockId(),
          type: "text",
          content: paragraphText,
        });
      }
      currentParagraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines unless we're in a list
    if (!trimmedLine && !currentListType) {
      flushCurrentParagraph();
      continue;
    }

    // Check for headings
    if (trimmedLine.startsWith("### ")) {
      flushCurrentList();
      flushCurrentParagraph();
      blocks.push({
        id: generateBlockId(),
        type: "heading3",
        content: trimmedLine.substring(4),
      });
      continue;
    }

    if (trimmedLine.startsWith("## ")) {
      flushCurrentList();
      flushCurrentParagraph();
      blocks.push({
        id: generateBlockId(),
        type: "heading2",
        content: trimmedLine.substring(3),
      });
      continue;
    }

    if (trimmedLine.startsWith("# ")) {
      flushCurrentList();
      flushCurrentParagraph();
      blocks.push({
        id: generateBlockId(),
        type: "heading1",
        content: trimmedLine.substring(2),
      });
      continue;
    }

    // Check for list items
    if (trimmedLine.match(/^[-*]\s+/)) {
      flushCurrentParagraph();
      if (currentListType !== "list") {
        flushCurrentList();
        currentListType = "list";
      }
      currentListItems.push(
        trimmedLine.substring(trimmedLine.indexOf(" ") + 1),
      );
      continue;
    }

    if (trimmedLine.match(/^\d+\.\s+/)) {
      flushCurrentParagraph();
      if (currentListType !== "orderedlist") {
        flushCurrentList();
        currentListType = "orderedlist";
      }
      currentListItems.push(
        trimmedLine.substring(trimmedLine.indexOf(" ") + 1),
      );
      continue;
    }

    // Check for dividers
    if (trimmedLine.match(/^[-*_]{3,}$/)) {
      flushCurrentList();
      flushCurrentParagraph();
      blocks.push({
        id: generateBlockId(),
        type: "divider",
        content: "",
      });
      continue;
    }

    const isSignatureLine = trimmedLine.match(
      /^(Best regards|Sincerely|Yours truly|Thank you|Regards|Kind regards|Cheers|Best|Yours|Respectfully|Thanks|Thank you for your time|Looking forward to hearing from you)/i,
    );
    const isNameLine = trimmedLine.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    const isEmailLine = trimmedLine.match(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    );
    const isPhoneLine = trimmedLine.match(/^[+]?[1-9][\d]{0,15}$/);
    const isAddressLine = trimmedLine.match(
      /^[0-9]+\s+[A-Za-z\s]+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Terrace|Ter|Circle|Cir|Square|Sq)/i,
    );

    if (
      isSignatureLine ||
      isNameLine ||
      isEmailLine ||
      isPhoneLine ||
      isAddressLine
    ) {
      flushCurrentParagraph();
      blocks.push({
        id: generateBlockId(),
        type: "text",
        content: trimmedLine,
      });
      continue;
    }

    // Regular text content - accumulate into paragraphs
    if (trimmedLine) {
      currentParagraph.push(trimmedLine);
    } else {
      // Empty line indicates paragraph break
      flushCurrentParagraph();
    }
  }

  // Flush any remaining content
  flushCurrentList();
  flushCurrentParagraph();

  return blocks;
}

export function insertBlocksAtPosition(
  existingBlocks: ContentBlock[],
  newBlocks: ContentBlock[],
  insertAfterBlockId?: string,
): ContentBlock[] {
  if (newBlocks.length === 0) {
    return existingBlocks;
  }

  if (!insertAfterBlockId) {
    // Insert at the end
    return [...existingBlocks, ...newBlocks];
  }

  const insertIndex = existingBlocks.findIndex(
    (block) => block.id === insertAfterBlockId,
  );
  if (insertIndex === -1) {
    // If block not found, insert at the end
    return [...existingBlocks, ...newBlocks];
  }

  const newBlocksArray = [...existingBlocks];
  newBlocksArray.splice(insertIndex + 1, 0, ...newBlocks);
  return newBlocksArray;
}

export function getLastTextBlockId(blocks: ContentBlock[]): string | null {
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].type === "text") {
      return blocks[i].id;
    }
  }
  return null;
}

export function cleanHtmlContent(htmlContent: string): string {
  // Remove HTML tags but preserve line breaks and basic formatting
  return htmlContent
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p[^>]*>/gi, "\n")
    .replace(/<\/?div[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, "\n\n") // Clean up multiple consecutive newlines
    .trim();
}
