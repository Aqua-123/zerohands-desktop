import React, { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

interface Recipient {
  name: string;
  email: string;
  avatar?: string;
}

interface ContactSuggestion {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  emailCount: number;
  lastEmailAt: Date | null;
  isManual: boolean;
  isFromGoogle?: boolean;
  phone?: string | null;
}

interface GmailRecipientPickerProps {
  recipients: Recipient[];
  onRecipientsChange: (recipients: Recipient[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function GmailRecipientPicker({
  recipients,
  onRecipientsChange,
  placeholder = "Recipients",
  className = "",
  disabled = false,
}: GmailRecipientPickerProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/contacts?q=${encodeURIComponent(query)}`,
        );
        const data = await response.json();
        const filteredSuggestions = (data.contacts || []).filter(
          (contact: ContactSuggestion) =>
            !recipients.some((r) => r.email === contact.email),
        );
        setSuggestions(filteredSuggestions);
        setShowSuggestions(filteredSuggestions.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    },
    [recipients],
  );

  const handleInputChange = (value: string) => {
    setInputValue(value);

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce API calls
    debounceTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 100);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        if (showSuggestions && suggestions.length > 0) {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev,
          );
        }
        break;
      case "ArrowUp":
        if (showSuggestions && suggestions.length > 0) {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        }
        break;
      case "Enter":
        e.preventDefault();
        if (
          showSuggestions &&
          suggestions.length > 0 &&
          selectedIndex >= 0 &&
          selectedIndex < suggestions.length
        ) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        } else if (inputValue.trim() && isValidEmail(inputValue)) {
          // Add as new recipient if it's a valid email
          handleAddNewRecipient(inputValue.trim());
        }
        break;
      case "Tab":
        if (
          showSuggestions &&
          suggestions.length > 0 &&
          selectedIndex >= 0 &&
          selectedIndex < suggestions.length
        ) {
          e.preventDefault();
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSuggestionSelect = (contact: ContactSuggestion) => {
    const newRecipient: Recipient = {
      email: contact.email,
      name: contact.name || contact.email.split("@")[0],
      avatar: contact.avatar || undefined,
    };

    onRecipientsChange([...recipients, newRecipient]);
    setInputValue("");
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleAddNewRecipient = (email: string) => {
    if (!isValidEmail(email)) return;

    const newRecipient: Recipient = {
      email,
      name: email.split("@")[0],
      avatar: undefined,
    };

    onRecipientsChange([...recipients, newRecipient]);
    setInputValue("");
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleRemoveRecipient = (index: number) => {
    const newRecipients = recipients.filter((_, i) => i !== index);
    onRecipientsChange(newRecipients);
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="flex min-h-[40px] flex-wrap items-center gap-2 rounded-md border-none bg-white py-2">
        {/* Existing Recipients */}
        {recipients.map((recipient, index) => (
          <div
            key={index}
            className="group flex items-center gap-1 rounded-full py-1 transition-colors"
          >
            <span className="text-md text-gray-700">{recipient.email}</span>
            <button
              onClick={() => handleRemoveRecipient(index)}
              className="ml-1 opacity-70 transition-opacity group-hover:opacity-100 hover:text-gray-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={recipients.length === 0 ? placeholder : ""}
          disabled={disabled}
          className="flex-1 border-0 border-b border-gray-200 pb-2 text-lg placeholder-gray-400 outline-none focus:border-blue-500"
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 max-h-60 w-[400px] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <div className="border-b border-gray-100 px-4 py-2 text-sm text-gray-600">
            Select a person
          </div>
          {suggestions.map((contact, index) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => handleSuggestionSelect(contact)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                index === selectedIndex ? "bg-gray-50" : ""
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 font-medium text-gray-600">
                {(contact.name || contact.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-gray-900">
                  {contact.name || contact.email.split("@")[0]}
                </div>
              </div>
              <div className="truncate text-sm text-gray-500">
                {contact.email}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-1/2 right-3 -translate-y-1/2 transform">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
        </div>
      )}
    </div>
  );
}
