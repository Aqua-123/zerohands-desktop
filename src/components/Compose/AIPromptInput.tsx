import React, { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIPromptInputProps {
  onGenerate: (prompt: string) => Promise<string>;
  onInsert: (content: string) => void;
  onCancel: () => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
}

export default function AIPromptInput({
  onGenerate,
  onInsert,
  onCancel,
  isGenerating,
  setIsGenerating,
}: AIPromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      setIsGenerating(true);
      try {
        const content = await onGenerate(prompt.trim());
        onInsert(content);
        setPrompt("");
      } catch (error) {
        console.error("Error generating content:", error);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="relative rounded-lg bg-white"
      style={{
        background:
          "linear-gradient(135deg, #A2C7FF 0%, #B9B1F6 42%, #E7C9F2 100%)",
        padding: "2px",
      }}
    >
      <div
        className="relative rounded-lg bg-white"
        style={{
          borderRadius: "calc(0.5rem - 2px)",
        }}
      >
        {/* Flowing gradient overlay during generation */}
        {isGenerating && (
          <div className="absolute inset-0 z-10 overflow-hidden rounded-lg">
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
            <div
              className="absolute inset-0 opacity-60"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(162, 199, 255, 0.3), rgba(185, 177, 246, 0.3), rgba(231, 201, 242, 0.3), transparent)",
                animation: "flowingGradient 2s ease-in-out infinite",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-sm font-medium text-gray-600">
                AI is generating your response...
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="h-full">
          <div className="flex h-full gap-3 p-3">
            <div className="flex-1">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask AI to help with your reply... (Ctrl+Enter to send)"
                className="h-full min-h-[300px] w-full resize-none rounded-lg border border-none p-3 focus:border-transparent focus:ring-0 focus:outline-none"
                disabled={isGenerating}
              />
            </div>
            <div className="flex flex-col justify-end">
              <Button
                type="submit"
                variant="ghost"
                disabled={!prompt.trim() || isGenerating}
                className="px-4 py-2 text-[#3D8EFE]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes flowingGradient {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
