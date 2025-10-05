import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateHtmlFromNodes } from "@lexical/html";
import { $getRoot } from "lexical";
import { useEffect, useRef } from "react";

interface Props {
  onBodyChange?: (html: string) => void;
}

export default function ExportHtmlPlugin({ onBodyChange }: Props) {
  const [editor] = useLexicalComposerContext();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!onBodyChange) return;

    return editor.registerUpdateListener(() => {
      // Debounce the HTML generation
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        editor.getEditorState().read(() => {
          const root = $getRoot();
          const hasContent =
            root.getTextContent().trim().length > 0 ||
            root.getChildrenSize() > 1;

          if (hasContent) {
            const html = $generateHtmlFromNodes(editor);

            // Wrap in container div with styling
            const wrappedHtml = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              ${html}
            </div>`;

            onBodyChange(wrappedHtml);
          } else {
            onBodyChange("");
          }
        });
      }, 300);
    });
  }, [editor, onBodyChange]);

  return null;
}
