import React from "react";
import {
  NodeKey,
  DecoratorNode,
  DOMExportOutput,
  LexicalNode,
  SerializedLexicalNode,
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  $createNodeSelection,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  KEY_DELETE_COMMAND,
  KEY_BACKSPACE_COMMAND,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { useState, useRef, useEffect, useCallback, JSX } from "react";

export interface ImagePayload {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  key?: NodeKey;
  isUploading?: boolean;
}

export type SerializedImageNode = SerializedLexicalNode & {
  src: string;
  alt: string;
  width: number;
  height: number;
  isUploading: boolean;
};

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __alt: string;
  __width: number;
  __height: number;
  __isUploading: boolean;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__alt,
      node.__width,
      node.__height,
      node.__key,
      node.__isUploading,
    );
  }

  constructor(
    src: string,
    alt = "",
    width = 400,
    height = 300,
    key?: NodeKey,
    isUploading = false,
  ) {
    super(key);
    this.__src = src;
    this.__alt = alt;
    this.__width = width;
    this.__height = height;
    this.__isUploading = isUploading;
  }

  createDOM(): HTMLElement {
    const div = document.createElement("div");
    div.className = "relative inline-block my-2";
    return div;
  }

  updateDOM(prevNode: ImageNode): boolean {
    // Only update if the src, alt, width, or height has changed
    return (
      prevNode.__src !== this.__src ||
      prevNode.__alt !== this.__alt ||
      prevNode.__width !== this.__width ||
      prevNode.__height !== this.__height ||
      prevNode.__isUploading !== this.__isUploading
    );
  }

  setSize(width: number, height: number): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  setUploadingState(isUploading: boolean): void {
    const writable = this.getWritable();
    writable.__isUploading = isUploading;
  }

  isUploading(): boolean {
    return this.__isUploading;
  }

  getUploadId(): string | undefined {
    return (this as unknown as { __uploadId?: string }).__uploadId;
  }

  exportDOM(): DOMExportOutput {
    const img = document.createElement("img");
    img.src = this.__src;
    img.alt = this.__alt;
    img.width = this.__width;
    img.height = this.__height;
    img.style.cssText =
      "max-width:100%;height:auto;display:block;margin:1em 0;";
    return { element: img };
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { src, alt, width, height, isUploading } = serializedNode;
    return $createImageNode({ src, alt, width, height, isUploading });
  }

  exportJSON(): SerializedImageNode {
    return {
      src: this.__src,
      alt: this.__alt,
      width: this.__width,
      height: this.__height,
      isUploading: this.__isUploading,
      type: "image",
      version: 1,
    };
  }

  decorate(): JSX.Element {
    return (
      <ImageComponent
        src={this.__src}
        alt={this.__alt}
        width={this.__width}
        height={this.__height}
        nodeKey={this.__key}
      />
    );
  }
}

