import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $createParagraphNode,
  $getNodeByKey,
  UNDO_COMMAND,
  CAN_UNDO_COMMAND,
  $createTextNode,
} from "lexical";
import { $createHeadingNode } from "@lexical/rich-text";
import { $createListNode, $createListItemNode } from "@lexical/list";
import { useEffect, useRef } from "react";
import { ContentEditorApi } from "../Editor";
import { $createImageNode, ImagePayload } from "../nodes/ImageNode";
import { ContentBlock } from "@/lib/llm-content-parser";
import { $createGifNode } from "../nodes/GifNode";
import { $createDividerNode } from "../nodes/DividerNode";
import { $createButtonNode } from "../nodes/ButtonNode";
import { parseHtmlToBlocks } from "../utils/parser";

interface Props {
  onEditorReady?: (api: ContentEditorApi) => void;
}

export default function ApiPlugin({ onEditorReady }: Props) {
  const [editor] = useLexicalComposerContext();
  const canUndoRef = useRef(false);

  useEffect(() => {
    // Track undo state
    const unregisterCanUndo = editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        canUndoRef.current = payload;
        return false;
      },
      1,
    );

    if (!onEditorReady) return unregisterCanUndo;

    const api: ContentEditorApi = {
      insertBlocks: (blocks, insertAfterBlockId) => {
        editor.update(() => {
          const nodes = blocks.map((block) => {
            const createTextNode = (text: string) => {
              return $createTextNode(text);
            };

            switch (block.type) {
              case "heading1": {
                const h1 = $createHeadingNode("h1");
                if (block.content) h1.append(createTextNode(block.content));
                return h1;
              }
              case "heading2": {
                const h2 = $createHeadingNode("h2");
                if (block.content) h2.append(createTextNode(block.content));
                return h2;
              }
              case "heading3": {
                const h3 = $createHeadingNode("h3");
                if (block.content) h3.append(createTextNode(block.content));
                return h3;
              }
              case "list": {
                const ul = $createListNode("bullet");
                const li = $createListItemNode();
                if (block.content) li.append(createTextNode(block.content));
                ul.append(li);
                return ul;
              }
              case "orderedlist": {
                const ol = $createListNode("number");
                const oli = $createListItemNode();
                if (block.content) oli.append(createTextNode(block.content));
                ol.append(oli);
                return ol;
              }
              case "image":
                return $createImageNode({
                  src: block.metadata?.src || "",
                  alt: block.metadata?.alt,
                  width: block.metadata?.width,
                  height: block.metadata?.height,
                });
              case "gif":
                return $createGifNode({
                  src: block.metadata?.src || "",
                  alt: block.metadata?.alt,
                  width: block.metadata?.width,
                  height: block.metadata?.height,
                });
              case "divider":
                return $createDividerNode();
              case "button":
                return $createButtonNode(block.content || "Button");
              case "text":
              default: {
                const p = $createParagraphNode();
                if (block.content) p.append(createTextNode(block.content));
                return p;
              }
            }
          });

          if (insertAfterBlockId) {
            const targetNode = $getNodeByKey(insertAfterBlockId);
            if (targetNode) {
              nodes.forEach((node) => {
                targetNode.insertAfter(node);
              });
            } else {
              const root = $getRoot();
              nodes.forEach((node) => root.append(node));
            }
          } else {
            const root = $getRoot();

            // Clear if only empty paragraph
            if (root.getChildrenSize() === 1) {
              const firstChild = root.getFirstChild();
              if (firstChild && firstChild.getTextContent() === "") {
                firstChild.remove();
              }
            }

            nodes.forEach((node) => root.append(node));
          }

          // Focus first inserted node
          if (nodes.length > 0) {
            (nodes[0] as unknown as { select: () => void }).select();
          }
        });
      },

      insertLLMContent: (html, insertAfterBlockId) => {
        const parsedBlocks = parseHtmlToBlocks(html);
        const blocks = parsedBlocks.map((block) => ({
          ...block,
          id: `block-${Date.now()}-${Math.random()}`,
        }));
        api.insertBlocks(blocks, insertAfterBlockId);
      },

      clearContent: () => {
        editor.update(() => {
          const root = $getRoot();
          root.clear();
          const paragraph = $createParagraphNode();
          root.append(paragraph);
        });
      },

      getBlocks: () => {
        const blocks: ContentBlock[] = [];
        editor.getEditorState().read(() => {
          const root = $getRoot();
          root.getChildren().forEach((child) => {
            const type = child.getType();
            let blockType: ContentBlock["type"] = "text";
            let metadata: ImagePayload | undefined = undefined;
            switch (type) {
              case "heading1": {
                blockType =
                  type === "heading1"
                    ? "heading1"
                    : type === "heading2"
                      ? "heading2"
                      : "heading3";
                break;
              }

              case "heading2": {
                blockType = "heading2";
                break;
              }
              case "heading3": {
                blockType = "heading3";
                break;
              }
              case "bullet":
              case "list": {
                blockType = type === "bullet" ? "list" : "orderedlist";
                break;
              }
              case "image":
              case "gif":
                blockType = type;
                metadata = {
                  src: (child as unknown as { __src: string }).__src,
                  alt: (child as unknown as { __alt: string }).__alt,
                  width: (child as unknown as { __width: number }).__width,
                  height: (child as unknown as { __height: number }).__height,
                };
                break;
              case "divider":
                blockType = "divider";
                break;
              case "button":
                blockType = "button";
                break;
              default:
                blockType = "text";
            }

            blocks.push({
              id: child.getKey(),
              type: blockType,
              content: child.getTextContent(),
              metadata,
            });
          });
        });
        return blocks;
      },

      focusBlock: (blockId, position = "end") => {
        editor.update(() => {
          const targetNode = $getNodeByKey(blockId);
          if (targetNode) {
            if (position === "start") {
              targetNode.selectStart();
            } else {
              targetNode.selectEnd();
            }
          }
        });
      },

      getLastTextBlockId: () => {
        let lastId: string | null = null;
        editor.getEditorState().read(() => {
          const root = $getRoot();
          const children = root.getChildren();
          for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            const type = child.getType();
            if (type === "paragraph" || type === "heading") {
              lastId = child.getKey();
              break;
            }
          }
        });
        return lastId;
      },

      undo: () => {
        editor.dispatchCommand(UNDO_COMMAND, undefined);
      },

      canUndo: () => {
        return canUndoRef.current;
      },
    };

    onEditorReady(api);

    return unregisterCanUndo;
  }, [editor, onEditorReady]);

  return null;
}
