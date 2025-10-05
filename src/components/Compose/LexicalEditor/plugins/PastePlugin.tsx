import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  PASTE_COMMAND,
  COMMAND_PRIORITY_HIGH,
  $createTextNode,
  LexicalNode,
} from "lexical";
import { $createHeadingNode } from "@lexical/rich-text";
import { $createListNode, $createListItemNode } from "@lexical/list";
import { useEffect } from "react";
import { $createImageNode } from "../nodes/ImageNode";
import { $createDividerNode } from "../nodes/DividerNode";
import { parseHtmlToBlocks } from "../utils/parser";

export default function PastePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        if (!event.clipboardData) return false;

        // Check for files (images)
        const files = Array.from(event.clipboardData.files);
        if (files.length > 0) {
          const imageFiles = files.filter((file) =>
            file.type.startsWith("image/"),
          );

          if (imageFiles.length > 0) {
            event.preventDefault();

            // Upload and insert images
            imageFiles.forEach(async (file) => {
              try {
                const formData = new FormData();
                formData.append("image", file);

                const response = await fetch("/api/upload-embedded-image", {
                  method: "POST",
                  body: formData,
                });

                if (response.ok) {
                  const result = await response.json();

                  editor.update(() => {
                    const image = $createImageNode({
                      src: result.imageUrl,
                      alt: "Pasted image",
                      width: result.width,
                      height: result.height,
                    });

                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      selection.insertNodes([image]);
                    }
                  });
                }
              } catch (error) {
                console.error("Error uploading pasted image:", error);
              }
            });

            return true;
          }
        }

        // Check for HTML content
        const htmlData = event.clipboardData.getData("text/html");
        if (htmlData) {
          event.preventDefault();

          // Parse HTML to blocks
          const blocks = parseHtmlToBlocks(htmlData);

          editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;

            const nodes = blocks
              .map((block) => {
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
                    if (block.content)
                      oli.append(createTextNode(block.content));
                    ol.append(oli);
                    return ol;
                  }

                  case "image":
                    if (block.metadata?.src) {
                      return $createImageNode({
                        src: block.metadata.src,
                        alt: block.metadata.alt || "",
                        width: block.metadata.width,
                        height: block.metadata.height,
                      });
                    }
                    return null;

                  case "divider":
                    return $createDividerNode();

                  case "text":
                  default: {
                    const p = $createParagraphNode();
                    if (block.content) p.append(createTextNode(block.content));
                    return p;
                  }
                }
              })
              .filter(Boolean);

            if (nodes.length > 0) {
              // Replace selection with pasted content
              selection.insertNodes(nodes as LexicalNode[]);
            }
          });

          return true;
        }

        // Check for plain text
        const textData = event.clipboardData.getData("text/plain");
        if (textData) {
          // Let Lexical handle plain text by default
          return false;
        }

        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}
