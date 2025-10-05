import React from "react";
import { $getRoot, $createParagraphNode } from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { HeadingNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { useRef } from "react";

import { ImageNode } from "./nodes/ImageNode";
import { GifNode } from "./nodes/GifNode";
import { DividerNode } from "./nodes/DividerNode";
import { ButtonNode } from "./nodes/ButtonNode";

import SlashCommandPlugin from "./plugins/SlashCommandPlugin";
import SnippetsPlugin from "./plugins/SnippetsPlugin";
import FloatingToolbarPlugin from "./plugins/FloatingToolbarPlugin";
import UploadPlugin from "./plugins/UploadPlugin";
import KeyboardPlugin from "./plugins/KeyboardPlugin";
import ExportHtmlPlugin from "./plugins/ExportHtmlPlugin";
import ApiPlugin from "./plugins/ApiPlugin";
import PastePlugin from "./plugins/PastePlugin";
import { ContentBlock } from "@/lib/llm-content-parser";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";

export interface ContentEditorApi {
  insertBlocks: (blocks: ContentBlock[], insertAfterBlockId?: string) => void;
  insertLLMContent: (content: string, insertAfterBlockId?: string) => void;
  clearContent: () => void;
  getBlocks: () => ContentBlock[];
  focusBlock: (blockId: string, position?: "start" | "end") => void;
  getLastTextBlockId: () => string | null;
  undo: () => void;
  canUndo: () => boolean;
}

interface EditorProps {
  editorRef?: React.RefObject<HTMLDivElement | null>;
  onBodyChange?: (html: string) => void;
  onFilesDropped?: (files: File[]) => void;
  onEditorReady?: (api: ContentEditorApi) => void;
  onAskAI?: (selectedText: string) => void;
}

const theme = {
  paragraph: "mb-2 text-base outline-none",
  heading: {
    h1: "text-3xl font-bold mb-2 outline-none",
    h2: "text-2xl font-semibold mb-2 outline-none",
    h3: "text-xl font-medium mb-2 outline-none",
  },
  list: {
    ul: "list-disc ml-6 mb-2",
    ol: "list-decimal ml-6 mb-2",
    listitem: "mb-1",
    listitemChecked: "mb-1 line-through",
    listitemUnchecked: "mb-1",
    nested: {
      listitem: "ml-6",
    },
  },
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    code: "px-1 py-0.5 bg-gray-100 rounded font-mono text-sm",
  },
};

function onError(error: Error) {
  console.error("Lexical error:", error);
}

export default function Editor({
  editorRef,
  onBodyChange,
  onFilesDropped,
  onEditorReady,
  onAskAI,
}: EditorProps) {
  const contentEditableRef = useRef<HTMLDivElement>(null);

  const initialConfig = {
    namespace: "ContentEditor",
    theme,
    onError,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      ImageNode,
      GifNode,
      DividerNode,
      ButtonNode,
    ],
    editorState: () => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
    },
  };

  return (
    <div className="relative mb-8" ref={editorRef}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative rounded-md border-none">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                aria-placeholder="Type / for commands or Ctrl+/ for snippets"
                ref={contentEditableRef}
                className="content-editor-scroll max-h-[calc(100vh-800px)] min-h-[300px] overflow-y-auto outline-none"
                placeholder={
                  <div className="pointer-events-none absolute top-0 left-0 text-[#91918E]">
                    Type / for commands or Ctrl+/ for snippets
                  </div>
                }
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <SlashCommandPlugin />
          <SnippetsPlugin />
          <FloatingToolbarPlugin onAskAI={onAskAI} />
          <UploadPlugin onFilesDropped={onFilesDropped} />
          <KeyboardPlugin />
          <PastePlugin />
          <ExportHtmlPlugin onBodyChange={onBodyChange} />
          <ApiPlugin onEditorReady={onEditorReady} />
        </div>
      </LexicalComposer>
    </div>
  );
}
