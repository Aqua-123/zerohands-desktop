import React, { useState, useEffect } from "react";
import EmailList from "./EmailList";
import EmailContent from "./EmailContent";
import EmailCompose from "./EmailCompose";
import { EmailThread, EmailMessage } from "../services/email";
import { WebSocketClient } from "../services/websocket-client";

interface EmailInterfaceProps {
  userEmail: string;
}

export default function EmailInterface({ userEmail }: EmailInterfaceProps) {
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isLoadingEmails, setIsLoadingEmails] = useState(true);
  const [isLoadingMoreEmails, setIsLoadingMoreEmails] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(
    undefined,
  );
  const [hasMoreEmails, setHasMoreEmails] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [wsClient, setWsClient] = useState<WebSocketClient | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    loadEmails();
    setupWebSocketConnection();
  }, [userEmail]);

  useEffect(() => {
    if (selectedEmailId) {
      loadEmailContent(selectedEmailId);
    } else {
      setSelectedEmail(null);
    }
  }, [selectedEmailId]);

  useEffect(() => {
    // Cleanup WebSocket connection on unmount
    return () => {
      if (wsClient) {
        wsClient.disconnect();
      }
    };
  }, [wsClient]);

  const loadEmails = async (reset: boolean = true) => {
    try {
      if (reset) {
        setIsLoadingEmails(true);
        setEmails([]);
        setNextPageToken(undefined);
        setHasMoreEmails(true);
      } else {
        setIsLoadingMoreEmails(true);
      }
      setError(null);

      if (!window.email) {
        throw new Error("Email service not available");
      }

      const result = await window.email.getInboxEmails(
        userEmail,
        nextPageToken,
      );

      if (reset) {
        setEmails(result.emails);
      } else {
        setEmails((prevEmails) => [...prevEmails, ...result.emails]);
      }

      setNextPageToken(result.nextPageToken);
      setHasMoreEmails(!!result.nextPageToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load emails");
      console.error("Error loading emails:", err);
    } finally {
      setIsLoadingEmails(false);
      setIsLoadingMoreEmails(false);
    }
  };

  const loadEmailContent = async (emailId: string) => {
    try {
      setIsLoadingContent(true);
      setError(null);

      if (!window.email) {
        throw new Error("Email service not available");
      }

      const emailContent = await window.email.getEmailContent(
        userEmail,
        emailId,
      );
      setSelectedEmail(emailContent);

      // Mark email as read if it's unread
      const emailThread = emails.find((email) => email.id === emailId);
      if (emailThread && !emailThread.isRead) {
        try {
          await window.email.markEmailAsRead(userEmail, emailId);

          // Update local state to reflect the email is now read
          setEmails((prevEmails) =>
            prevEmails.map((email) =>
              email.id === emailId ? { ...email, isRead: true } : email,
            ),
          );
        } catch (markAsReadError) {
          console.error("Error marking email as read:", markAsReadError);
          // Don't throw here - we still want to show the email content
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load email content",
      );
      console.error("Error loading email content:", err);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleEmailSelect = (emailId: string) => {
    setSelectedEmailId(emailId);
  };

  const handleRefresh = () => {
    loadEmails(true);
  };

  const handleLoadMore = () => {
    if (hasMoreEmails && !isLoadingMoreEmails) {
      loadEmails(false);
    }
  };

  const setupWebSocketConnection = async () => {
    try {
      // Create WebSocket client
      const client = new WebSocketClient("wss://hooks.futurixai.com");

      // Set up event listeners
      client.on("connected", () => {
        console.log("🔌 Connected to notification server");
        setWsConnected(true);
      });

      client.on("disconnected", () => {
        console.log("🔌 Disconnected from notification server");
        setWsConnected(false);
      });

      client.on("registered", (data) => {
        console.log("✅ Registered for notifications:", data.userEmail);
      });

      client.on("newEmail", (notification) => {
        console.log("📧 New email notification:", notification);
        // Refresh emails when we receive a notification
        loadEmails(true);
      });

      client.on("error", (error) => {
        console.error("WebSocket error:", error);
        setWsConnected(false);
      });

      // Connect to the WebSocket server
      await client.connect("user123", userEmail); // You might want to use actual user ID
      setWsClient(client);

      // Setup push notifications with the WebSocket server URL
      await setupPushNotifications();
    } catch (error) {
      console.error("Error setting up WebSocket connection:", error);
      setWsConnected(false);
    }
  };

  const setupPushNotifications = async () => {
    try {
      if (!window.email) return;

      // Use the WebSocket server as the webhook endpoint
      const webhookUrl = "https://hooks.futurixai.com/webhook";

      // Setup push notifications based on the user's provider
      try {
        await window.email.setupGmailPushNotifications(userEmail);
      } catch (gmailError) {
        console.log("Gmail push notifications not available:", gmailError);
      }

      try {
        await window.email.setupOutlookWebhook(userEmail, webhookUrl);
      } catch (outlookError) {
        console.log("Outlook webhook not available:", outlookError);
      }
    } catch (error) {
      console.error("Error setting up push notifications:", error);
    }
  };

  const handleSendEmail = async (
    to: string,
    subject: string,
    body: string,
    isHtml: boolean,
  ) => {
    try {
      setIsSendingEmail(true);
      setError(null);

      if (!window.email) {
        throw new Error("Email service not available");
      }

      await window.email.sendEmail(userEmail, to, subject, body, isHtml);
      setShowCompose(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
      throw err;
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleComposeCancel = () => {
    setShowCompose(false);
  };

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-white dark:bg-gray-800">
        <div className="text-center">
          <svg
            className="mx-auto h-16 w-16 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Error loading emails
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {error}
          </p>
          <button
            onClick={handleRefresh}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (showCompose) {
    return (
      <EmailCompose
        userEmail={userEmail}
        onSend={handleSendEmail}
        onCancel={handleComposeCancel}
        isSending={isSendingEmail}
      />
    );
  }

  return (
    <div className="flex h-full bg-white dark:bg-gray-800">
      {/* Connection Status Indicator */}
      {!wsConnected && (
        <div className="absolute top-4 right-4 z-10 rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
            <span>Connecting to notification server...</span>
          </div>
        </div>
      )}

      {/* Email List - Left Side */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
        <EmailList
          emails={emails}
          selectedEmailId={selectedEmailId}
          onEmailSelect={handleEmailSelect}
          isLoading={isLoadingEmails}
          isLoadingMore={isLoadingMoreEmails}
          hasMoreEmails={hasMoreEmails}
          onLoadMore={handleLoadMore}
          onCompose={() => setShowCompose(true)}
        />
      </div>

      {/* Email Content - Right Side */}
      <div className="flex-1">
        <EmailContent email={selectedEmail} isLoading={isLoadingContent} />
      </div>
    </div>
  );
}