function ImageComponent({
  src,
  alt,
  width,
  height,
  nodeKey,
  isUploading,
}: ImagePayload & { nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setIsSelected] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(width || 400);
  const [currentHeight, setCurrentHeight] = useState(height || 300);

  // Debug selection state (only in development)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(
        "Image component - isSelected:",
        isSelected,
        "nodeKey:",
        nodeKey,
      );
    }
  }, [isSelected, nodeKey]);

  // Listen for selection changes
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      // Don't update selection state if image is uploading
      if (isUploading) return;

      const selection = editorState._selection;
      if ($isNodeSelection(selection)) {
        const isCurrentlySelected = selection.has(nodeKey);
        if (isCurrentlySelected !== isSelected) {
          setIsSelected(isCurrentlySelected);
        }
      } else {
        // Only deselect if we were previously selected
        if (isSelected) {
          setIsSelected(false);
        }
      }
    });
  }, [editor, nodeKey, isSelected, isUploading]);

  // Handle clicking outside to deselect
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Don't handle deselection if image is uploading
      if (isUploading) return;

      if (imageRef.current && !imageRef.current.contains(e.target as Node)) {
        if (isSelected) {
          setIsSelected(false);
          // Clear the selection in the editor
          editor.update(() => {
            $setSelection(null);
          });
        }
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [isSelected, editor, isUploading]);

  // Also handle escape key to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle escape key if image is uploading
      if (isUploading) return;

      if (e.key === "Escape" && isSelected) {
        setIsSelected(false);
        editor.update(() => {
          $setSelection(null);
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSelected, editor, isUploading]);

  // Debug: log when resize handles should be visible
  useEffect(() => {
    console.log("Resize handles visibility - isSelected:", isSelected);
  }, [isSelected]);
  const [resizeData, setResizeData] = useState<{
    handle: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  // Handle deletion
  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        (event) => {
          // Don't allow deletion if image is uploading
          if (isUploading) return false;

          if (isSelected && $isNodeSelection($getSelection())) {
            event.preventDefault();
            const node = $getNodeByKey(nodeKey);
            if (node) {
              node.remove();
              return true;
            }
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        (event) => {
          // Don't allow deletion if image is uploading
          if (isUploading) return false;

          if (isSelected && $isNodeSelection($getSelection())) {
            event.preventDefault();
            const node = $getNodeByKey(nodeKey);
            if (node) {
              node.remove();
              return true;
            }
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, isSelected, nodeKey, isUploading]);

  const handleResize = useCallback(
    (e: React.MouseEvent, handle: string) => {
      // Don't allow resizing if image is uploading
      if (isUploading) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      setResizeData({
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: currentWidth,
        startHeight: currentHeight,
      });
    },
    [currentWidth, currentHeight, isUploading],
  );

  useEffect(() => {
    if (!resizeData || isUploading) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeData || isUploading) return;

      const deltaX = e.clientX - resizeData.startX;
      const deltaY = e.clientY - resizeData.startY;

      let newWidth = resizeData.startWidth;
      let newHeight = resizeData.startHeight;

      switch (resizeData.handle) {
        case "se":
          newWidth = Math.max(50, resizeData.startWidth + deltaX);
          newHeight = Math.max(50, resizeData.startHeight + deltaY);
          break;
        case "sw":
          newWidth = Math.max(50, resizeData.startWidth - deltaX);
          newHeight = Math.max(50, resizeData.startHeight + deltaY);
          break;
        case "ne":
          newWidth = Math.max(50, resizeData.startWidth + deltaX);
          newHeight = Math.max(50, resizeData.startHeight - deltaY);
          break;
        case "nw":
          newWidth = Math.max(50, resizeData.startWidth - deltaX);
          newHeight = Math.max(50, resizeData.startHeight - deltaY);
          break;
        case "e":
          newWidth = Math.max(50, resizeData.startWidth + deltaX);
          break;
        case "w":
          newWidth = Math.max(50, resizeData.startWidth - deltaX);
          break;
        case "n":
          newHeight = Math.max(50, resizeData.startHeight - deltaY);
          break;
        case "s":
          newHeight = Math.max(50, resizeData.startHeight + deltaY);
          break;
      }

      setCurrentWidth(newWidth);
      setCurrentHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (resizeData && !isUploading) {
        // Update the node in Lexical
        editor.update(() => {
          const node = $getNodeByKey(nodeKey) as ImageNode;
          if (node) {
            node.setSize(currentWidth, currentHeight);
          }
        });
      }
      setResizeData(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizeData, currentWidth, currentHeight, nodeKey, editor, isUploading]);

  return (
    <div
      key={`image-${nodeKey}`}
      ref={imageRef}
      className={`relative my-2 inline-block ${isSelected && !isUploading ? "ring-2 ring-blue-500" : ""}`}
      onClick={(e) => {
        // Prevent selection if image is uploading
        if (isUploading) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        e.stopPropagation(); // Prevent document click from firing
        console.log("Image clicked, nodeKey:", nodeKey);

        if (isSelected) {
          // If already selected, deselect
          setIsSelected(false);
          editor.update(() => {
            $setSelection(null);
          });
        } else {
          // Select the image
          editor.update(() => {
            const selection = $getSelection();
            console.log("Current selection:", selection);

            // Always create a new node selection for the image
            const nodeSelection = $createNodeSelection();
            nodeSelection.add(nodeKey);
            $setSelection(nodeSelection);
            console.log("Created new node selection for image");

            // Update our local selection state
            setIsSelected(true);
          });

          // Force editor update to ensure selection is visible
          editor.update(() => {
            // This empty update ensures the editor re-renders
          });

          // Focus the editor to ensure selection is active
          editor.focus();

          console.log("Image selection completed");
        }
      }}
    >
      {isUploading ? (
        // Uploading placeholder - non-selectable
        <div
          className="flex cursor-not-allowed items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-100"
          style={{ width: currentWidth, height: currentHeight }}
        >
          <div className="text-center">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
            <div className="text-sm font-medium text-gray-600">
              Uploading...
            </div>
            <div className="mt-1 max-w-full truncate px-2 text-xs text-gray-500">
              {alt}
            </div>
            <div className="mt-2 text-xs text-gray-400">Please wait...</div>
          </div>
        </div>
      ) : (
        <img
          src={src}
          alt={alt || ""}
          width={currentWidth}
          height={currentHeight}
          className="block"
          onError={(e) => {
            console.error("Image failed to load:", src, e);
            // Don't remove the image node, just log the error
          }}
          onLoad={() => {
            // Image loaded successfully
            if (import.meta.env.DEV) {
              console.log("Image loaded successfully:", src);
            }
          }}
        />
      )}

      {isSelected && !isUploading && (
        <>
          {/* Debug info */}
          <div className="absolute -top-8 left-0 rounded bg-blue-500 px-2 py-1 text-xs text-white">
            Selected (click to deselect)
          </div>

          {/* 8 resize handles */}
          <div
            className="absolute -top-1 -left-1 z-10 h-3 w-3 cursor-nw-resize rounded-full bg-blue-500"
            onMouseDown={(e) => handleResize(e, "nw")}
          />
          <div
            className="absolute -top-1 -right-1 z-10 h-3 w-3 cursor-ne-resize rounded-full bg-blue-500"
            onMouseDown={(e) => handleResize(e, "ne")}
          />
          <div
            className="absolute -bottom-1 -left-1 z-10 h-3 w-3 cursor-sw-resize rounded-full bg-blue-500"
            onMouseDown={(e) => handleResize(e, "sw")}
          />
          <div
            className="absolute -right-1 -bottom-1 z-10 h-3 w-3 cursor-se-resize rounded-full bg-blue-500"
            onMouseDown={(e) => handleResize(e, "se")}
          />
          <div
            className="absolute -top-1 left-1/2 z-10 h-3 w-3 -translate-x-1/2 transform cursor-n-resize rounded-full bg-blue-500"
            onMouseDown={(e) => handleResize(e, "n")}
          />
          <div
            className="absolute -bottom-1 left-1/2 z-10 h-3 w-3 -translate-x-1/2 transform cursor-s-resize rounded-full bg-blue-500"
            onMouseDown={(e) => handleResize(e, "s")}
          />
          <div
            className="absolute top-1/2 -left-1 z-10 h-3 w-3 -translate-y-1/2 transform cursor-w-resize rounded-full bg-blue-500"
            onMouseDown={(e) => handleResize(e, "w")}
          />
          <div
            className="absolute top-1/2 -right-1 z-10 h-3 w-3 -translate-y-1/2 transform cursor-e-resize rounded-full bg-blue-500"
            onMouseDown={(e) => handleResize(e, "e")}
          />
        </>
      )}
    </div>
  );
}

export function $createImageNode(payload: ImagePayload): ImageNode {
  return new ImageNode(
    payload.src,
    payload.alt,
    payload.width,
    payload.height,
    undefined,
    payload.isUploading,
  );
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
