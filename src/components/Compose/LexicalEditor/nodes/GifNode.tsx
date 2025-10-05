import { ImageNode, ImagePayload } from "./ImageNode";
import { LexicalNode, NodeKey, SerializedLexicalNode } from "lexical";

export type SerializedGifNode = SerializedLexicalNode & {
  src: string;
  alt: string;
  width: number;
  height: number;
  isUploading: boolean;
};

export class GifNode extends ImageNode {
  static getType(): string {
    return "gif";
  }

  static clone(node: GifNode): GifNode {
    return new GifNode(
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
    alt = "GIF",
    width = 400,
    height = 300,
    key?: NodeKey,
    isUploading = false,
  ) {
    super(src, alt, width, height, key, isUploading);
  }

  static importJSON(serializedNode: SerializedGifNode): GifNode {
    const { src, alt, width, height, isUploading } = serializedNode;
    return $createGifNode({ src, alt, width, height, isUploading });
  }

  exportJSON(): SerializedGifNode {
    const base = super.exportJSON();
    return {
      src: base.src,
      alt: base.alt,
      width: base.width,
      height: base.height,
      isUploading: base.isUploading,
      type: "gif",
      version: base.version,
    };
  }
}

export function $createGifNode(payload: ImagePayload): GifNode {
  return new GifNode(
    payload.src,
    payload.alt,
    payload.width,
    payload.height,
    undefined,
    payload.isUploading,
  );
}

export function $isGifNode(node: LexicalNode): node is GifNode {
  return node instanceof GifNode;
}
