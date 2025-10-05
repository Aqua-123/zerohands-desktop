import React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $getNodeByKey,
  $createParagraphNode,
  $getRoot,
  LexicalNode,
} from "lexical";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { $createImageNode } from "../nodes/ImageNode";
import { $createGifNode } from "../nodes/GifNode";
import GiphySelector from "@/components/Compose/GiphySelector";
interface Props {
  onFilesDropped?: (files: File[]) => void;
}

export default function UploadPlugin({ onFilesDropped }: Props) {
  const [editor] = useLexicalComposerContext();
  const [isDragOver, setIsDragOver] = useState(false);
  const [showGiphySelector, setShowGiphySelector] = useState(false);
  const [giphyInsertNodeKey, setGiphyInsertNodeKey] = useState<string | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Function to get image dimensions
  const getImageDimensions = (
    src: string,
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        resolve({ width: 400, height: 300 }); // Fallback dimensions
      };
      img.src = src;
    });
  };

  // Handle custom events for opening GIF selector
  // const handleOpenGifSelector = (nodeKey: string | null) => {
  //   setGiphyInsertNodeKey(nodeKey);
  //   setShowGiphySelector(true);
  // };

  // Create and manage file input
  useEffect(() => {
    // Create hidden file input
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.id = "lexical-image-upload-input";
    input.style.display = "none";
    document.body.appendChild(input);
    fileInputRef.current = input;

    const handleFileChange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      if (!files || files.length === 0) return;

      for (const file of Array.from(files)) {
        await uploadImage(file);
      }

      target.value = ""; // Reset input
    };

    input.addEventListener("change", handleFileChange);

    return () => {
      if (fileInputRef.current) {
        fileInputRef.current.removeEventListener("change", handleFileChange);
        document.body.removeChild(fileInputRef.current);
      }
    };
  }, []);

  const uploadImage = async (file: File) => {
    // Create a unique ID for this upload
    const uploadId = `upload-${Date.now()}-${Math.random()}`;

    try {
      // Insert a placeholder image immediately
      editor.update(() => {
        const placeholderNode = $createImageNode({
          src: "", // Empty src for placeholder
          alt: `Uploading ${file.name}...`,
          width: 400,
          height: 300,
          isUploading: true,
        });

        // Add upload ID to the node for later identification
        (placeholderNode as unknown as { __uploadId: string }).__uploadId =
          uploadId;

        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();
          const parentNode = anchorNode.getParent();

          // Check if parentNode is a root node or if we're at the root level
          if (parentNode && parentNode.getParent()) {
            // We're not at root level, insert after current block
            console.log("Inserting placeholder after current block");
            parentNode.insertAfter(placeholderNode);

            // Add a new paragraph after the image
            const paragraph = $createParagraphNode();
            placeholderNode.insertAfter(paragraph);
            paragraph.select();
          } else {
            // We're at root level, insert at selection
            console.log("Inserting placeholder at selection (root level)");
            selection.insertNodes([placeholderNode]);

            // Add a new paragraph after the image
            const paragraph = $createParagraphNode();
            placeholderNode.insertAfter(paragraph);
            paragraph.select();
          }
        } else {
          // Fallback: insert at root if no selection
          console.log("No selection, inserting placeholder at root");
          const root = $getRoot();
          root.append(placeholderNode);
          const paragraph = $createParagraphNode();
          placeholderNode.insertAfter(paragraph);
          paragraph.select();
        }

        console.log(
          "Placeholder image inserted:",
          placeholderNode.getKey(),
          uploadId,
        );
      });

      // Add to uploading set
      // setUploadingImages((prev) => new Set(prev).add(uploadId));

      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/upload-embedded-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload failed:", errorText);
        throw new Error("Failed to upload image");
      }

      const result = await response.json();
      console.log("Upload result:", result);

      if (!result.imageUrl) {
        throw new Error("No image URL returned from upload");
      }

      // Get image dimensions
      const dimensions = await getImageDimensions(result.imageUrl);
      console.log("Image dimensions:", dimensions);

      // Ensure editor is ready
      if (!editor.isEditable()) {
        console.error("Editor is not editable");
        return;
      }

      // Replace the placeholder with the real image
      editor.update(() => {
        // Find the placeholder node by upload ID
        let placeholderNode: LexicalNode | null = null;
        const root = $getRoot();

        // Search for the placeholder node
        const findPlaceholder = (node: LexicalNode) => {
          if (
            (node as unknown as { __uploadId: string }).__uploadId === uploadId
          ) {
            placeholderNode = node;
            return;
          }
          // Check if node has children (ElementNode, RootNode, etc.)
          if (
            "getChildrenSize" in node &&
            typeof node.getChildrenSize === "function"
          ) {
            const children = (
              node as unknown as { getChildren: () => LexicalNode[] }
            ).getChildren();
            for (const child of children) {
              findPlaceholder(child);
            }
          }
        };

        findPlaceholder(root);

        if (placeholderNode) {
          // Replace the placeholder with the real image
          const image = $createImageNode({
            src: result.imageUrl,
            alt: file.name,
            width: dimensions.width || 400,
            height: dimensions.height || 300,
            isUploading: false,
          });

          (
            placeholderNode as unknown as {
              replace: (node: LexicalNode) => void;
            }
          ).replace(image);
          console.log("Placeholder replaced with real image:", image.getKey());
        } else {
          // Fallback: insert new image if placeholder not found
          const image = $createImageNode({
            src: result.imageUrl,
            alt: file.name,
            width: dimensions.width || 400,
            height: dimensions.height || 300,
            isUploading: false,
          });

          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode();
            const parentNode = anchorNode.getParent();

            console.log("Anchor node type:", anchorNode.getType());
            console.log("Parent node type:", parentNode?.getType());
            console.log(
              "Parent has parent:",
              parentNode?.getParent() ? "yes" : "no",
            );

            // Check if parentNode is a root node or if we're at the root level
            if (parentNode && parentNode.getParent()) {
              // We're not at root level, insert after current block
              console.log("Inserting after current block");
              parentNode.insertAfter(image);

              // Add a new paragraph after the image
              const paragraph = $createParagraphNode();
              image.insertAfter(paragraph);
              paragraph.select();
            } else {
              // We're at root level, insert at selection
              console.log("Inserting at selection (root level)");
              selection.insertNodes([image]);

              // Add a new paragraph after the image
              const paragraph = $createParagraphNode();
              image.insertAfter(paragraph);
              paragraph.select();
            }
          } else {
            // Fallback: insert at root if no selection
            console.log("No selection, inserting at root");
            const root = $getRoot();
            root.append(image);
            const paragraph = $createParagraphNode();
            image.insertAfter(paragraph);
            paragraph.select();
          }

          console.log("Image inserted:", image.getKey(), result.imageUrl);
        }
      });

      // Force editor update to ensure changes are visible
      editor.update(() => {
        // This empty update ensures the editor re-renders
      });

      // Focus the editor after image insertion
      editor.focus();

      console.log("Editor updated and focused after image insertion");

      // Log the final editor state
      setTimeout(() => {
        console.log(
          "Final editor state after image insertion:",
          editor.getEditorState(),
        );
      }, 100);

      // Remove from uploading set
      // setUploadingImages((prev) => {
      //   const newSet = new Set(prev);
      //   newSet.delete(uploadId);
      //   return newSet;
      // });

      console.log("Final editor update completed");
    } catch (error) {
      console.error("Error uploading image:", error);

      // Remove the placeholder if upload failed
      // setUploadingImages((prev) => {
      //   const newSet = new Set(prev);
      //   newSet.delete(uploadId);
      //   return newSet;
      // });

      // Remove the placeholder node from the editor
      editor.update(() => {
        let placeholderNode: LexicalNode | null = null;
        const root = $getRoot();

        const findPlaceholder = (node: LexicalNode) => {
          if (
            (node as unknown as { __uploadId: string }).__uploadId === uploadId
          ) {
            placeholderNode = node;
            return;
          }
          // Check if node has children (ElementNode, RootNode, etc.)
          if (
            "getChildrenSize" in node &&
            typeof node.getChildrenSize === "function"
          ) {
            const children = (
              node as unknown as { getChildren: () => LexicalNode[] }
            ).getChildren();
            for (const child of children) {
              findPlaceholder(child);
            }
          }
        };

        findPlaceholder(root);

        if (placeholderNode) {
          (placeholderNode as unknown as { remove: () => void }).remove();
          console.log("Placeholder removed due to upload failure");
        }
      });

      alert("Failed to upload image. Please try again.");
    }
  };

  // Handle GIF selection
  const handleGifSelect = (gifUrl: string) => {
    editor.update(() => {
      const gif = $createGifNode({
        src: gifUrl,
        alt: "GIF",
        width: 300,
        height: 200,
      });

      if (giphyInsertNodeKey) {
        const node = $getNodeByKey(giphyInsertNodeKey);
        if (node) {
          node.insertAfter(gif);
          const paragraph = $createParagraphNode();
          gif.insertAfter(paragraph);
          paragraph.select();
        }
      } else {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();
          const parentNode = anchorNode.getParent();

          if (parentNode) {
            parentNode.insertAfter(gif);
            const paragraph = $createParagraphNode();
            gif.insertAfter(paragraph);
            paragraph.select();
          } else {
            selection.insertNodes([gif]);
          }
        }
      }
    });

    setShowGiphySelector(false);
    setGiphyInsertNodeKey(null);
  };

  // Setup drag and drop handlers
  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;

      const hasFiles = e.dataTransfer?.types.includes("Files");
      if (hasFiles) {
        setIsDragOver(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;

      if (dragCounter === 0) {
        setIsDragOver(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length === 0) return;

      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      const otherFiles = files.filter(
        (file) => !file.type.startsWith("image/"),
      );

      // Upload images
      for (const file of imageFiles) {
        await uploadImage(file);
      }

      // Pass other files to parent
      if (otherFiles.length > 0 && onFilesDropped) {
        onFilesDropped(otherFiles);
      }
    };

    // Add event listeners to the editor element
    editorElement.addEventListener("dragenter", handleDragEnter);
    editorElement.addEventListener("dragover", handleDragOver);
    editorElement.addEventListener("dragleave", handleDragLeave);
    editorElement.addEventListener("drop", handleDrop);

    // Also add to document to catch drags outside editor
    const handleDocumentDragOver = (e: DragEvent) => {
      if (isDragOver) {
        e.preventDefault();
      }
    };

    document.addEventListener("dragover", handleDocumentDragOver);

    return () => {
      editorElement.removeEventListener("dragenter", handleDragEnter);
      editorElement.removeEventListener("dragover", handleDragOver);
      editorElement.removeEventListener("dragleave", handleDragLeave);
      editorElement.removeEventListener("drop", handleDrop);
      document.removeEventListener("dragover", handleDocumentDragOver);
    };
  }, [editor, onFilesDropped, isDragOver]);

  return (
    <>
      {/* Drag overlay */}
      {isDragOver && (
        <div className="pointer-events-none fixed inset-0 z-50">
          <div className="bg-opacity-10 absolute inset-0 bg-blue-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="pointer-events-none rounded-lg bg-white p-8 shadow-lg">
              <div className="text-center">
                <svg
                  className="mx-auto mb-4 h-16 w-16 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <div className="mb-2 text-lg font-medium text-blue-600">
                  Drop files here
                </div>
                <div className="text-sm text-blue-500">
                  Images will be embedded • Other files will be attached
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GIF Selector Modal */}
      {showGiphySelector &&
        createPortal(
          <GiphySelector
            isOpen={showGiphySelector}
            onClose={() => {
              setShowGiphySelector(false);
              setGiphyInsertNodeKey(null);
            }}
            onSelect={handleGifSelect}
          />,
          document.body,
        )}
    </>
  );
}
