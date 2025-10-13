import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./style.css";
import { AVAILABLE_LABELS, AvailableLabel } from "./types";

interface OnboardingData {
  fullName: string;
  signature: string;
  tone: string;
  pronouns: string;
  vipContacts: string[];
  vipDomains: string[];
  smartGroupName: string;
  smartGroupEmails: string[];
  companyName: string;
  companySize: string;
  positionType: string;
  importantLabels: string[];
  securityLabels: string[];
  spamLabels: string[];
}

interface Step6Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onContinue: () => void;
  onBack?: () => void;
}

export default function Step6ImportantLabels({
  data,
  updateData,
  onContinue,
  onBack,
}: Step6Props) {
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(
    new Set(
      data.importantLabels?.length > 0
        ? data.importantLabels
        : ["important", "meeting", "invoice"],
    ),
  );

  const handleLabelToggle = (label: AvailableLabel) => {
    const newSelected = new Set(selectedLabels);
    if (newSelected.has(label)) {
      newSelected.delete(label);
    } else {
      newSelected.add(label);
    }
    setSelectedLabels(newSelected);
  };

  const handleContinue = () => {
    updateData({ importantLabels: Array.from(selectedLabels) });
    onContinue();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleContinue();
    } else if (e.key === "Escape" && onBack) {
      e.preventDefault();
      onBack();
    }
  };

  // Auto-save when selectedLabels change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateData({ importantLabels: Array.from(selectedLabels) });
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timer);
  }, [selectedLabels, updateData]);

  const labelDescriptions: Record<AvailableLabel, string> = {
    marketing: "Promotional content, sales, newsletters",
    credentials: "Password resets, 2FA codes, login alerts",
    social: "Social media notifications, friend requests",
    news: "Press releases, industry updates, announcements",
    meeting: "Calendar invites, meeting requests",
    pitch: "Business proposals, partnership offers",
    github: "GitHub notifications, PRs, commits",
    invoice: "Bills, payments, receipts",
    important: "High-priority emails (default catch-all)",
  };

  return (
    <motion.div
      className="space-y-8"
      onKeyDown={handleKeyDown}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Back Button */}
      {onBack && (
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <button onClick={onBack} className="back-button" tabIndex={1}>
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
        </motion.div>
      )}

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="heading-title mb-4">Important Category</h2>
        <p className="mb-8 text-sm text-gray-600">
          Select which types of emails should appear in your Important category.
          These will be prioritized in your inbox.
        </p>
      </motion.div>

      {/* Label Selection */}
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {AVAILABLE_LABELS.map((label, index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
            className="label-option"
          >
            <label className="flex cursor-pointer items-center space-x-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selectedLabels.has(label)}
                onChange={() => handleLabelToggle(label)}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                tabIndex={index + 2}
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 capitalize">
                  {label}
                </div>
                <div className="text-sm text-gray-500">
                  {labelDescriptions[label]}
                </div>
              </div>
            </label>
          </motion.div>
        ))}
      </motion.div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <motion.button
          onClick={handleContinue}
          className="continue-button"
          tabIndex={AVAILABLE_LABELS.length + 2}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          Continue
        </motion.button>
        <p className="mt-2 text-center text-sm text-gray-500">
          {selectedLabels.size} label{selectedLabels.size !== 1 ? "s" : ""}{" "}
          selected
        </p>
      </motion.div>

      {/* Keyboard shortcuts hint */}
      <motion.div
        className="keyboard-hints"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      >
        Press <kbd>Enter</kbd> to continue
        {onBack && (
          <>
            {" · "}
            <kbd>Esc</kbd> to go back
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
