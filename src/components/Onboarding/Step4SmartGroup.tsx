import React, { useState, useEffect } from "react";
import "./style.css";

interface OnboardingData {
  fullName: string;
  signature: string;
  tone: string;
  pronouns: string;
  vipContacts: string[];
  smartGroupName: string;
  smartGroupEmails: string[];
  companyName: string;
  companySize: string;
  positionType: string;
}

interface Step4Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onContinue: () => void;
  onBack?: () => void;
}

export default function Step4SmartGroup({
  data,
  updateData,
  onContinue,
  onBack,
}: Step4Props) {
  const [smartGroupName, setSmartGroupName] = useState(data.smartGroupName);
  const [smartGroupEmails, setSmartGroupEmails] = useState(
    data.smartGroupEmails?.length > 0 ? data.smartGroupEmails : ["", "", ""],
  );

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...smartGroupEmails];
    newEmails[index] = value;
    setSmartGroupEmails(newEmails);
  };

  const addEmail = () => {
    setSmartGroupEmails([...smartGroupEmails, ""]);
  };

  const removeEmail = (index: number) => {
    if (smartGroupEmails.length > 1) {
      const newEmails = smartGroupEmails.filter((_, i) => i !== index);
      setSmartGroupEmails(newEmails);
    }
  };

  const handleContinue = () => {
    updateData({ smartGroupName, smartGroupEmails });
    onContinue();
  };

  const handleSkip = () => {
    updateData({ smartGroupName: "", smartGroupEmails: [] });
    onContinue();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleContinue();
    } else if (e.key === "Escape" && onBack) {
      e.preventDefault();
      onBack();
    } else if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
      // Ctrl+S or Cmd+S to skip
      e.preventDefault();
      handleSkip();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // If this is the last input and it has a value, add a new one
      if (
        index === smartGroupEmails.length - 1 &&
        smartGroupEmails[index].trim()
      ) {
        addEmail();
        // Focus the new input after a brief delay
        setTimeout(() => {
          const nextInput = document.querySelector(
            `input[data-email-index="${index + 1}"]`,
          ) as HTMLInputElement;
          nextInput?.focus();
        }, 100);
      } else {
        // Continue
        handleContinue();
      }
    } else if (
      e.key === "Backspace" &&
      !smartGroupEmails[index] &&
      smartGroupEmails.length > 1
    ) {
      // If input is empty and backspace is pressed, remove this email and focus previous
      e.preventDefault();
      removeEmail(index);
      setTimeout(() => {
        const prevInput = document.querySelector(
          `input[data-email-index="${Math.max(0, index - 1)}"]`,
        ) as HTMLInputElement;
        prevInput?.focus();
      }, 100);
    }
  };

  // Auto-save when smart group fields change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateData({ smartGroupName, smartGroupEmails });
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timer);
  }, [smartGroupName, smartGroupEmails, updateData]);

  return (
    <div className="space-y-8" onKeyDown={handleKeyDown}>
      {/* Back Button */}
      {onBack && (
        <div className="mb-4">
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
        </div>
      )}

      {/* Title */}
      <div>
        <h2 className="heading-title mb-8">Smart Group</h2>
      </div>

      {/* Form Fields */}
      <div className="space-y-8">
        {/* Group Name */}
        <div>
          <label className="label-title mb-4">Group Name</label>
          <input
            type="text"
            value={smartGroupName}
            onChange={(e) => setSmartGroupName(e.target.value)}
            placeholder="My Team"
            className="onboarding-input"
            tabIndex={2}
            autoFocus
          />
        </div>

        {/* Group Emails */}
        <div>
          <label className="label-title mb-6">Group Emails</label>
          <div className="mt-6 space-y-4">
            {smartGroupEmails.map((email, index) => (
              <div key={index} className="contact-row">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  onKeyDown={(e) => handleInputKeyDown(e, index)}
                  placeholder={`Email ${index + 1}`}
                  className="onboarding-input contact-input"
                  tabIndex={index + 3}
                  data-email-index={index}
                />
                {smartGroupEmails.length > 1 && (
                  <button
                    onClick={() => removeEmail(index)}
                    className="remove-contact-button"
                    title="Remove email"
                    tabIndex={-1}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}

            {/* Add Email Button */}
            <button
              onClick={addEmail}
              className="add-contact-button"
              type="button"
              tabIndex={smartGroupEmails.length + 3}
            >
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add another email
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        <button
          onClick={handleContinue}
          className="continue-button"
          tabIndex={smartGroupEmails.length + 4}
        >
          Continue
        </button>
        <button
          onClick={handleSkip}
          className="skip-button"
          tabIndex={smartGroupEmails.length + 5}
        >
          Skip this step
        </button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="keyboard-hints">
        Press <kbd>Enter</kbd> to continue or add new email
        {" · "}
        <kbd>Backspace</kbd> on empty field to remove
        {" · "}
        <kbd>Ctrl+S</kbd> to skip
        {onBack && (
          <>
            {" · "}
            <kbd>Esc</kbd> to go back
          </>
        )}
      </div>
    </div>
  );
}
