import React from "react";
import { Paperclip, Calendar, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActionBarProps {
  onSend: () => void;
  isSending: boolean;
  emailBody: string;

  hasRecipients?: boolean;
  recipients?: Array<{ name: string; email: string }>; // For reply

  onScheduleFollowUp: (duration: number) => void;
  onCancelFollowUp?: () => void;
  isFollowUpScheduled?: boolean;
  followUpDuration?: number;

  onAttachFile: () => void;
  attachmentCount?: number; // For compose - shows count

  onScheduleMeeting: () => void;

  onAskAI?: () => void;
  isAIEnabled?: boolean;

  onCancel?: () => void;
  showCancel?: boolean;
  embeddedImageCount?: number;
  context?: "compose" | "reply";
}

export default function ActionBar({
  onSend,
  isSending,
  emailBody,
  hasRecipients,
  recipients,
  onScheduleFollowUp,
  onCancelFollowUp,
  isFollowUpScheduled = false,
  followUpDuration,
  onAttachFile,
  attachmentCount = 0,
  onScheduleMeeting,
  onAskAI,
  isAIEnabled = false,
  onCancel,
  showCancel = false,
  embeddedImageCount = 0,
  context = "reply",
}: ActionBarProps) {
  // Determine if send should be enabled based on context
  const canSend =
    context === "compose"
      ? emailBody.trim() && hasRecipients && !isSending
      : emailBody.trim() && recipients && recipients.length > 0 && !isSending;

  const getFollowUpLabel = () => {
    if (!followUpDuration) return "";

    const days = Math.floor(followUpDuration / 24);
    const weeks = Math.floor(followUpDuration / 168);

    if (followUpDuration < 1) {
      const minutes = Math.round(followUpDuration * 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""}`;
    } else if (followUpDuration >= 720) {
      return "1 month";
    } else if (followUpDuration >= 168) {
      return `${weeks} week${weeks > 1 ? "s" : ""}`;
    } else if (followUpDuration >= 24) {
      return `${days} day${days > 1 ? "s" : ""}`;
    } else {
      return `${followUpDuration} hour${followUpDuration > 1 ? "s" : ""}`;
    }
  };

  return (
    <div className="flex items-center justify-between">
      {/* Left side - Send button */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onSend}
          disabled={!canSend}
          className={`flex items-center gap-2 rounded-lg px-6 py-3 transition-all duration-200 ${
            !canSend
              ? "cursor-not-allowed bg-gray-100 text-gray-400"
              : "bg-gradient-to-r from-[#4F9EFF] to-[#5B9FFF] text-white shadow-sm hover:from-[#3B8BFF] hover:to-[#4790FF] hover:shadow-md"
          }`}
          style={{
            fontFamily: "Open Sans",
            fontSize: "16px",
            fontWeight: "600",
            minHeight: "40px",
          }}
        >
          {isSending ? (
            <>Sending...</>
          ) : (
            <>
              Send
              <SendHorizonal className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>

        {showCancel && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-800"
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Right side - Action icons */}
      <div className="flex items-center gap-2">
        {/* Attachment and image counts (compose only) */}
        <div className="mr-2 flex items-center gap-3">
          {attachmentCount > 0 && (
            <div className="flex items-center gap-1 text-sm text-[#91918E]">
              <Paperclip className="h-4 w-4" />
              <span>
                {attachmentCount} attachment{attachmentCount > 1 ? "s" : ""}
              </span>
            </div>
          )}

          {embeddedImageCount > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>
                {embeddedImageCount} embedded image
                {embeddedImageCount > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Follow-up status display */}
        {isFollowUpScheduled && (
          <div className="mr-2 flex items-center gap-1 rounded border border-orange-200 bg-orange-50 px-2 py-1 text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M8 1.5C4.41015 1.5 1.5 4.41015 1.5 8C1.5 11.5899 4.41015 14.5 8 14.5C11.5899 14.5 14.5 11.5899 14.5 8C14.5 4.41015 11.5899 1.5 8 1.5ZM8 13C5.23858 13 3 10.7614 3 8C3 5.23858 5.23858 3 8 3C10.7614 3 13 5.23858 13 8C13 10.7614 10.7614 13 8 13Z"
                fill="#ea580c"
              />
              <path
                d="M8.5 4.5H7.5V8.5L10.5 10.25L11 9.5L8.5 8V4.5Z"
                fill="#ea580c"
              />
            </svg>
            <span className="font-medium text-orange-700">
              Follow-up in {getFollowUpLabel()}
            </span>
            {onCancelFollowUp && (
              <button
                onClick={onCancelFollowUp}
                className="ml-1 text-orange-600 hover:text-orange-800"
                title="Cancel follow-up"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Follow-up scheduling */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-800"
              title="Schedule Follow-up"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 29 29"
                fill="none"
              >
                <g clipPath="url(#clip0_5509_98339)">
                  <path
                    opacity="0.85"
                    d="M18.0875 1.32031H10.8875V3.72031H18.0875V1.32031V1.32031ZM13.2875 16.9203H15.6875V9.72031H13.2875V16.9203ZM22.9235 8.97631L24.6275 7.27231C24.1115 6.66031 23.5475 6.08431 22.9355 5.58031L21.2315 7.28431C19.3715 5.79631 17.0315 4.90831 14.4875 4.90831C8.5235 4.90831 3.6875 9.74431 3.6875 15.7083C3.6875 21.6723 8.5115 26.5083 14.4875 26.5083C20.4635 26.5083 25.2875 21.6723 25.2875 15.7083C25.2875 13.1763 24.3995 10.8363 22.9235 8.97631ZM14.4875 24.1203C9.8435 24.1203 6.0875 20.3643 6.0875 15.7203C6.0875 11.0763 9.8435 7.32031 14.4875 7.32031C19.1315 7.32031 22.8875 11.0763 22.8875 15.7203C22.8875 20.3643 19.1315 24.1203 14.4875 24.1203Z"
                    fill="url(#paint0_linear_5509_98339)"
                  />
                </g>
                <defs>
                  <linearGradient
                    id="paint0_linear_5509_98339"
                    x1="6.16619"
                    y1="11.2347"
                    x2="25.2207"
                    y2="11.0744"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0.225962" stopColor="#659DFF" />
                    <stop offset="1" stopColor="#B2CDFB" />
                  </linearGradient>
                  <clipPath id="clip0_5509_98339">
                    <rect
                      width="28.8"
                      height="28.8"
                      fill="white"
                      transform="translate(0 0.109375)"
                    />
                  </clipPath>
                </defs>
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onScheduleFollowUp(0.0083)}>
              30 seconds
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onScheduleFollowUp(0.05)}>
              3 minutes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onScheduleFollowUp(0.25)}>
              15 minutes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onScheduleFollowUp(24)}>
              1 day
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onScheduleFollowUp(72)}>
              3 days
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onScheduleFollowUp(168)}>
              1 week
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onScheduleFollowUp(336)}>
              2 weeks
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onScheduleFollowUp(720)}>
              1 month
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Attachment button */}
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:text-gray-800"
          onClick={onAttachFile}
          title="Attach File"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* AI button (reply only) */}
        {onAskAI && (
          <Button
            variant="ghost"
            size="sm"
            className={
              isAIEnabled
                ? "hover:bg-gray-100"
                : "text-gray-600 hover:text-gray-800"
            }
            onClick={onAskAI}
            title="Ask AI"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="23"
              viewBox="0 0 34 33"
              fill="none"
            >
              <defs>
                <linearGradient
                  id="ai-gradient"
                  x1="0%"
                  y1="100%"
                  x2="100%"
                  y2="0%"
                  gradientUnits="objectBoundingBox"
                >
                  <stop offset="12.61%" stopColor="#FF65E5" />
                  <stop offset="85.22%" stopColor="#FFA7F0" />
                </linearGradient>
              </defs>
              <path
                d="M16.7712 32.9878C17.1221 24.0878 24.2566 16.9533 33.1566 16.6024C24.2566 16.2515 17.1221 9.11697 16.7712 0.216961C16.4203 9.11697 9.28582 16.2515 0.385803 16.6024C9.28582 16.9533 16.4203 24.0878 16.7712 32.9878Z"
                fill={isAIEnabled ? "url(#ai-gradient)" : "#B5B5B5"}
                style={{ opacity: isAIEnabled ? 0.85 : 1 }}
              />
            </svg>
          </Button>
        )}

        {/* Meeting scheduling button */}
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:text-gray-800"
          onClick={onScheduleMeeting}
          title="Schedule Meeting"
        >
          <Calendar className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
