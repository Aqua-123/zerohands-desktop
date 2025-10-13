import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./style.css";
import { OnboardingStepProps } from "@/types/onboarding";

type TabType = "emails" | "domains";

export default function Step3VipContacts({
  data,
  updateData,
  onContinue,
  onBack,
}: OnboardingStepProps) {
  const [activeTab, setActiveTab] = useState<TabType>("emails");

  // Extract user's domain from email if it's not gmail.com
  const getUserDomain = (email: string) => {
    if (!email) return "";
    const domain = email.split("@")[1];
    return domain && domain !== "gmail.com" ? domain : "";
  };

  const userDomain = getUserDomain(data.userEmail);

  // Initialize vipDomains with user's domain if available and not already set
  const initialVipDomains =
    data.vipDomains?.length > 0
      ? data.vipDomains
      : userDomain
        ? [userDomain]
        : [""];

  // Initialize vipContacts with user's email if they have a business domain and not already set
  const initialVipContacts =
    data.vipContacts?.length > 0
      ? data.vipContacts
      : userDomain
        ? [data.userEmail, "", ""]
        : ["", "", ""];

  const [vipContacts, setVipContacts] = useState(initialVipContacts);
  const [vipDomains, setVipDomains] = useState(initialVipDomains);

  const handleContactChange = (index: number, value: string) => {
    const newContacts = [...vipContacts];
    newContacts[index] = value;
    setVipContacts(newContacts);
  };

  const handleDomainChange = (index: number, value: string) => {
    const newDomains = [...vipDomains];
    newDomains[index] = value;
    setVipDomains(newDomains);
  };

  const addContact = () => {
    setVipContacts([...vipContacts, ""]);
  };

  const addDomain = () => {
    setVipDomains([...vipDomains, ""]);
  };

  const removeContact = (index: number) => {
    if (vipContacts.length > 1) {
      const newContacts = vipContacts.filter((_, i) => i !== index);
      setVipContacts(newContacts);
    }
  };

  const removeDomain = (index: number) => {
    if (vipDomains.length > 1) {
      const newDomains = vipDomains.filter((_, i) => i !== index);
      setVipDomains(newDomains);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidDomain = (domain: string) => {
    // Allow domains like "example.com" or "futurixai.com" (without @ symbol)
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain) && domain.includes(".");
  };

  const validEmails = vipContacts.filter(
    (contact) => contact.trim() && isValidEmail(contact.trim()),
  );
  const validDomains = vipDomains.filter(
    (domain) => domain.trim() && isValidDomain(domain.trim()),
  );
  const isValid = validEmails.length > 0 || validDomains.length > 0;

  const handleContinue = () => {
    if (!isValid) return;
    updateData({
      vipContacts: vipContacts.filter((contact) => contact.trim()),
      vipDomains: vipDomains.filter((domain) => domain.trim()),
    });
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

  const handleEmailInputKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // If this is the last input and it has a value, add a new one
      if (index === vipContacts.length - 1 && vipContacts[index].trim()) {
        addContact();
        // Focus the new input after a brief delay
        setTimeout(() => {
          const nextInput = document.querySelector(
            `input[data-contact-index="${index + 1}"]`,
          ) as HTMLInputElement;
          nextInput?.focus();
        }, 100);
      } else if (isValid) {
        // Try to continue if we have valid entries
        handleContinue();
      }
    } else if (
      e.key === "Backspace" &&
      !vipContacts[index] &&
      vipContacts.length > 1
    ) {
      // If input is empty and backspace is pressed, remove this contact and focus previous
      e.preventDefault();
      removeContact(index);
      setTimeout(() => {
        const prevInput = document.querySelector(
          `input[data-contact-index="${Math.max(0, index - 1)}"]`,
        ) as HTMLInputElement;
        prevInput?.focus();
      }, 100);
    }
  };

  const handleDomainInputKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // If this is the last input and it has a value, add a new one
      if (index === vipDomains.length - 1 && vipDomains[index].trim()) {
        addDomain();
        // Focus the new input after a brief delay
        setTimeout(() => {
          const nextInput = document.querySelector(
            `input[data-domain-index="${index + 1}"]`,
          ) as HTMLInputElement;
          nextInput?.focus();
        }, 100);
      } else if (isValid) {
        // Try to continue if we have valid entries
        handleContinue();
      }
    } else if (
      e.key === "Backspace" &&
      !vipDomains[index] &&
      vipDomains.length > 1
    ) {
      // If input is empty and backspace is pressed, remove this domain and focus previous
      e.preventDefault();
      removeDomain(index);
      setTimeout(() => {
        const prevInput = document.querySelector(
          `input[data-domain-index="${Math.max(0, index - 1)}"]`,
        ) as HTMLInputElement;
        prevInput?.focus();
      }, 100);
    }
  };

  // Auto-save when vipContacts or vipDomains change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateData({
        vipContacts: vipContacts.filter((contact) => contact.trim()),
        vipDomains: vipDomains.filter((domain) => domain.trim()),
      });
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timer);
  }, [vipContacts, vipDomains, updateData]);

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
        <h2 className="heading-title mb-4">VIP Contacts & Domains</h2>
        <p className="mb-8 text-sm text-gray-600">
          Add important email addresses and company domains that should always
          appear in your VIP section.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex space-x-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setActiveTab("emails")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "emails"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Email Addresses ({validEmails.length})
        </button>
        <button
          onClick={() => setActiveTab("domains")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "domains"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Company Domains ({validDomains.length})
        </button>
      </div>

      {/* Email Tab Content */}
      {activeTab === "emails" && (
        <div className="space-y-4">
          <div>
            <label className="label-title mb-6">VIP Email Addresses</label>
            <p className="mb-4 text-sm text-gray-500">
              Add specific email addresses of important contacts (e.g.,
              john@company.com)
            </p>

            <div className="mt-6 space-y-4">
              {vipContacts.map((contact, index) => (
                <div key={index} className="contact-row">
                  <input
                    type="email"
                    value={contact}
                    onChange={(e) => handleContactChange(index, e.target.value)}
                    onKeyDown={(e) => handleEmailInputKeyDown(e, index)}
                    placeholder={`contact${index + 1}@example.com`}
                    className="onboarding-input contact-input"
                    tabIndex={index + 2}
                    autoFocus={index === 0 && activeTab === "emails"}
                    data-contact-index={index}
                  />
                  {vipContacts.length > 1 && (
                    <button
                      onClick={() => removeContact(index)}
                      className="remove-contact-button"
                      title="Remove contact"
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

              {/* Add Contact Button */}
              <button
                onClick={addContact}
                className="add-contact-button"
                type="button"
                tabIndex={vipContacts.length + 2}
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
      )}

      {/* Domain Tab Content */}
      {activeTab === "domains" && (
        <div className="space-y-4">
          <div>
            <label className="label-title mb-6">VIP Company Domains</label>
            <p className="mb-4 text-sm text-gray-500">
              Add company domains to include all emails from those organizations
              (e.g., futurixai.com)
            </p>

            <div className="mt-6 space-y-4">
              {vipDomains.map((domain, index) => (
                <div key={index} className="contact-row">
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => handleDomainChange(index, e.target.value)}
                    onKeyDown={(e) => handleDomainInputKeyDown(e, index)}
                    placeholder={`company${index + 1}.com`}
                    className="onboarding-input contact-input"
                    tabIndex={index + 2}
                    autoFocus={index === 0 && activeTab === "domains"}
                    data-domain-index={index}
                  />
                  {vipDomains.length > 1 && (
                    <button
                      onClick={() => removeDomain(index)}
                      className="remove-contact-button"
                      title="Remove domain"
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

              {/* Add Domain Button */}
              <button
                onClick={addDomain}
                className="add-contact-button"
                type="button"
                tabIndex={vipDomains.length + 2}
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
                Add another domain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div>
        <button
          onClick={handleContinue}
          className={`continue-button ${!isValid ? "disabled" : ""}`}
          disabled={!isValid}
          tabIndex={100}
        >
          Continue
        </button>
        {!isValid && (
          <p className="mt-2 text-center text-sm text-gray-500">
            Please add at least one valid email address or domain
          </p>
        )}
        {isValid && (
          <p className="mt-2 text-center text-sm text-green-600">
            {validEmails.length + validDomains.length} VIP{" "}
            {validEmails.length + validDomains.length === 1
              ? "entry"
              : "entries"}{" "}
            configured
          </p>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="keyboard-hints">
        Press <kbd>Enter</kbd> to continue or add new entry
        {" · "}
        <kbd>Backspace</kbd> on empty field to remove
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
