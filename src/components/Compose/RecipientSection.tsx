import React, { useState } from "react";
import GmailRecipientPicker from "./GmailRecipientPicker";
import { Button } from "@/components/ui/button";

interface Recipient {
  name: string;
  email: string;
  avatar?: string;
}

interface RecipientSectionProps {
  recipients: Recipient[];
  ccRecipients: Recipient[];
  bccRecipients: Recipient[];
  onRecipientsChange: (
    mode: "to" | "cc" | "bcc",
    recipients: Recipient[],
  ) => void;
  userInfo?: {
    name?: string | null;
    email?: string | null;
  };
}

export default function RecipientSection({
  recipients,
  ccRecipients,
  bccRecipients,
  onRecipientsChange,
  userInfo,
}: RecipientSectionProps) {
  const [showCcBcc, setShowCcBcc] = useState(false);

  // Show sections if they have recipients OR if toggle is on
  const shouldShowCc = ccRecipients.length > 0 || showCcBcc;
  const shouldShowBcc = bccRecipients.length > 0 || showCcBcc;

  return (
    <div className="mb-6 space-y-3">
      {/* From Field - always visible */}
      <div className="flex items-center">
        {showCcBcc && <span className="w-16 text-sm text-gray-600">From</span>}
        <div className="flex flex-1 items-center gap-2">
          <span className="font-medium text-gray-900">
            {userInfo?.name || "User"}
          </span>
          <span className="text-sm text-gray-500">
            {userInfo?.email || "user@example.com"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-1 text-sm text-gray-500"
          onClick={() => setShowCcBcc(!showCcBcc)}
        >
          Cc/Bc
        </Button>
      </div>

      {/* To Recipients */}
      <div className="flex items-center">
        {showCcBcc && <span className="w-16 text-sm text-gray-600">To</span>}
        <div className="flex-1">
          <GmailRecipientPicker
            recipients={recipients}
            onRecipientsChange={(newRecipients) =>
              onRecipientsChange("to", newRecipients)
            }
            placeholder="Add Recipient"
            className="w-full border-none p-0 text-gray-500"
          />
        </div>
      </div>

      {/* CC Recipients */}
      {shouldShowCc && (
        <div className="flex items-center">
          {showCcBcc && <span className="w-16 text-sm text-gray-600">Cc</span>}
          <div className="flex-1">
            <GmailRecipientPicker
              recipients={ccRecipients}
              onRecipientsChange={(newRecipients) =>
                onRecipientsChange("cc", newRecipients)
              }
              placeholder={showCcBcc ? "Add Recipient" : "Add CC Recipient"}
              className="w-full border-none p-0 text-gray-500"
            />
          </div>
        </div>
      )}

      {/* BCC Recipients */}
      {shouldShowBcc && (
        <div className="flex items-center">
          {showCcBcc && <span className="w-16 text-sm text-gray-600">Bcc</span>}
          <div className="flex-1">
            <GmailRecipientPicker
              recipients={bccRecipients}
              onRecipientsChange={(newRecipients) =>
                onRecipientsChange("bcc", newRecipients)
              }
              placeholder={showCcBcc ? "Add Recipient" : "Add BCC Recipient"}
              className="w-full border-none p-0 text-gray-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export type { Recipient };
