import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";

interface SendingToastProps {
  onClose?: () => void;
  countdown?: number;
  title?: string;
  description?: string;
}

export function SendingToast({
  onClose,
  countdown = 5,
  title,
  description,
}: SendingToastProps) {
  const [showImage, setShowImage] = useState(true);
  return (
    <motion.div
      className="pointer-events-auto mr-2 flex max-w-md min-w-[400px] items-center gap-4 rounded-full border border-gray-100 bg-white p-4 shadow-2xl"
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.3,
      }}
    >
      <div className="flex-shrink-0">
        <div className="h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-pink-400">
          {showImage ? (
            <img
              src="/toast.avif"
              alt="Sending"
              className="h-full w-full object-cover"
              onError={() => setShowImage(false)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-400/80 via-purple-300/60 to-pink-300/80">
              <div className="h-8 w-8 rounded-full bg-white/20 blur-sm" />
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="text-base font-medium text-gray-900"
          style={{
            color: "#373B4D",

            fontFamily: "Open Sans",
          }}
        >
          {title ?? "Sending..."}
        </div>
        {description ? (
          <div className="mt-1 text-sm text-blue-500">{description}</div>
        ) : countdown != null ? (
          <div className="mt-1 text-sm text-blue-500">
            Your message will be sent in {countdown} seconds
          </div>
        ) : null}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 w-8 flex-shrink-0 cursor-pointer p-0 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}

export type { SendingToastProps };
