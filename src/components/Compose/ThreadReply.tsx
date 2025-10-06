import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import {
  X,
  File as FileIcon,
  Image,
  Video,
  Music,
  Archive,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import { EditorWrapper, ContentEditorApi, SubjectField } from "./index";
import RecipientSection from "./RecipientSection";
import type { Recipient } from "./RecipientSection";
import { useUndoSend } from "@/hooks/use-undo-send";
import GiphySelector from "./GiphySelector";
import ActionBar from "./ActionBar";
import AIPromptInput from "./AIPromptInput";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { useAuth } from "@/contexts/AuthContext";
import type { EmailMessage } from "@/services/email";
import "./ThreadReply.css";
import EnhancedScheduleMeetingPopup from "../ScheduleMeetingPopup";
import calendarAPI from "@/helpers/ipc/calendar/calendar-api";
import type { CreateEventData } from "@/types";

// ---------- Types ----------
interface SendReplyData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  threadId: string;
  replyToMessageId: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    data: string;
  }>;
  followUpDuration?: number;
}

interface FollowupPredraft {
  id: string;
  followupDraft: string;
  dueAt: string;
}

// Extend EmailMessage to include additional fields used in ThreadReply
interface ExtendedEmailMessage extends EmailMessage {
  fromAddress?: string;
  fromName?: string;
  toAddresses?: string[];
  ccAddresses?: string[];
  bccAddresses?: string[];
  date?: string;
  snippet?: string;
  labels?: string[];
}

// ---------- Attachments: local types + config ----------
interface Attachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  url?: string; // object URL for previews
}
const MAX_FILE_SIZE_MB = 25; // Gmail-like
const MAX_FILES = 25;
const DEFAULT_ALLOWED_TYPES = [
  "image/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/*",
  "video/*",
  "audio/*",
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
];

// ---------- Component ----------
interface ThreadReplyProps {
  messages: ExtendedEmailMessage[];
  threadId: string;
  replyToMessageId?: string | null;
  replyAllToMessageId?: string | null;
  onReplyCancel?: () => void;
  onThreadRefresh?: () => void;
  replyRef?: React.RefObject<HTMLDivElement>; // (unused external ref preserved)
  category?: string;
  predraftData?: FollowupPredraft | null;
  onPredraftUpdate?: (predraft: FollowupPredraft | null) => void;
  onCollapseAllMessages?: () => void;
}

