import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./style.css";
import { OnboardingStepProps } from "@/types/onboarding";

export default function Step2Persona({
  data,
  updateData,
  onContinue,
  onBack,
}: OnboardingStepProps) {
  const [signature, setSignature] = useState(data.signature);
  const [tone, setTone] = useState(data.tone);
  const [pronouns, setPronouns] = useState(data.pronouns);

  const isValid = tone.trim().length > 0 && signature.trim().length > 0;

  const handleContinue = () => {
    if (!isValid) return;
    updateData({ signature, tone, pronouns });
    onContinue();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isValid) {
        handleContinue();
      }
    } else if (e.key === "Escape" && onBack) {
      e.preventDefault();
      onBack();
    }
  };

  // Auto-save when fields change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateData({ signature, tone, pronouns });
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timer);
  }, [signature, tone, pronouns, updateData]);

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
        <h2 className="heading-title mb-8">Persona</h2>
      </motion.div>

      {/* Form Fields */}
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {/* Signature */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <label className="label-title mb-4">Signature *</label>
          <motion.textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder={`Best regards,
Jordan Quinn
Cool CEO 
Yet Another AI Startup`}
            className="onboarding-input"
            tabIndex={2}
            rows={4}
            style={{
              resize: "vertical",
              minHeight: "100px",
              paddingTop: "0.75rem",
            }}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          />
          <div className="mt-1 text-xs text-gray-500">
            {signature.trim().length > 0 ? (
              <span className="text-green-600">✓ Signature provided</span>
            ) : (
              <span className="text-red-500">Required field</span>
            )}
          </div>
        </motion.div>

        {/* Tone */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <label className="label-title mb-4">Tone *</label>
          <div className="relative">
            <motion.select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="onboarding-select"
              tabIndex={3}
              autoFocus
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.6 }}
            >
              <option value="">Select your tone</option>
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
            </motion.select>
            <div className="pointer-events-none absolute right-0 bottom-3">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </motion.div>

        {/* Pronouns */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <label className="label-title mb-4">Pronouns (optional)</label>
          <div className="relative">
            <motion.select
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              className="onboarding-select"
              tabIndex={4}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.7 }}
            >
              <option value="">Select pronouns</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="other">other</option>
            </motion.select>
            <div className="pointer-events-none absolute right-0 bottom-3">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <motion.button
          onClick={handleContinue}
          className={`continue-button ${!isValid ? "disabled" : ""}`}
          disabled={!isValid}
          tabIndex={5}
          whileHover={isValid ? { scale: 1.05 } : {}}
          whileTap={isValid ? { scale: 0.95 } : {}}
          transition={{ duration: 0.2 }}
        >
          Continue
        </motion.button>
        {!isValid && (
          <motion.p
            className="mt-2 text-center text-sm text-red-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {!tone.trim() &&
              !signature.trim() &&
              "Please select your communication tone and provide your signature"}
            {!tone.trim() &&
              signature.trim() &&
              "Please select your communication tone"}
            {tone.trim() &&
              !signature.trim() &&
              "Please provide your signature"}
          </motion.p>
        )}
      </motion.div>

      {/* Keyboard shortcuts hint */}
      <motion.div
        className="keyboard-hints"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      >
        Press <kbd>Enter</kbd> to continue · <kbd>Shift+Enter</kbd> for new line
        in signature
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
