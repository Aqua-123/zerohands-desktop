import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $isParagraphNode,
  $isTextNode,
  $createTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
  KEY_BACKSPACE_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  ElementNode,
} from 'lexical';
import { $isHeadingNode } from '@lexical/rich-text';
import { $isListItemNode } from '@lexical/list';
import { useEffect } from 'react';
import { $isImageNode } from '../nodes/ImageNode';
import { $isGifNode } from '../nodes/GifNode';
import { $isDividerNode } from '../nodes/DividerNode';

export default function KeyboardPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Handle Enter key
    const removeEnterHandler = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event: KeyboardEvent | null) => {
        if (!event) return false;

        // Shift+Enter inserts a line break
        if (event.shiftKey) {
          editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false);
          return true;
        }

        // Regular Enter splits the block
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();

          // Handle enter after decorator nodes (image, divider, etc.)
          if ($isImageNode(anchorNode) || $isGifNode(anchorNode) || $isDividerNode(anchorNode)) {
            const paragraph = $createParagraphNode();
            anchorNode.insertAfter(paragraph);
            paragraph.select();
            return true;
          }
        }

        // Let default behavior handle the rest
        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    // Handle Backspace at start of block
    const removeBackspaceHandler = editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event: KeyboardEvent | null) => {
        if (!event) return false;

        const selection = $getSelection();

        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }

        const anchorNode = selection.anchor.getNode();
        const anchorOffset = selection.anchor.offset;

        // Check if we're at the start of a block
        if (anchorOffset === 0) {
          let blockNode: ElementNode | null = null;

          if ($isTextNode(anchorNode)) {
            blockNode = anchorNode.getParent();
          } else if (anchorNode instanceof ElementNode) {
            blockNode = anchorNode;
          }

          if (!blockNode) return false;

          const previousSibling = blockNode.getPreviousSibling();

          // Don't merge with media blocks or dividers
          if (previousSibling) {
            if ($isImageNode(previousSibling) || $isGifNode(previousSibling) || $isDividerNode(previousSibling)) {
              // Just move cursor to end of previous block
              previousSibling.selectEnd();
              return true;
            }

            // Merge with previous text block
            if ($isParagraphNode(previousSibling) || $isHeadingNode(previousSibling) || $isListItemNode(previousSibling)) {
              // Get content of current block
              const currentContent = blockNode.getTextContent();

              // Append to previous block
              if (currentContent) {
                const lastChild = previousSibling.getLastChild();
                if ($isTextNode(lastChild)) {
                  lastChild.setTextContent(lastChild.getTextContent() + currentContent);
                } else {
                  previousSibling.append($createTextNode(currentContent));
                }
              }

              // Remove current block
              blockNode.remove();

              // Move cursor to merge point
              previousSibling.selectEnd();
              return true;
            }
          }
        }

        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    return () => {
      removeEnterHandler();
      removeBackspaceHandler();
    };
  }, [editor]);

  return null;
}
