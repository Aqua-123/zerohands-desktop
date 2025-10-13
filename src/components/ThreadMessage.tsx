import React, { useState, useMemo } from "react";
import { ChevronDown, Calendar, Reply, Forward } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card, CardContent } from "./ui/card";
import AttachmentIndicator from "./ui/attachment-indicator";
import { EmailMessage } from "../services/email";
import { splitQuotedContent } from "../lib/email-sanitization";
import { processLinksInContent } from "../lib/text-utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipProvider,
  TooltipContent,
} from "./ui/tooltip";
import { Button } from "./ui/button";
import ScheduleMeetingPopup, { MeetingDataAPI } from "./ScheduleMeetingPopup";
import { toast } from "sonner";
import "./ThreadMessage.css";

interface ThreadMessageProps {
  message: EmailMessage;
  userEmail: string; // Add userEmail prop for downloading attachments
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  isFirst?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function ThreadMessage({
  message,
  userEmail,
  onReply,
  onForward,
  isExpanded,
  onToggleExpand,
}: ThreadMessageProps) {
  const [showQuoted, setShowQuoted] = useState(false);
  const isCollapsed = !isExpanded;
  const [showAllTos, setShowAllTos] = useState(false);
  const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = useState(false);

  const avatarUrl = useMemo(() => {
    if (!message.senderEmail) return undefined;
    const domain = message.senderEmail.split("@")[1];
    if (!domain) return undefined;
    return `https://logo.clearbit.com/${domain}`;
  }, [message.senderEmail]);

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.split("@")[0].slice(0, 2).toUpperCase();
    }
    return "U";
  };

  // Deduplicate emails (case-insensitive) and format with +x more behavior (limit 2)
  const dedupeEmails = (recipients?: string[]) => {
    if (!recipients || recipients.length === 0) return [] as string[];
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const email of recipients) {
      const normalized = (email || "").trim().toLowerCase();
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        unique.push(email.trim());
      }
    }
    return unique;
  };

  const formatRecipients = (
    recipients?: string[],
    showAll: boolean = false,
  ) => {
    const unique = dedupeEmails(recipients);
    if (unique.length === 0) return "";

    if (!showAll && unique.length > 2) {
      return `${unique.slice(0, 2).join(", ")} +${unique.length - 2} more`;
    }

    return unique.join(", ");
  };

  const { mainContent, quotedContent } = useMemo(() => {
    if (!message.body && !message.htmlBody) {
      return { mainContent: "", quotedContent: "" };
    }

    const content = message.htmlBody || message.body || "";
    return splitQuotedContent(content);
  }, [message.body, message.htmlBody]);

  const hasQuotedContent = Boolean(
    quotedContent && quotedContent.trim().length > 0,
  );

  const processedMainContent = useMemo(() => {
    return processLinksInContent(mainContent);
  }, [mainContent]);

  const processedQuotedContent = useMemo(() => {
    return processLinksInContent(quotedContent);
  }, [quotedContent]);

  const formatDate = (date: Date) => {
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleDownloadAttachment = async (
    attachmentId: string,
    filename: string,
  ) => {
    try {
      console.log(`[ThreadMessage] Downloading attachment: ${filename}`);

      // Download attachment via IPC
      const result = await window.email.downloadAttachment(
        userEmail,
        message.id,
        attachmentId,
      );

      // Create a blob from the base64 data
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: result.mimeType });

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(
        `[ThreadMessage] Successfully downloaded: ${result.filename}`,
      );
    } catch (error) {
      console.error("[ThreadMessage] Error downloading attachment:", error);
      toast.error("Failed to download attachment");
    }
  };

  // Helper to get all participants from this message
  const getAllParticipants = (): string[] => {
    const participants: string[] = [];
    if (message.senderEmail && message.senderEmail !== userEmail) {
      participants.push(message.senderEmail);
    }
    if (message.recipientEmail) {
      const recipients = message.recipientEmail
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e && e !== userEmail);
      participants.push(...recipients);
    }
    // Deduplicate
    return Array.from(new Set(participants));
  };

  // Helper to get email date headers (for meeting context)
  const getEmailDateHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    const allEmails = getAllParticipants();
    allEmails.forEach((email) => {
      headers[email] = message.timestamp.toISOString();
    });
    return headers;
  };

  // Handler for creating a calendar event
  const handleScheduleMeeting = async (meetingData: MeetingDataAPI) => {
    try {
      console.log("[ThreadMessage] Creating calendar event:", meetingData);

      // Parse participants from comma-separated string
      const participants = meetingData.participants
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      // Create attendees array
      const attendees = participants.map((email) => ({
        email,
        displayName: email.split("@")[0],
      }));

      // Call calendar API to create event
      const result = await window.calendar.createEvent(userEmail, {
        title: meetingData.title,
        startDate: meetingData.startDate,
        startTime: meetingData.startTime,
        endTime: meetingData.endTime,
        description: meetingData.description || "",
        attendees,
        isVirtual: meetingData.isVirtual,
        location: meetingData.location,
        timezone: meetingData.timezone,
      });

      console.log("[ThreadMessage] Calendar event created:", result);
      toast.success(`Meeting "${result.summary}" scheduled successfully!`);

      // Close the popup
      setIsScheduleMeetingOpen(false);
    } catch (error) {
      console.error("[ThreadMessage] Error creating calendar event:", error);
      toast.error("Failed to schedule meeting");
    }
  };

  // Parse recipients from recipientEmail (comma-separated)
  const toAddresses = message.recipientEmail
    ? message.recipientEmail.split(",").map((e) => e.trim())
    : [];

  return (
    <Card className="mb-2 overflow-hidden bg-white py-0">
      <CardContent className="p-0">
        {/* Message Header */}
        <div
          className={`cursor-pointer p-4 transition-colors ${isCollapsed ? "hover:bg-gray-50" : "border-b border-gray-100 bg-gray-50"}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand?.();
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={avatarUrl}
                  alt={message.sender || message.senderEmail}
                />
                <AvatarFallback className="text-sm">
                  {getInitials(message.sender, message.senderEmail)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="truncate font-medium text-gray-900">
                    {message.sender || message.senderEmail}
                  </span>
                  {message.sender && (
                    <span className="truncate text-xs text-gray-500">
                      &lt;{message.senderEmail}&gt;
                    </span>
                  )}
                </div>

                {!isCollapsed && (
                  // Expanded view - show recipients and date
                  <div className="space-y-1 text-sm text-gray-600">
                    {toAddresses.length > 0 && (
                      <div>
                        <span className="font-medium">To: </span>
                        <span
                          className={
                            !showAllTos && dedupeEmails(toAddresses).length > 2
                              ? "cursor-pointer hover:underline"
                              : ""
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            const count = dedupeEmails(toAddresses).length;
                            if (count > 2) setShowAllTos(!showAllTos);
                          }}
                        >
                          {formatRecipients(toAddresses, showAllTos)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="ml-4 flex items-center gap-2">
              {/* Attachments indicator */}
              {message.attachments && message.attachments.length > 0 && (
                <AttachmentIndicator
                  hasAttachments={true}
                  attachmentCount={message.attachments.length}
                />
              )}

              {/* Date */}
              <div className="text-xs whitespace-nowrap text-gray-500">
                {formatDate(message.timestamp)}
              </div>

              {/* Action buttons - only show when expanded */}
              {isExpanded && (
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReply?.();
                          }}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <Reply className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reply</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onForward?.();
                          }}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <Forward className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Forward</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsScheduleMeetingOpen(true);
                          }}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Schedule Meeting</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}

              {/* Expand/Collapse button */}
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-gray-400"
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Message Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0">
                {/* Main content */}
                <div className="mb-4">
                  <div
                    className="prose prose-sm max-w-none py-8 pl-16"
                    dangerouslySetInnerHTML={{ __html: processedMainContent }}
                  />
                </div>

                {/* Quoted content toggle */}
                {hasQuotedContent && (
                  <div className="border-t border-gray-100 pt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQuoted(!showQuoted);
                      }}
                      className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-700"
                    >
                      <motion.div
                        animate={{ rotate: showQuoted ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </motion.div>
                      {showQuoted ? "Hide" : "Show"} quoted text
                    </button>

                    <AnimatePresence>
                      {showQuoted && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-2 overflow-hidden"
                        >
                          <div
                            className="prose prose-sm max-w-none border-l-2 border-gray-200 pl-4 text-gray-600"
                            dangerouslySetInnerHTML={{
                              __html: processedQuotedContent,
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <h4 className="mb-2 text-sm font-medium text-gray-700">
                      Attachments ({message.attachments.length})
                    </h4>
                    <div className="space-y-2">
                      {message.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-3 rounded-lg bg-gray-50 p-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-gray-900">
                              {attachment.filename}
                            </div>
                            <div className="text-xs text-gray-500">
                              {Math.round((attachment.size || 0) / 1024)} KB
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadAttachment(
                                attachment.id,
                                attachment.filename || "attachment",
                              );
                            }}
                          >
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      {/* Schedule Meeting Popup */}
      <ScheduleMeetingPopup
        isOpen={isScheduleMeetingOpen}
        onClose={() => setIsScheduleMeetingOpen(false)}
        onSave={handleScheduleMeeting}
        initialDate={message.timestamp}
        participants={getAllParticipants()}
        emailDateHeaders={getEmailDateHeaders()}
      />
    </Card>
  );
}
