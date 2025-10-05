import React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $getNodeByKey,
  TextNode,
  $createTextNode,
} from "lexical";
import { $createHeadingNode } from "@lexical/rich-text";
import { $createListNode, $createListItemNode } from "@lexical/list";
import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import CommandPalette from "@/components/Compose/CommandPalette";
import { $createDividerNode } from "../nodes/DividerNode";
import { $createButtonNode } from "../nodes/ButtonNode";

export default function SlashCommandPlugin() {
  const [editor] = useLexicalComposerContext();
  const [showPalette, setShowPalette] = useState(false);
  const triggerRef = useRef<{ nodeKey: string; startOffset: number } | null>(
    null,
  );

  useEffect(() => {
    return editor.registerTextContentListener(() => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        const anchorNode = selection.anchor.getNode();
        const anchorOffset = selection.anchor.offset;

        // Check if we just typed '/' at the start or in empty block
        if (anchorNode instanceof TextNode) {
          const textContent = anchorNode.getTextContent();

          // Check if we have a single '/' at the start
          if (anchorOffset === 1 && textContent === "/") {
            triggerRef.current = {
              nodeKey: anchorNode.getKey(),
              startOffset: 0,
            };
            setShowPalette(true);
          } else if (
            textContent.endsWith("/") &&
            anchorOffset === textContent.length
          ) {
            // Check if '/' was typed at the end of empty paragraph
            const parent = anchorNode.getParent();
            if (parent && textContent === "/") {
              triggerRef.current = {
                nodeKey: anchorNode.getKey(),
                startOffset: anchorOffset - 1,
              };
              setShowPalette(true);
            }
          }
        }
      });
    });
  }, [editor]);

  const handleCommand = useCallback(
    (command: string, value?: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        // Remove the '/' character
        if (triggerRef.current) {
          const node = $getNodeByKey(triggerRef.current.nodeKey);
          if (node && node instanceof TextNode) {
            const text = node.getTextContent();
            if (text.includes("/")) {
              node.setTextContent(text.replace("/", ""));
            }
          }
        }

        const anchorNode = selection.anchor.getNode();
        const parentNode = anchorNode.getParent();

        switch (command) {
          case "formatBlock":
            if (parentNode) {
              if (value === "h1") {
                const heading = $createHeadingNode("h1");
                heading.append(anchorNode);
                parentNode.replace(heading);
              } else if (value === "h2") {
                const heading = $createHeadingNode("h2");
                heading.append(anchorNode);
                parentNode.replace(heading);
              } else if (value === "h3") {
                const heading = $createHeadingNode("h3");
                heading.append(anchorNode);
                parentNode.replace(heading);
              }
            }
            break;
          case "insertUnorderedList":
            // Create list manually to avoid offset issues
            if (parentNode) {
              const listNode = $createListNode("bullet");
              const listItemNode = $createListItemNode();

              // Only append anchorNode if it has content
              if (anchorNode.getTextContent().trim()) {
                listItemNode.append(anchorNode);
              } else {
                // Create a new text node with a space to avoid offset issues
                const textNode = $createTextNode(" ");
                listItemNode.append(textNode);
              }

              listNode.append(listItemNode);
              parentNode.replace(listNode);

              // Add a new paragraph after the list
              const newParagraph = $createParagraphNode();
              listNode.insertAfter(newParagraph);
              newParagraph.select();
            }
            break;
          case "insertOrderedList":
            // Create list manually to avoid offset issues
            if (parentNode) {
              const listNode = $createListNode("number");
              const listItemNode = $createListItemNode();

              // Only append anchorNode if it has content
              if (anchorNode.getTextContent().trim()) {
                listItemNode.append(anchorNode);
              } else {
                // Create a new text node with a space to avoid offset issues
                const textNode = $createTextNode(" ");
                listItemNode.append(textNode);
              }

              listNode.append(listItemNode);
              parentNode.replace(listNode);

              // Add a new paragraph after the list
              const paragraph = $createParagraphNode();
              listNode.insertAfter(paragraph);
              paragraph.select();
            }
            break;
          case "insertDivider":
            if (parentNode) {
              const divider = $createDividerNode();
              parentNode.insertAfter(divider);
              const newParagraph = $createParagraphNode();
              divider.insertAfter(newParagraph);
              newParagraph.select();
            }
            break;
          case "insertButton":
            if (parentNode) {
              const button = $createButtonNode("Button");
              parentNode.insertAfter(button);
              const newParagraph = $createParagraphNode();
              button.insertAfter(newParagraph);
              newParagraph.select();
            }
            break;
          case "image": {
            const input = document.getElementById(
              "lexical-image-upload-input",
            ) as HTMLInputElement;
            if (input) {
              input.click();
            }
            break;
          }
          case "gif": {
            const input = document.getElementById(
              "lexical-gif-upload-input",
            ) as HTMLInputElement;
            if (input) {
              input.click();
            }
            break;
          }
        }
      });

      setShowPalette(false);
      triggerRef.current = null;
    },
    [editor],
  );

  const handleClose = useCallback(() => {
    setShowPalette(false);
    triggerRef.current = null;
  }, []);

  if (!showPalette) return null;

  return createPortal(
    <CommandPalette
      isOpen={showPalette}
      onClose={handleClose}
      onSlashCommand={handleCommand}
      onQuickSnippet={() => {}} // Not used in slash mode
      mode="slash"
    />,
    document.body,
  );
}