function getAllThreadParticipants(messages: ExtendedEmailMessage[]): string[] {
  const participants = new Set<string>();
  messages.forEach((m) => {
    if (m.fromAddress) participants.add(m.fromAddress);
    (m.toAddresses || []).forEach(
      (e: string) => e && e.includes("@") && participants.add(e),
    );
    (m.ccAddresses || []).forEach(
      (e: string) => e && e.includes("@") && participants.add(e),
    );
    (m.bccAddresses || []).forEach(
      (e: string) => e && e.includes("@") && participants.add(e),
    );
  });
  return Array.from(participants);
}
function getAllThreadEmailDateHeaders(
  messages: ExtendedEmailMessage[],
): Record<string, string> {
  const dateHeaders: Record<string, string> = {};
  messages.forEach((m) => {
    const perMsg = new Set<string>();
    if (m.fromAddress) perMsg.add(m.fromAddress);
    [
      ...(m.toAddresses || []),
      ...(m.ccAddresses || []),
      ...(m.bccAddresses || []),
    ].forEach((e: string) => e && e.includes("@") && perMsg.add(e));
    perMsg.forEach((email) => {
      // Only set the date if it's not already set, or if this message is more recent
      if (
        !dateHeaders[email] ||
        new Date(m.date || "") > new Date(dateHeaders[email] || "")
      ) {
        dateHeaders[email] = m.date || "";
      }
    });
  });
  return dateHeaders;
}
export default function ThreadReply({
  messages,
  threadId,
  replyToMessageId,
  replyAllToMessageId,
  onReplyCancel,
  onThreadRefresh,
  predraftData,
  onPredraftUpdate,
  onCollapseAllMessages,
}: ThreadReplyProps) {
  // Auth context
  const { user: session } = useAuth();

  // Core reply state
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPopup, setShowPopup] = useState(false); // kept for API parity
  const [replyBody, setReplyBody] = useState("");
  const [subject, setSubject] = useState("");

  // Recipients
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [ccRecipients, setCcRecipients] = useState<Recipient[]>([]);
  const [bccRecipients, setBccRecipients] = useState<Recipient[]>([]);

  // Predraft
  const [isPredraftMode, setIsPredraftMode] = useState(false);
  const [predraftInitialized, setPredraftInitialized] = useState(false);

  // Editors
  const editorRef = useRef<HTMLDivElement>(null);
  const editorApiRef = useRef<ContentEditorApi | null>(null);
  const popupEditorApiRef = useRef<ContentEditorApi | null>(null);
  const replyAnchorRef = useRef<HTMLDivElement>(null);

  // UI toggles
  const [showGiphySelector, setShowGiphySelector] = useState(false);

  const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = useState(false);
  // Follow-up
  const [followUpScheduled, setFollowUpScheduled] = useState(false);
  const [followUpDuration, setFollowUpDuration] = useState<
    number | undefined
  >();

  // Attachments (integrated)
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI
  const [isAIMode, setIsAIMode] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);

  // ---------- Utils ----------
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++)
      binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };
  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (type.startsWith("video/")) return <Video className="h-4 w-4" />;
    if (type.startsWith("audio/")) return <Music className="h-4 w-4" />;
    if (type.includes("pdf"))
      return <FileText className="h-4 w-4 text-red-500" />;
    if (type.includes("word") || type.includes("document"))
      return <FileText className="h-4 w-4 text-blue-500" />;
    if (type.includes("excel") || type.includes("spreadsheet"))
      return <FileText className="h-4 w-4 text-green-500" />;
    if (type.includes("powerpoint") || type.includes("presentation"))
      return <FileText className="h-4 w-4 text-orange-500" />;
    if (type.includes("zip") || type.includes("rar") || type.includes("7z"))
      return <Archive className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  };

  // ---------- Scrolling ----------
  const scrollReplyIntoView = useCallback((delay = 200) => {
    setTimeout(() => {
      const el =
        replyAnchorRef.current?.parentElement ?? replyAnchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight;
      const buffer = 100;
      if (rect.bottom + buffer > viewport) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }
    }, delay);
  }, []);

  // ---------- Reply initialization from a specific message ----------
  useEffect(() => {
    const messageIdToReply = replyToMessageId || replyAllToMessageId;
    if (!messageIdToReply) return;
    const m = messages.find((msg) => msg.id === messageIdToReply);
    if (!m) return;

    setIsExpanded(true);
    scrollReplyIntoView(150);

    const replyRecipients: Recipient[] = [];
    const replyCcRecipients: Recipient[] = [];
    const currentUserEmail = session?.email;
    const isSentByUs = currentUserEmail && m.fromAddress === currentUserEmail;

    if (isSentByUs) {
      (m.toAddresses || []).forEach((email) =>
        replyRecipients.push({ name: email.split("@")[0], email }),
      );
      (m.ccAddresses || []).forEach((email) =>
        replyCcRecipients.push({ name: email.split("@")[0], email }),
      );
    } else if (m.fromAddress) {
      replyRecipients.push({
        name: m.fromName || m.fromAddress.split("@")[0],
        email: m.fromAddress,
      });
    }

    if (replyAllToMessageId) {
      (m.ccAddresses || []).forEach((ccEmail) => {
        if (ccEmail !== currentUserEmail && ccEmail !== m.fromAddress)
          replyCcRecipients.push({
            name: ccEmail.split("@")[0],
            email: ccEmail,
          });
      });
    }

    setRecipients(replyRecipients);
    setCcRecipients(replyCcRecipients);

    const originalSubject = m.subject || "";
    const replySubject = originalSubject.toLowerCase().startsWith("re:")
      ? originalSubject
      : `Re: ${originalSubject}`;
    setSubject(replySubject);

    const ctx = [
      {
        role: "user" as const,
        content: `Original message from ${m.fromName || m.fromAddress}:
Subject: ${m.subject}
Date: ${m.date}
Content: ${m.snippet || "No content available"}`,
      },
    ];
    setConversationHistory(ctx);
  }, [
    replyToMessageId,
    replyAllToMessageId,
    messages,
    session?.email,
    scrollReplyIntoView,
  ]);

  // ---------- Initialize defaults from latest message ----------
  useEffect(() => {
    if (messages.length === 0) return;
    const latest = messages[messages.length - 1];

    const replyTo: Recipient[] = [];
    const replyCc: Recipient[] = [];
    const isLastFromUs = !!latest.labels?.includes("SENT");

    if (isLastFromUs) {
      (latest.toAddresses || []).forEach((email) =>
        replyTo.push({ name: email.split("@")[0], email }),
      );
      (latest.ccAddresses || []).forEach((email) =>
        replyCc.push({ name: email.split("@")[0], email }),
      );
    } else if (latest.fromAddress) {
      replyTo.push({
        name: latest.fromName || latest.fromAddress.split("@")[0],
        email: latest.fromAddress,
      });
    }

    setRecipients(replyTo);
    setCcRecipients(replyCc);

    const originalSubject = latest.subject || "";
    setSubject(
      originalSubject.toLowerCase().startsWith("re:")
        ? originalSubject
        : `Re: ${originalSubject}`,
    );

    // reset just-sent flag if message updated a while ago

    setReplyBody("");
    editorApiRef.current?.clearContent?.();
    popupEditorApiRef.current?.clearContent?.();
  }, [messages]);

  // ---------- Predraft init ----------
  useEffect(() => {
    if (
      !predraftData?.followupDraft ||
      predraftInitialized ||
      replyBody ||
      replyToMessageId ||
      replyAllToMessageId
    )
      return;
    setIsPredraftMode(true);
    setIsExpanded(true);
    setPredraftInitialized(true);

    const latest = messages[messages.length - 1];
    if (latest?.fromAddress && !latest.labels?.includes("SENT")) {
      setRecipients([
        {
          name: latest.fromName || latest.fromAddress,
          email: latest.fromAddress,
        },
      ]);
    }
    if (latest?.subject)
      setSubject(
        latest.subject.startsWith("Re:")
          ? latest.subject
          : `Re: ${latest.subject}`,
      );

    const inject = (attempt = 1) => {
      const content = predraftData.followupDraft;
      const editor = editorApiRef.current;
      const popup = popupEditorApiRef.current;
      if (editor?.insertLLMContent || popup?.insertLLMContent) {
        editor?.clearContent?.();
        editor?.insertLLMContent?.(content || "");
        popup?.clearContent?.();
        popup?.insertLLMContent?.(content || "");
        setReplyBody(content || "");
        onCollapseAllMessages?.();
        setTimeout(() => {
          const replySection = document.querySelector("[data-reply-section]");
          replySection?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      } else if (attempt < 5)
        setTimeout(() => inject(attempt + 1), attempt * 200);
    };
    setTimeout(() => inject(), 100);
  }, [
    predraftData,
    predraftInitialized,
    replyBody,
    replyToMessageId,
    replyAllToMessageId,
    messages,
    onCollapseAllMessages,
  ]);

  // ---------- Attachment logic ----------
  useEffect(
    () => () => {
      attachments.forEach((a) => a.url && URL.revokeObjectURL(a.url));
    },
    [attachments],
  );

  const validateFiles = useCallback((files: File[], currentCount: number) => {
    const valid: File[] = [];
    const errors: string[] = [];
    if (!files || !Array.isArray(files)) return { validFiles: [], errors: [] };
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        errors.push(`${f.name} is too large (max ${MAX_FILE_SIZE_MB}MB)`);
        continue;
      }
      const isAllowed = DEFAULT_ALLOWED_TYPES.some((t) =>
        t.endsWith("/*") ? f.type.startsWith(t.slice(0, -1)) : f.type === t,
      );
      if (!isAllowed) {
        errors.push(`${f.name} is not an allowed file type`);
        continue;
      }
      valid.push(f);
    }
    if (currentCount + valid.length > MAX_FILES) {
      const allowed = MAX_FILES - currentCount;
      errors.push(
        `Can only attach ${allowed} more file(s). Maximum ${MAX_FILES} files allowed.`,
      );
      return { validFiles: valid.slice(0, allowed), errors };
    }
    return { validFiles: valid, errors };
  }, []);

  const handleFiles = useCallback(
    (files: File[]) => {
      if (!files || !Array.isArray(files) || files.length === 0) return;
      setAttachments((prev) => {
        const { validFiles, errors } = validateFiles(files, prev.length);
        if (errors.length) {
          setUploadErrors(errors);
          setTimeout(() => setUploadErrors([]), 5000);
        }
        if (!validFiles.length) return prev;
        const next: Attachment[] = validFiles.map((file) => ({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          url: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
        }));
        return [...prev, ...next];
      });
    },
    [validateFiles],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      handleFiles(files);
      e.target.value = "";
    },
    [handleFiles],
  );

  const handleAttachFile = useCallback(() => fileInputRef.current?.click(), []);
  const handleFilesDropped = useCallback(
    (files: File[]) => handleFiles(files),
    [handleFiles],
  );
  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.url) URL.revokeObjectURL(att.url);
      return prev.filter((a) => a.id !== id);
    });
  }, []);
  const getTotalSize = () => attachments.reduce((t, a) => t + a.size, 0);

  // ---------- Send Reply Function ----------
  const sendReply = async (replyData: SendReplyData) => {
    try {
      // Mock implementation - replace with actual API call
      console.log("Sending reply:", replyData);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return { success: true };
    } catch (error) {
      console.error("Error sending reply:", error);
      return { success: false, error: "Failed to send reply" };
    }
  };

  // ---------- Undo-send / send ----------
  const { sendWithUndo, isSending } = useUndoSend({
    onSend: async (replyData) => {
      const result = await sendReply(replyData as SendReplyData);
      if (!result.success)
        throw new Error(result.error || "Failed to send reply");
    },
    onSuccess: async () => {
      if (isPredraftMode && predraftData?.id) {
        try {
          // await markFollowupAsSent(predraftData.id);
          onPredraftUpdate?.(null);
          setIsPredraftMode(false);
        } catch (e) {
          console.error("Error marking followup as sent:", e);
        }
      }
      setReplyBody("");
      editorApiRef.current?.clearContent?.();
      popupEditorApiRef.current?.clearContent?.();
      setRecipients([]);
      setCcRecipients([]);
      setBccRecipients([]);
      setSubject("");
      setIsExpanded(false);
      setShowPopup(false);
      setFollowUpScheduled(false);
      setFollowUpDuration(undefined);
      setAttachments([]);
      setPredraftInitialized(false);
      onThreadRefresh?.();
    },
    successMessage: "Reply sent successfully!",
    errorMessage: "Failed to send reply",
  });

  const handleSend = useCallback(async () => {
    if (!replyBody.trim() || recipients.length === 0) return;
    try {
      const targetMessageId =
        replyToMessageId ||
        replyAllToMessageId ||
        messages[messages.length - 1]?.id;
      const attachmentData: Array<{
        filename: string;
        mimeType: string;
        size: number;
        data: string;
      }> = [];
      for (const att of attachments) {
        try {
          const buf = await att.file.arrayBuffer();
          const base64Data = arrayBufferToBase64(buf);
          attachmentData.push({
            filename: att.name,
            mimeType: att.type || "application/octet-stream",
            size: att.size,
            data: base64Data,
          });
        } catch (e) {
          console.error("Error converting attachment:", att.name, e);
        }
      }
      const replyData = {
        to: recipients.map((r) => r.email),
        cc: ccRecipients.map((r) => r.email),
        bcc: bccRecipients.map((r) => r.email),
        subject,
        body: replyBody,
        threadId,
        replyToMessageId: targetMessageId,
        attachments: attachmentData.length > 0 ? attachmentData : undefined,
        followUpDuration: followUpScheduled ? followUpDuration : undefined,
      };
      await sendWithUndo(replyData);
    } catch (error) {
      console.error("Error preparing reply:", error);
      toast.error("Failed to prepare reply. Please try again.");
    }
  }, [
    replyBody,
    recipients,
    ccRecipients,
    bccRecipients,
    subject,
    threadId,
    messages,
    attachments,
    followUpScheduled,
    followUpDuration,
    sendWithUndo,
    replyToMessageId,
    replyAllToMessageId,
  ]);

  // ---------- Shortcuts ----------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!isSending && replyBody.trim() && recipients.length > 0)
          handleSend();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isSending, replyBody, recipients.length, handleSend]);

  // ---------- Recipients change ----------
  const handleRecipientsChange = useCallback(
    (mode: "to" | "cc" | "bcc", newRecipients: Recipient[]) => {
      if (mode === "to") setRecipients(newRecipients);
      else if (mode === "cc") setCcRecipients(newRecipients);
      else setBccRecipients(newRecipients);
    },
    [],
  );

  // ---------- AI ----------
  const handleEditorReady = (api: ContentEditorApi) => {
    if (showPopup) popupEditorApiRef.current = api;
    else editorApiRef.current = api;
  };
  const handleBodyChange = (body: string) => {
    setReplyBody(body);
  };
  const handleGifSelect = (gifUrl: string) => {
    const html = `<img src="${gifUrl}" alt="GIF" style="max-width: 300px; height: auto; border-radius: 8px; margin: 8px 0;" />`;
    setReplyBody((prev) => prev + html);
    setIsExpanded(true);
    scrollReplyIntoView();
    const api = showPopup ? popupEditorApiRef.current : editorApiRef.current;
    api?.insertLLMContent?.(html);
  };
  const handleScheduleFollowUp = useCallback((duration: number) => {
    setFollowUpScheduled(true);
    setFollowUpDuration(duration);
  }, []);
  const handleCancelFollowUp = useCallback(() => {
    setFollowUpScheduled(false);
    setFollowUpDuration(undefined);
  }, []);
  const handleCancelPredraft = useCallback(async () => {
    if (!predraftData?.id) return;
    try {
      onPredraftUpdate?.(null);
      setIsPredraftMode(false);
      setReplyBody("");
      setIsExpanded(false);
      setPredraftInitialized(false);
      toast.success("Followup cancelled");
    } catch (e) {
      console.error("Error cancelling followup:", e);
      toast.error("Failed to cancel followup");
    }
  }, [predraftData, onPredraftUpdate]);

  const handleScheduleMeeting = useCallback(() => {
    setIsScheduleMeetingOpen(true);
  }, []);

  const handleMeetingSave = useCallback(
    async (meetingData: {
      title: string;
      startDate: string;
      startTime: string;
      endTime: string;
      participants: string;
      description: string;
      isVirtual: boolean;
      location?: string;
      timezone?: string;
    }) => {
      try {
        if (!session?.email) {
          toast.error("User email not found");
          return;
        }

        // Convert MeetingDataAPI to CreateEventData format
        const eventData: CreateEventData = {
          title: meetingData.title,
          startDate: meetingData.startDate,
          startTime: meetingData.startTime,
          endTime: meetingData.endTime,
          description: meetingData.description,
          attendees: meetingData.participants
            ? meetingData.participants
                .split(",")
                .map((email: string) => email.trim())
                .filter((email: string) => email.includes("@"))
                .map((email: string) => ({
                  email,
                  displayName: email.split("@")[0],
                  responseStatus: "needsAction",
                }))
            : [],
          isVirtual: meetingData.isVirtual,
          location: meetingData.location,
          timezone:
            meetingData.timezone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        // Check for conflicts first
        const conflicts = await calendarAPI.checkConflicts(
          session.email,
          eventData,
        );

        if (conflicts.hasConflicts) {
          const shouldProceed = window.confirm(
            `You have ${conflicts.conflictingEvents.length} conflicting event(s) at this time. Do you want to proceed anyway?`,
          );
          if (!shouldProceed) {
            return;
          }
        }

        // Create the calendar event
        const result = await calendarAPI.createEvent(session.email, eventData);

        if (result) {
          const attendeesCount = eventData.attendees?.length || 0;
          let msg = "Meeting scheduled successfully";

          if (attendeesCount > 0) {
            // Determine provider from user's email domain or other logic
            const provider =
              session.email.includes("@gmail.com") ||
              session.email.includes("@googlemail.com")
                ? "Google"
                : "Outlook";
            const meetingType =
              provider === "Outlook" ? "Teams" : "Google Meet";
            msg = `Meeting scheduled with ${meetingType}. Invites sent to ${attendeesCount} attendee${attendeesCount > 1 ? "s" : ""}`;
          }

          toast.success(msg);
          setIsScheduleMeetingOpen(false);

          // Show conflict information if there were conflicts
          if (conflicts.hasConflicts) {
            toast.warning(
              `Meeting created despite ${conflicts.conflictingEvents.length} conflicting event(s)`,
            );
          }
        }
      } catch (error) {
        console.error("Error scheduling meeting:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to schedule meeting";
        toast.error(errorMessage);
      }
    },
    [session?.email],
  );

  const handleAskAI = useCallback(() => {
    setIsAIMode((m) => !m);
    if (isAIMode) setIsAIGenerating(false);
  }, [isAIMode]);
  const handleCancelAI = useCallback(() => {
    setIsAIMode(false);
    setIsAIGenerating(false);
  }, []);
  const handleAIGenerate = useCallback(
    async (prompt: string): Promise<string> => {
      try {
        const updated = [
          ...conversationHistory,
          { role: "user" as const, content: prompt },
        ];
        setConversationHistory(updated);
        const cleanNestedHTML = (html: string) =>
          html
            .replace(/<p><p>/g, "<p>")
            .replace(/<\/p><\/p>/g, "</p>")
            .replace(/<p><\/p>/g, "")
            .replace(/<br><br>/g, "<br>");
        const res = await fetch("/api/ai-email-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            currentEmail: replyBody || "",
            recipients: recipients.map((r) => r.email),
            subject: subject || "",
            context: conversationHistory,
            isReply: !!(replyToMessageId || replyAllToMessageId),
            messageBeingRepliedTo:
              replyToMessageId || replyAllToMessageId
                ? messages.find(
                    (m) => m.id === (replyToMessageId || replyAllToMessageId),
                  )
                : null,
          }),
        });
        if (!res.ok) throw new Error("Failed to generate AI response");
        const data = await res.json();
        const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```|(\{[\s\S]*?\})/;
        const match = JSON.stringify(data).match(jsonRegex);
        let content = "";
        if (match) {
          try {
            const jsonString = match[1] || match[2];
            const parsed = JSON.parse(jsonString);
            content = parsed.emailContent || parsed.response || "";
          } catch {
            content = data.emailContent || data.response || "";
          }
        } else content = data.emailContent || data.response || "";
        setConversationHistory((prev) => [
          ...prev,
          { role: "assistant" as const, content },
        ]);
        return cleanNestedHTML(content);
      } catch (e) {
        console.error("AI error:", e);
        return "Sorry, I encountered an error. Please try again.";
      }
    },
    [
      conversationHistory,
      replyBody,
      recipients,
      subject,
      messages,
      replyToMessageId,
      replyAllToMessageId,
    ],
  );
  const handleAIInsert = useCallback(
    (content: string) => {
      const api = showPopup ? popupEditorApiRef.current : editorApiRef.current;
      setIsExpanded(true);
      if (api?.insertLLMContent && api?.clearContent) {
        api.clearContent();
        api.insertLLMContent(content);
        setReplyBody(content);
        scrollReplyIntoView();
        setTimeout(() => {
          setIsAIMode(false);
          toast.success("AI response generated successfully");
        }, 100);
      } else {
        setTimeout(() => {
          const retry = showPopup
            ? popupEditorApiRef.current
            : editorApiRef.current;
          if (retry?.insertLLMContent && retry?.clearContent) {
            retry.clearContent();
            retry.insertLLMContent(content);
            setReplyBody(content);
            scrollReplyIntoView();
            setTimeout(() => {
              setIsAIMode(false);
              toast.success("AI response generated successfully");
            }, 100);
          } else {
            setIsAIMode(false);
            toast.error("Failed to insert AI response");
          }
        }, 500);
      }
    },
    [showPopup, scrollReplyIntoView],
  );

  // ---------- Render ----------
  return (
    <>
      {/* Inline Reply */}
      <div
        className="rounded-lg border border-gray-200 bg-white shadow-sm"
        data-reply-section
      >
        {/* Header */}
        <div
          className="flex cursor-pointer items-center justify-between p-4 transition-colors"
          onClick={() => {
            const v = !isExpanded;
            setIsExpanded(v);
            if (v) scrollReplyIntoView();
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {isExpanded ? "Reply" : subject || "Reply"}
            </span>
            {isPredraftMode && predraftData && (
              <div className="flex items-center gap-1 rounded-full bg-purple-50 px-2 py-1 text-xs text-purple-600">
                <div className="h-2 w-2 rounded-full bg-purple-400" />
                <span>Followup Predraft</span>
              </div>
            )}
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <ChevronUp className="h-4 w-4 text-gray-500" />
          </motion.div>
        </div>

        {/* Body */}
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
            opacity: { duration: 0.2 },
          }}
          className="overflow-hidden"
          style={{
            visibility: isExpanded ? "visible" : "hidden",
            pointerEvents: isExpanded ? "auto" : "none",
          }}
        >
          <div className="space-y-4 border-t border-gray-200 p-4">
            {/* Recipients */}
            <RecipientSection
              recipients={recipients}
              ccRecipients={ccRecipients}
              bccRecipients={bccRecipients}
              onRecipientsChange={handleRecipientsChange}
              userInfo={{
                name: session?.name,
                email: session?.email,
              }}
            />

            {/* Subject */}
            <SubjectField
              value={subject}
              onChange={setSubject}
              emailBody={replyBody}
            />

            {/* Editor (hidden in AI mode) */}
            {!isAIMode && (
              <EditorWrapper
                editorRef={editorRef}
                onBodyChange={handleBodyChange}
                onFilesDropped={handleFilesDropped}
                onEditorReady={handleEditorReady}
              />
            )}

            {/* AI Prompt */}
            {isAIMode && (
              <AIPromptInput
                onGenerate={handleAIGenerate}
                onInsert={handleAIInsert}
                onCancel={handleCancelAI}
                isGenerating={isAIGenerating}
                setIsGenerating={setIsAIGenerating}
              />
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
              accept={DEFAULT_ALLOWED_TYPES.join(",")}
            />

            {/* Attachments UI */}
            {(attachments.length > 0 || uploadErrors.length > 0) && (
              <div className="attachment-section mb-2">
                {uploadErrors.length > 0 && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                    <ul className="space-y-1 text-sm text-red-600">
                      {uploadErrors.map((err, idx) => (
                        <li key={idx}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {attachments.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">
                        Attached Files ({attachments.length}/{MAX_FILES})
                      </h4>
                      <span className="text-xs text-gray-500">
                        Total: {formatFileSize(getTotalSize())}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between rounded-lg border bg-gray-50 p-3"
                        >
                          <div className="flex min-w-0 flex-1 items-center space-x-3">
                            {getFileIcon(att.type)}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {att.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(att.size)}
                              </p>
                            </div>
                            {att.url && (
                              <img
                                src={att.url}
                                alt={`Preview of ${att.name}`}
                                className="h-8 w-8 rounded object-cover"
                              />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="inline-flex h-8 w-8 items-center justify-center p-1 text-gray-400 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Predraft banner */}
            {isPredraftMode && predraftData && (
              <div className="mb-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-400" />
                    <span className="text-sm font-medium text-purple-700">
                      Followup Predraft Ready
                    </span>
                    <span className="text-xs text-purple-600">
                      Due: {new Date(predraftData.dueAt).toLocaleString()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelPredraft}
                    className="border-purple-300 text-purple-600 hover:bg-purple-100"
                  >
                    Cancel Followup
                  </Button>
                </div>
              </div>
            )}

            {/* Action bar */}
            <ActionBar
              onSend={handleSend}
              isSending={isSending}
              emailBody={replyBody}
              recipients={recipients}
              onScheduleFollowUp={handleScheduleFollowUp}
              onCancelFollowUp={handleCancelFollowUp}
              isFollowUpScheduled={followUpScheduled}
              followUpDuration={followUpDuration}
              onAttachFile={handleAttachFile}
              onScheduleMeeting={handleScheduleMeeting}
              onAskAI={handleAskAI}
              isAIEnabled={isAIMode}
              onCancel={
                replyToMessageId
                  ? () => {
                      setIsExpanded(false);
                      setReplyBody("");
                      setRecipients([]);
                      setCcRecipients([]);
                      setBccRecipients([]);
                      setSubject("");
                      editorApiRef.current?.clearContent?.();
                      popupEditorApiRef.current?.clearContent?.();
                      onReplyCancel?.();
                    }
                  : undefined
              }
              showCancel={!!replyToMessageId}
              context="reply"
            />
          </div>
        </motion.div>
      </div>

      <div ref={replyAnchorRef} />

      <GiphySelector
        isOpen={showGiphySelector}
        onClose={() => setShowGiphySelector(false)}
        onSelect={handleGifSelect}
      />

      <EnhancedScheduleMeetingPopup
        isOpen={isScheduleMeetingOpen}
        onClose={() => setIsScheduleMeetingOpen(false)}
        onSave={handleMeetingSave}
        participants={getAllThreadParticipants(messages)}
        emailDateHeaders={getAllThreadEmailDateHeaders(messages)}
      />
    </>
  );
}
