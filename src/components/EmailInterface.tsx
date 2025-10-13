import React, { useState, useEffect } from "react";
import EmailList from "./EmailList";
import EmailContent from "./EmailContent";
import EmailCompose from "./EmailCompose";
import { EmailThread, EmailMessage } from "../services/email";
import { WebSocketClient } from "../services/websocket-client";

export type EmailSection = "all" | "important" | "vip";

interface EmailInterfaceProps {
  userEmail: string;
  userProvider?: string;
  section?: EmailSection;
}

export default function EmailInterface({
  userEmail,
  userProvider,
  section = "all",
}: EmailInterfaceProps) {
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
  const [dbOffset, setDbOffset] = useState(0);
  const [showCompose, setShowCompose] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [wsClient, setWsClient] = useState<WebSocketClient | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsConnectionError, setWsConnectionError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    console.log(
      `[EMAIL_INTERFACE] Initializing email interface for user: ${userEmail}`,
    );
    initializeEmailClient();
  }, [userEmail]);

  const initializeEmailClient = async () => {
    try {
      console.log(
        `[EMAIL_INTERFACE] Starting local-first email client initialization`,
      );

      // Step 1: Load emails from database first (local-first approach)
      await loadEmails();

      // Step 2: Perform incremental sync to get any new emails
      await performIncrementalSync();

      // Step 3: Setup real-time connections (WebSocket only)
      setupWebSocketConnection();

      console.log(`[EMAIL_INTERFACE] Email client initialization completed`);
    } catch (error) {
      console.error(
        `[EMAIL_INTERFACE] Error during email client initialization:`,
        error,
      );
    }
  };

  const performIncrementalSync = async () => {
    try {
      console.log(
        `[EMAIL_INTERFACE] Starting incremental sync for user: ${userEmail}`,
      );

      if (!window.email) {
        console.log("[EMAIL_INTERFACE] Email service not available");
        return;
      }

      const result = await window.email.performIncrementalSync(userEmail, 50);

      console.log(
        `[EMAIL_INTERFACE] Incremental sync completed - Found ${result.newEmailsCount} new emails out of ${result.totalEmailsCount} total`,
      );

      // If we found new emails, reload the email list to show them
      if (result.newEmailsCount > 0) {
        console.log(
          `[EMAIL_INTERFACE] Reloading emails to show ${result.newEmailsCount} new emails`,
        );
        await loadEmails();
      }
    } catch (error) {
      console.error(
        `[EMAIL_INTERFACE] Error during incremental sync for user ${userEmail}:`,
        error,
      );
    }
  };

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
        setDbOffset(0);
      } else {
        setIsLoadingMoreEmails(true);
      }
      setError(null);

      if (!window.email) {
        throw new Error("Email service not available");
      }

      // Fetch emails based on section type
      try {
        let dbResult: { emails: EmailThread[]; hasMore: boolean };

        // Choose the appropriate fetching method based on section
        if (section === "important") {
          console.log(`[EMAIL_INTERFACE] Fetching IMPORTANT emails from DB`);
          dbResult = await window.email.getImportantEmailsFromDB(
            userEmail,
            25,
            reset ? 0 : emails.length,
          );
        } else if (section === "vip") {
          console.log(`[EMAIL_INTERFACE] Fetching VIP emails from DB`);
          dbResult = await window.email.getVIPEmailsFromDB(
            userEmail,
            25,
            reset ? 0 : emails.length,
          );
        } else {
          // section === "all"
          console.log(`[EMAIL_INTERFACE] Fetching ALL emails from DB`);
          dbResult = await window.email.getInboxEmailsFromDB(
            userEmail,
            25,
            reset ? 0 : emails.length,
          );
        }

        console.log(
          `[EMAIL_INTERFACE] Database returned ${dbResult.emails.length} emails for section: ${section}`,
        );

        // For Important section, ONLY use DB (no API fetching)
        // For VIP and All sections, fetch from API if DB is empty
        const shouldFetchFromAPI =
          section !== "important" && dbResult.emails.length === 0 && reset;

        if (shouldFetchFromAPI) {
          console.log(
            `[EMAIL_INTERFACE] Database is empty for section ${section}, fetching from API`,
          );

          const result = await window.email.getInboxEmails(
            userEmail,
            nextPageToken,
          );

          console.log(
            `[EMAIL_INTERFACE] API returned ${result.emails.length} emails`,
          );

          if (reset) {
            // Sort emails by timestamp (newest first) when resetting
            const sortedEmails = result.emails.sort(
              (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
            );
            setEmails(sortedEmails);
          } else {
            // Merge and deduplicate emails, then sort
            setEmails((prevEmails) => {
              const emailMap = new Map<string, EmailThread>();

              // Add existing emails
              prevEmails.forEach((email) => {
                emailMap.set(email.id, email);
              });

              // Add new emails (will overwrite duplicates)
              result.emails.forEach((email) => {
                emailMap.set(email.id, email);
              });

              // Convert back to sorted array
              return Array.from(emailMap.values()).sort(
                (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
              );
            });
          }

          setNextPageToken(result.nextPageToken);
          setHasMoreEmails(!!result.nextPageToken);
        } else {
          // Use database results
          if (reset) {
            // Sort emails by timestamp (newest first) when resetting
            const sortedEmails = dbResult.emails.sort(
              (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
            );
            setEmails(sortedEmails);
            setDbOffset(dbResult.emails.length);
          } else {
            // Merge and deduplicate emails, then sort
            setEmails((prevEmails) => {
              const emailMap = new Map<string, EmailThread>();

              // Add existing emails
              prevEmails.forEach((email) => {
                emailMap.set(email.id, email);
              });

              // Add new emails (will overwrite duplicates)
              dbResult.emails.forEach((email) => {
                emailMap.set(email.id, email);
              });

              // Convert back to sorted array
              return Array.from(emailMap.values()).sort(
                (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
              );
            });
            setDbOffset((prevOffset) => prevOffset + dbResult.emails.length);
          }

          // For Important: only DB, no API fallback
          // For All/VIP: allow API fallback
          if (section === "important") {
            setHasMoreEmails(dbResult.hasMore);
          } else {
            setHasMoreEmails(dbResult.hasMore || !!nextPageToken);
          }
        }
      } catch (dbError) {
        console.log(
          `[EMAIL_INTERFACE] Database error for section ${section}:`,
          dbError,
        );

        // For Important section, don't fetch from API on error
        if (section === "important") {
          console.log(
            "[EMAIL_INTERFACE] Important section - not fetching from API",
          );
          setEmails([]);
          setHasMoreEmails(false);
          throw dbError;
        }

        // If database error, fetch from API (for All/VIP sections only)
        const result = await window.email.getInboxEmails(
          userEmail,
          nextPageToken,
        );

        console.log(
          `[EMAIL_INTERFACE] API returned ${result.emails.length} emails after database error`,
        );

        if (reset) {
          // Sort emails by timestamp (newest first) when resetting
          const sortedEmails = result.emails.sort(
            (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
          );
          setEmails(sortedEmails);
        } else {
          // Merge and deduplicate emails, then sort
          setEmails((prevEmails) => {
            const emailMap = new Map<string, EmailThread>();

            // Add existing emails
            prevEmails.forEach((email) => {
              emailMap.set(email.id, email);
            });

            // Add new emails (will overwrite duplicates)
            result.emails.forEach((email) => {
              emailMap.set(email.id, email);
            });

            // Convert back to sorted array
            return Array.from(emailMap.values()).sort(
              (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
            );
          });
        }

        setNextPageToken(result.nextPageToken);
        setHasMoreEmails(!!result.nextPageToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load emails");
      console.error("Error loading emails:", err);
    } finally {
      setIsLoadingEmails(false);
      setIsLoadingMoreEmails(false);
    }
  };

  const loadMoreEmails = async () => {
    if (!hasMoreEmails) return; // Remove isLoadingMoreEmails check to allow concurrent loading

    console.log(
      `[EMAIL_INTERFACE] Loading more emails - current count: ${emails.length}, dbOffset: ${dbOffset}, hasMore: ${hasMoreEmails}`,
    );

    try {
      setIsLoadingMoreEmails(true);

      if (!window.email) {
        throw new Error("Email service not available");
      }

      // Continuously fetch from database until exhausted or we have enough emails
      let currentOffset = dbOffset;
      let totalEmailsAdded = 0;
      const maxEmailsToFetch = 50; // Limit to prevent infinite loops
      let shouldContinue = true;

      while (shouldContinue && totalEmailsAdded < maxEmailsToFetch) {
        try {
          const dbResult = await window.email.getInboxEmailsFromDB(
            userEmail,
            25,
            currentOffset,
          );

          console.log(
            `[EMAIL_INTERFACE] Database returned ${dbResult.emails.length} emails, hasMore: ${dbResult.hasMore}, offset: ${currentOffset}`,
          );

          if (dbResult.emails.length > 0) {
            // Merge emails into state
            setEmails((prevEmails) => {
              const emailMap = new Map<string, EmailThread>();

              // Add existing emails
              prevEmails.forEach((email) => {
                emailMap.set(email.id, email);
              });

              // Add new emails (will overwrite duplicates)
              dbResult.emails.forEach((email) => {
                emailMap.set(email.id, email);
              });

              // Convert back to sorted array
              return Array.from(emailMap.values()).sort(
                (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
              );
            });

            currentOffset += dbResult.emails.length;
            totalEmailsAdded += dbResult.emails.length;

            console.log(
              `[EMAIL_INTERFACE] Added ${dbResult.emails.length} emails, total added: ${totalEmailsAdded}, new offset: ${currentOffset}`,
            );

            // Update the database offset state
            setDbOffset(currentOffset);

            // Check if we should continue
            if (dbResult.hasMore && totalEmailsAdded < maxEmailsToFetch) {
              console.log(
                `[EMAIL_INTERFACE] Database still has more emails, continuing fetch...`,
              );
              // Continue the loop
            } else {
              // Database exhausted or we've fetched enough
              shouldContinue = false;
              if (dbResult.hasMore) {
                console.log(
                  `[EMAIL_INTERFACE] Database still has more but reached fetch limit (${maxEmailsToFetch})`,
                );
                setHasMoreEmails(true);
              } else {
                console.log(
                  `[EMAIL_INTERFACE] Database exhausted, checking API fallback`,
                );
                setHasMoreEmails(!!nextPageToken);
              }
            }
          } else {
            // No emails returned
            shouldContinue = false;
            console.log(
              `[EMAIL_INTERFACE] No emails returned from database, checking API fallback`,
            );
            setHasMoreEmails(!!nextPageToken);
          }
        } catch (dbError) {
          console.log(
            `[EMAIL_INTERFACE] Database error during continuous fetch:`,
            dbError,
          );
          shouldContinue = false;
          // Fall through to API fallback
        }
      }

      // If database is exhausted or we had an error, try API fallback
      if (!shouldContinue || totalEmailsAdded === 0) {
        console.log(
          `[EMAIL_INTERFACE] Database exhausted or error occurred, trying API fallback`,
        );

        const result = await window.email.getInboxEmails(
          userEmail,
          nextPageToken,
          20, // Load 20 more emails
        );

        console.log(
          `[EMAIL_INTERFACE] Email provider returned ${result.emails.length} more emails`,
        );

        if (result.emails.length > 0) {
          // The onEmailSaved callback in the IPC listener will handle individual email notifications
          // We just need to update the pagination state here
          setNextPageToken(result.nextPageToken);
          setHasMoreEmails(!!result.nextPageToken);

          console.log(
            `[EMAIL_INTERFACE] ${result.emails.length} emails will be processed and rendered via notifications`,
          );

          // Give a small delay to allow emails to be processed and notifications to be sent
          setTimeout(() => {
            console.log(
              `[EMAIL_INTERFACE] Checking if emails were processed and rendered`,
            );
          }, 1000);
        } else {
          // Email provider has no more emails - this is the ground truth
          setHasMoreEmails(false);
          console.log(
            `[EMAIL_INTERFACE] Email provider confirms no more emails available`,
          );
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load more emails",
      );
      console.error("Error loading more emails:", err);
    } finally {
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

  const handleLoadMore = () => {
    loadMoreEmails();
  };

  const handleRefresh = () => {
    loadEmails(true);
  };

  const setupWebSocketConnection = async () => {
    try {
      // Create WebSocket client
      const client = new WebSocketClient("wss://hooks.futurixai.com");

      // Set up event listeners
      client.on("connected", () => {
        console.log("🔌 Connected to notification server");
        setWsConnected(true);
        setWsConnectionError(null);
      });

      client.on("disconnected", () => {
        console.log("🔌 Disconnected from notification server");
        setWsConnected(false);
      });

      client.on("registered", (data: unknown) => {
        const registrationData = data as { userEmail: string };
        console.log(
          "✅ Registered for notifications:",
          registrationData.userEmail,
        );
      });

      client.on("newEmail", (notification: unknown) => {
        console.log("📧 New email notification:", notification);
        // Perform incremental sync to get new emails when we receive a notification
        performIncrementalSync();
      });

      client.on("error", (error) => {
        console.error("WebSocket error:", error);
        setWsConnected(false);
        setWsConnectionError(
          error instanceof Error ? error.message : "Connection failed",
        );
      });

      // Connect to the WebSocket server
      await client.connect(userEmail, userEmail); // Use email as both userId and userEmail
      setWsClient(client);

      // Setup push notifications with the WebSocket server URL
      await setupPushNotifications();
    } catch (error) {
      console.error("Error setting up WebSocket connection:", error);
      setWsConnected(false);
      setWsConnectionError(
        error instanceof Error ? error.message : "Failed to setup connection",
      );
    }
  };

  const setupPushNotifications = async () => {
    try {
      if (!window.email) return;

      const webhookUrl = "https://hooks.futurixai.com/webhook";

      if (userProvider === "google") {
        try {
          await window.email.setupGmailPushNotifications(userEmail);
        } catch (gmailError) {
          console.log("Gmail push notifications not available:", gmailError);
        }
      } else if (userProvider === "outlook") {
        try {
          await window.email.setupOutlookWebhook(userEmail, webhookUrl);
        } catch (outlookError) {
          console.log("Outlook webhook not available:", outlookError);
        }
      } else {
        console.log(
          `Push notifications not supported for provider: ${userProvider}`,
        );
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
      {/* Status Indicators */}
      <div className="absolute top-4 right-4 z-10 space-y-2">
        {!wsConnected && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500"></div>
              <span>
                {wsConnectionError
                  ? `Connection failed: ${wsConnectionError}`
                  : "Connecting to notification server..."}
              </span>
            </div>
          </div>
        )}
        {wsConnected && (
          <div className="rounded-lg border border-green-300 bg-green-100 px-3 py-2 text-sm text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-200">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span>Connected to notification server</span>
            </div>
          </div>
        )}
      </div>

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
        <EmailContent
          email={selectedEmail}
          isLoading={isLoadingContent}
          userEmail={userEmail}
        />
      </div>
    </div>
  );
}
