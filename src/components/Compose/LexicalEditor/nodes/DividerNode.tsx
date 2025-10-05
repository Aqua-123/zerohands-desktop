import React from "react";
import {
  DecoratorNode,
  NodeKey,
  DOMExportOutput,
  SerializedLexicalNode,
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  COMMAND_PRIORITY_LOW,
  KEY_DELETE_COMMAND,
  KEY_BACKSPACE_COMMAND,
  LexicalNode,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import { JSX, useEffect } from "react";

export type SerializedDividerNode = SerializedLexicalNode;

export class DividerNode extends DecoratorNode<JSX.Element> {
  static getType(): string {
    return "divider";
  }

  static clone(node: DividerNode): DividerNode {
    return new DividerNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(): HTMLElement {
    const div = document.createElement("div");
    div.className = "py-2";
    return div;
  }

  updateDOM(): false {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const hr = document.createElement("hr");
    hr.style.cssText = "border:none;border-top:1px solid #ccc;margin:1em 0;";
    return { element: hr };
  }

  static importJSON(): DividerNode {
    return $createDividerNode();
  }

  exportJSON(): SerializedDividerNode {
    return {
      type: "divider",
      version: 1,
    };
  }

  decorate(): JSX.Element {
    return <DividerComponent nodeKey={this.__key} />;
  }
}

function DividerComponent({ nodeKey }: { nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext();
  const [isSelected] = useLexicalNodeSelection(nodeKey);

  // Handle deletion
  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        (event) => {
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
  }, [editor, isSelected, nodeKey]);

  return (
    <div
      className={`py-2 ${isSelected ? "bg-blue-50" : ""}`}
      onClick={() => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isNodeSelection(selection)) {
            selection.add(nodeKey);
          }
        });
      }}
    >
      <hr className="border-gray-300" />
    </div>
  );
}

export function $createDividerNode(): DividerNode {
  return new DividerNode();
}

export function $isDividerNode(node: LexicalNode): node is DividerNode {
  return node instanceof DividerNode;
}
