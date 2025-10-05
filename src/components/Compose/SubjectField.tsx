"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";

interface SubjectFieldProps {
  value: string;
  onChange: (value: string) => void;
  emailBody?: string;
}

export default function SubjectField({
  value,
  onChange,
  emailBody,
}: SubjectFieldProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAIGenerated, setIsAIGenerated] = useState(false);

  const generateSubject = async () => {
    if (!emailBody || emailBody.trim().length < 20 || isGenerating) return;

    console.log("Generating subject", emailBody);
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-subject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: emailBody }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate subject");
      }

      const data = await response.json();
      if (data.subject) {
        onChange(data.subject);
        setIsAIGenerated(true); // Mark as AI-generated
      }
    } catch (error) {
      console.error("Subject generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate subject when field is empty OR when it's AI-generated and body changes
  // useEffect(() => {
  //   if ((!value.trim() || isAIGenerated) && emailBody && emailBody.trim().length >= 20) {
  //     const timer = setTimeout(() => {
  //       generateSubject();
  //     }, 1500); // Debounce for auto-generation

  //     return () => clearTimeout(timer);
  //   }
  // }, [emailBody, value, isAIGenerated]);

  const improveSubject = async () => {
    if (
      !value.trim() ||
      !emailBody ||
      emailBody.trim().length < 20 ||
      isImproving
    )
      return;

    setIsImproving(true);
    try {
      const response = await fetch("/api/improve-subject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentSubject: value,
          body: emailBody,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to improve subject");
      }

      const data = await response.json();
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Subject improvement error:", error);
    } finally {
      setIsImproving(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
    setIsAIGenerated(true); // Mark improved suggestions as AI-generated too
  };

  const hasSubject = value.trim().length > 0;
  const canGenerate = emailBody && emailBody.trim().length >= 20;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsAIGenerated(false); // Mark as user-typed when manually edited
          }}
          className="flex-1 border-0 border-b border-gray-200 pb-2 text-lg placeholder-gray-400 outline-none focus:border-blue-500"
          placeholder="Subject"
        />

        {canGenerate && (
          <div className="flex gap-2">
            {!hasSubject || isAIGenerated ? (
              <Button
                onClick={generateSubject}
                disabled={isGenerating}
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              >
                <Sparkles className="mr-1 h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate"}
              </Button>
            ) : (
              <Button
                onClick={improveSubject}
                disabled={isImproving}
                variant="ghost"
                size="sm"
                className="text-purple-600 hover:bg-purple-50 hover:text-purple-700"
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                {isImproving ? "Improving..." : "Improve"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Suggestion Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mt-3 space-y-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <div className="px-2 py-1 text-xs font-medium text-gray-500">
            Choose an improved subject:
          </div>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => selectSuggestion(suggestion)}
              className="w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100"
            >
              {suggestion}
            </button>
          ))}
          <button
            onClick={() => setShowSuggestions(false)}
            className="w-full rounded px-3 py-1 text-left text-xs text-gray-500 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
