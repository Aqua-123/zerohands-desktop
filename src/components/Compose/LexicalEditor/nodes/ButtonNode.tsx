import React from "react";
import {
  DecoratorNode,
  NodeKey,
  DOMExportOutput,
  SerializedLexicalNode,
  LexicalNode,
  $getNodeByKey,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { JSX, useState, useRef } from "react";

export type SerializedButtonNode = SerializedLexicalNode & {
  text: string;
};

export class ButtonNode extends DecoratorNode<JSX.Element> {
  __text: string;

  static getType(): string {
    return "button";
  }

  static clone(node: ButtonNode): ButtonNode {
    return new ButtonNode(node.__text, node.__key);
  }

  constructor(text: string = "Button", key?: NodeKey) {
    super(key);
    this.__text = text;
  }

  createDOM(): HTMLElement {
    const div = document.createElement("div");
    div.className = "inline-block my-2";
    return div;
  }

  updateDOM(): false {
    return false;
  }

  setText(text: string): void {
    const writable = this.getWritable();
    writable.__text = text;
  }

  exportDOM(): DOMExportOutput {
    const button = document.createElement("button");
    button.textContent = this.__text;
    button.style.cssText =
      "background:#3b82f6;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:14px;cursor:pointer;margin:4px;display:inline-block;";
    return { element: button };
  }

  static importJSON(serializedNode: SerializedButtonNode): ButtonNode {
    const { text } = serializedNode;
    return $createButtonNode(text);
  }

  exportJSON(): SerializedButtonNode {
    return {
      text: this.__text,
      type: "button",
      version: 1,
    };
  }

  decorate(): JSX.Element {
    return <ButtonComponent text={this.__text} nodeKey={this.__key} />;
  }
}

function ButtonComponent({
  text,
  nodeKey,
}: {
  text: string;
  nodeKey: NodeKey;
}) {
  const [editor] = useLexicalComposerContext();
  const [isEditing, setIsEditing] = useState(false);
  const [currentText, setCurrentText] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEdit = () => {
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const handleSave = () => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey) as ButtonNode;
      if (node) {
        node.setText(currentText);
      }
    });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setCurrentText(text);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={currentText}
        onChange={(e) => setCurrentText(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="rounded bg-blue-500 px-4 py-2 text-white outline-none"
        placeholder="Button text"
      />
    );
  }

  return (
    <button
      className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      onClick={handleEdit}
      contentEditable={false}
    >
      {currentText || "Button"}
    </button>
  );
}

export function $createButtonNode(text: string = "Button"): ButtonNode {
  return new ButtonNode(text);
}

export function $isButtonNode(
  node: LexicalNode | null | undefined,
): node is ButtonNode {
  return node instanceof ButtonNode;
}
