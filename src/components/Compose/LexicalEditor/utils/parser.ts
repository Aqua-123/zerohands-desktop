import {
  cleanHtmlContent,
  ContentBlock,
  parseLLMContentToBlocks,
} from "@/lib/llm-content-parser";

export interface ParsedBlock {
  type:
    | "text"
    | "heading1"
    | "heading2"
    | "heading3"
    | "list"
    | "orderedlist"
    | "image"
    | "gif"
    | "divider"
    | "button";
  content: string;
  metadata?: {
    src?: string;
    alt?: string;
    width?: number;
    height?: number;
  };
}

export function parseHtmlToBlocks(html: string): ParsedBlock[] {
  // First clean the HTML
  const cleanedHtml = cleanHtmlContent(html);

  // Then parse to blocks using existing utility
  const contentBlocks = parseLLMContentToBlocks(cleanedHtml);

  // Map to our format
  return contentBlocks.map((block: ContentBlock) => {
    let type: ParsedBlock["type"] = "text";

    switch (block.type) {
      case "heading1":
        type = "heading1";
        break;
      case "heading2":
        type = "heading2";
        break;
      case "heading3":
        type = "heading3";
        break;
      case "list":
        type = "list";
        break;
      case "orderedlist":
        type = "orderedlist";
        break;
      case "image":
        type = "image";
        break;
      case "divider":
        type = "divider";
        break;
      default:
        type = "text";
    }

    return {
      type,
      content: block.content,
      metadata: block.metadata,
    };
  });
}

export function parseTextToBlocks(text: string): ParsedBlock[] {
  const lines = text.split("\n");
  const blocks: ParsedBlock[] = [];

  for (const line of lines) {
    if (line.trim()) {
      // Check for headings
      if (line.startsWith("# ")) {
        blocks.push({ type: "heading1", content: line.slice(2) });
      } else if (line.startsWith("## ")) {
        blocks.push({ type: "heading2", content: line.slice(3) });
      } else if (line.startsWith("### ")) {
        blocks.push({ type: "heading3", content: line.slice(4) });
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        blocks.push({ type: "list", content: line.slice(2) });
      } else if (/^\d+\.\s/.test(line)) {
        blocks.push({
          type: "orderedlist",
          content: line.replace(/^\d+\.\s/, ""),
        });
      } else if (line === "---" || line === "***") {
        blocks.push({ type: "divider", content: "" });
      } else {
        blocks.push({ type: "text", content: line });
      }
    }
  }

  return blocks.length > 0 ? blocks : [{ type: "text", content: "" }];
}
