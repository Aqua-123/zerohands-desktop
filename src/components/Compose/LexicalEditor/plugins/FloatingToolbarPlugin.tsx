import React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from "lexical";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { $createParagraphNode, $createTextNode } from "lexical";
import { $createHeadingNode } from "@lexical/rich-text";
import { $createListNode, $createListItemNode } from "@lexical/list";
import { parseHtmlToBlocks } from "../utils/parser";

interface Props {
  onAskAI?: (text: string) => void;
}

export default function FloatingToolbarPlugin({ onAskAI }: Props) {
  const [editor] = useLexicalComposerContext();
  const [showToolbar, setShowToolbar] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isRephrasing, setIsRephrasing] = useState(false);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection) && !selection.isCollapsed()) {
          const text = selection.getTextContent();
          if (text.trim()) {
            setSelectedText(text);

            const domSelection = window.getSelection();
            if (domSelection && domSelection.rangeCount > 0) {
              const range = domSelection.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              setPosition({
                top: rect.top - 50,
                left: rect.left + rect.width / 2,
              });
              setShowToolbar(true);
            }
          } else {
            setShowToolbar(false);
          }
        } else {
          setShowToolbar(false);
        }
      });
    });
  }, [editor]);

  const handleFormat = useCallback(
    (format: "bold" | "italic" | "underline") => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    [editor],
  );

  const handleRephrase = useCallback(
    async (tone: string) => {
      if (isRephrasing) return;

      setIsRephrasing(true);
      try {
        const response = await fetch("/api/rephrase-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: selectedText,
            tone,
            context: "email composition",
          }),
        });

        if (!response.ok) throw new Error("Failed to rephrase");

        const data = await response.json();
        const rephrased = data.rephrasedText || data.text || selectedText;

        // Insert HTML, not plain text
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            // Parse HTML into blocks and convert to Lexical nodes
            const blocks = parseHtmlToBlocks(rephrased);
            const nodes = blocks.map((block) => {
              switch (block.type) {
                case "heading1": {
                  const h1 = $createHeadingNode("h1");
                  if (block.content) h1.append($createTextNode(block.content));
                  return h1;
                }
                case "heading2": {
                  const h2 = $createHeadingNode("h2");
                  if (block.content) h2.append($createTextNode(block.content));
                  return h2;
                }
                case "heading3": {
                  const h3 = $createHeadingNode("h3");
                  if (block.content) h3.append($createTextNode(block.content));
                  return h3;
                }
                case "list": {
                  const ul = $createListNode("bullet");
                  const li = $createListItemNode();
                  if (block.content) li.append($createTextNode(block.content));
                  ul.append(li);
                  return ul;
                }
                case "orderedlist": {
                  const ol = $createListNode("number");
                  const oli = $createListItemNode();
                  if (block.content) oli.append($createTextNode(block.content));
                  ol.append(oli);
                  return ol;
                }
                default: {
                  const p = $createParagraphNode();
                  if (block.content) p.append($createTextNode(block.content));
                  return p;
                }
              }
            });

            // Replace selection with new nodes
            selection.insertNodes(nodes);
          }
        });
      } catch (error) {
        console.error("Rephrase error:", error);
      } finally {
        setIsRephrasing(false);
        setShowToolbar(false);
      }
    },
    [editor, selectedText, isRephrasing],
  );

  const handleAskAI = useCallback(() => {
    if (onAskAI && selectedText) {
      onAskAI(selectedText);
      setShowToolbar(false);
    }
  }, [onAskAI, selectedText]);

  if (!showToolbar) return null;

  return createPortal(
    <div
      className="fixed z-[9999] flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        onClick={() => handleFormat("bold")}
        className="rounded p-2 hover:bg-gray-100"
        title="Bold"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"
          />
        </svg>
      </button>

      <button
        onClick={() => handleFormat("italic")}
        className="rounded p-2 hover:bg-gray-100"
        title="Italic"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 4h4M14 4l-4 16m-4 0h4"
          />
        </svg>
      </button>

      <button
        onClick={() => handleFormat("underline")}
        className="rounded p-2 hover:bg-gray-100"
        title="Underline"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 4v7a5 5 0 0010 0V4M5 21h14"
          />
        </svg>
      </button>

      <div className="h-6 w-px bg-gray-300" />

      {onAskAI && (
        <>
          <button
            onClick={handleAskAI}
            className="flex items-center gap-1 rounded px-2 py-1 text-purple-600 hover:bg-purple-50"
            title="Ask AI"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z"
              />
            </svg>
            <span className="text-xs">Ask AI</span>
          </button>
          <div className="h-6 w-px bg-gray-300" />
        </>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-1 rounded px-2 py-1 hover:bg-gray-100"
            disabled={isRephrasing}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span className="text-xs">
              {isRephrasing ? "Rephrasing..." : "Rephrase"}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {[
            "professional",
            "friendly",
            "casual",
            "persuasive",
            "concise",
            "detailed",
          ].map((tone) => (
            <DropdownMenuItem
              key={tone}
              onClick={() => handleRephrase(tone)}
              className="text-sm capitalize"
            >
              {tone}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>,
    document.body,
  );
}
