import React from "react";
import { Paperclip } from "lucide-react";
import { cn } from "@/utils/tailwind";

interface AttachmentIndicatorProps {
  hasAttachments?: boolean;
  attachmentCount?: number;
  variant?: "inline" | "badge";
  size?: "sm" | "md";
  className?: string;
}

export default function AttachmentIndicator({
  hasAttachments = false,
  attachmentCount,
  variant = "inline",
  size = "sm",
  className,
}: AttachmentIndicatorProps) {
  if (!hasAttachments) return null;

  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  if (variant === "badge") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-gray-600",
          textSize,
          className,
        )}
      >
        <Paperclip className={iconSize} />
        {attachmentCount && attachmentCount > 1 && (
          <span className="font-medium">{attachmentCount}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("inline-flex items-center gap-1 text-gray-500", className)}
    >
      <Paperclip className={iconSize} />
      {attachmentCount && attachmentCount > 1 && (
        <span className={cn("font-medium", textSize)}>{attachmentCount}</span>
      )}
    </div>
  );
}
