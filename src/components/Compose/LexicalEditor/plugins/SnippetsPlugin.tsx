import React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_MODIFIER_COMMAND,
} from "lexical";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import CommandPalette from "@/components/Compose/CommandPalette";

export default function SnippetsPlugin() {
  const [editor] = useLexicalComposerContext();
  const [showPalette, setShowPalette] = useState(false);

  useEffect(() => {
    return editor.registerCommand(
      KEY_MODIFIER_COMMAND,
      (event: KeyboardEvent) => {
        // Check for Ctrl+/ or Cmd+/
        if ((event.ctrlKey || event.metaKey) && event.key === "/") {
          event.preventDefault();
          setShowPalette(true);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  const handleQuickSnippet = useCallback(
    (text: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(text);
        }
      });
      setShowPalette(false);
    },
    [editor],
  );

  const handleClose = useCallback(() => {
    setShowPalette(false);
  }, []);

  if (!showPalette) return null;

  return createPortal(
    <CommandPalette
      isOpen={showPalette}
      onClose={handleClose}
      onSlashCommand={() => {}} // Not used in snippets mode
      onQuickSnippet={handleQuickSnippet}
      mode="snippets"
    />,
    document.body,
  );
}
