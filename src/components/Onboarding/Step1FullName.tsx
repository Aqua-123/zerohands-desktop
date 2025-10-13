import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./style.css";
import { OnboardingStepProps } from "@/types/onboarding";

export default function Step1FullName({
  data,
  updateData,
  onContinue,
  onBack,
}: OnboardingStepProps) {
  const [fullName, setFullName] = useState(data.fullName);

  const isValid = fullName.trim().length > 0;

  const handleContinue = () => {
    if (!isValid) return;
    updateData({ fullName });
    onContinue();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isValid) {
        handleContinue();
      }
    } else if (e.key === "Escape" && onBack) {
      e.preventDefault();
      onBack();
    }
  };

  // Auto-save when fullName changes (with debounce)
  useEffect(() => {
    if (fullName !== data.fullName) {
      const timer = setTimeout(() => {
        updateData({ fullName });
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timer);
    }
  }, [fullName, data.fullName, updateData]);

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
        <h2 className="heading-title mt-16 mb-8">Your full name</h2>
      </motion.div>

      {/* Form Fields */}
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div>
          <motion.input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jordan Quinn"
            className="onboarding-input"
            tabIndex={2}
            autoFocus
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            //  whileFocus={{ scale: 1.02 }}
          />
        </div>
      </motion.div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <motion.button
          onClick={handleContinue}
          className={`continue-button ${!isValid ? "disabled" : ""}`}
          disabled={!isValid}
          tabIndex={3}
          whileHover={isValid ? { scale: 1.05 } : {}}
          whileTap={isValid ? { scale: 0.95 } : {}}
          transition={{ duration: 0.2 }}
        >
          Continue
        </motion.button>
        {!isValid && (
          <motion.p
            className="mt-2 text-center text-sm text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            Please enter your full name
          </motion.p>
        )}
      </motion.div>

      {/* Keyboard shortcuts hint */}
      <motion.div
        className="keyboard-hints"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
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
