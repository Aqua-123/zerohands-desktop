import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./style.css";
import { OnboardingStepProps } from "@/types/onboarding";

export default function Step5About({
  data,
  updateData,
  onContinue,
  onBack,
}: OnboardingStepProps) {
  const [companyName, setCompanyName] = useState(data.companyName);
  const [companySize, setCompanySize] = useState(data.companySize);
  const [positionType, setPositionType] = useState(data.positionType);

  const isValid =
    companyName.trim().length > 0 && companySize.trim().length > 0;

  const handleContinue = () => {
    if (!isValid) return;
    updateData({ companyName, companySize, positionType });
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

  // Auto-save when company fields change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateData({ companyName, companySize, positionType });
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timer);
  }, [companyName, companySize, positionType, updateData]);

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
        <h2 className="heading-title mb-8">About</h2>
      </motion.div>

      {/* Form Fields */}
      <div className="space-y-8">
        {/* Company Name */}
        <div>
          <label className="label-title mb-4">Company name *</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Inc."
            className="onboarding-input"
            tabIndex={2}
            autoFocus
          />
        </div>

        {/* Company Size */}
        <div>
          <label className="label-title mb-4">Size *</label>
          <div className="relative">
            <select
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              className="onboarding-select"
              tabIndex={3}
            >
              <option value="">Select company size</option>
              <option value="1-10">1-10</option>
              <option value="11-50">11-50</option>
              <option value="51-200">51-200</option>
              <option value="201-1000">201-1000</option>
              <option value="1000+">1000+</option>
            </select>
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
        </div>

        {/* Position Type */}
        <div>
          <label className="label-title mb-4">Position type (optional)</label>
          <div className="relative">
            <select
              value={positionType}
              onChange={(e) => setPositionType(e.target.value)}
              className="onboarding-select"
              tabIndex={4}
            >
              <option value="">Select position type</option>
              <option value="intern">Intern</option>
              <option value="junior">Junior</option>
              <option value="mid-level">Mid-level</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
              <option value="manager">Manager</option>
              <option value="director">Director</option>
              <option value="vp">Vice President</option>
              <option value="c-level">C-level</option>
            </select>
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
        </div>
      </div>

      {/* Continue Button */}
      <div>
        <button
          onClick={handleContinue}
          className={`continue-button ${!isValid ? "disabled" : ""}`}
          disabled={!isValid}
          tabIndex={5}
        >
          Complete Setup
        </button>
        {!isValid && (
          <p className="mt-2 text-center text-sm text-gray-500">
            Please fill in your company name and size
          </p>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="keyboard-hints">
        Press <kbd>Enter</kbd> to complete setup
        {onBack && (
          <>
            {" · "}
            <kbd>Esc</kbd> to go back
          </>
        )}
      </div>
    </motion.div>
  );
}
