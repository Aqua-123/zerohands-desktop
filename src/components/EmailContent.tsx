import React, { useState, useEffect } from "react";
import { EmailMessage } from "../services/email";
import ThreadReply from "./Compose/ThreadReply";

interface EmailContentProps {
  email: EmailMessage | null;
  isLoading?: boolean;
  userEmail?: string;
}

export default function EmailContent({
  email,
  isLoading = false,
  userEmail,
}: EmailContentProps) {
  const [threadEmails, setThreadEmails] = useState<EmailMessage[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);
  const [replyAllToMessageId, setReplyAllToMessageId] = useState<string | null>(
    null,
  );

  // Load thread emails when email changes
  useEffect(() => {
    if (email && userEmail) {
      loadThreadEmails();
    } else {
      setThreadEmails([]);
    }
  }, [email, userEmail]);

  const loadThreadEmails = async () => {
    if (!email || !userEmail) return;

    setIsLoadingThread(true);
    try {
      // Import the email service dynamically to avoid circular dependencies
      const { EmailService } = await import("../services/email");
      const emailService = new EmailService();
      const emails = await emailService.getThreadEmails(
        userEmail,
        email.threadId,
      );
      setThreadEmails(emails);
    } catch (error) {
      console.error("Error loading thread emails:", error);
      // Fallback to showing just the current email
      setThreadEmails([email]);
    } finally {
      setIsLoadingThread(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSenderInitials = (sender: string) => {
    return sender
      .split(" ")
      .map((name) => name.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="animate-pulse">
            <div className="h-6 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="mt-4 flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-4 w-4/5 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex h-full items-center justify-center bg-white dark:bg-gray-800">
        <div className="text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Select an email
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Choose an email from the list to view its content
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {email.subject}
            </h1>
            <div className="mt-4 flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-200">
                {getSenderInitials(email.sender)}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {email.sender}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    &lt;{email.senderEmail}&gt;
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <span>To: {email.recipientEmail}</span>
                </div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(email.timestamp)}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
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
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            </button>
            <button className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
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
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            </button>
            <button className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
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
                  d="M5 8l6 6m0 0l6-6m-6 6V4"
                />
              </svg>
            </button>
            <button className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Thread Messages */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800">
        {isLoadingThread ? (
          <div className="flex items-center justify-center p-6">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              Loading thread...
            </span>
          </div>
        ) : (
          <div className="space-y-0">
            {threadEmails.map((threadEmail, index) => (
              <div
                key={threadEmail.id}
                className={`border-b border-gray-200 p-6 dark:border-gray-700 ${
                  index === 0
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "bg-white dark:bg-gray-800"
                }`}
              >
                {/* Message Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-200">
                      {getSenderInitials(threadEmail.sender)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {threadEmail.sender}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          &lt;{threadEmail.senderEmail}&gt;
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(threadEmail.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {index === 0 && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Latest
                      </span>
                    )}
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setReplyToMessageId(threadEmail.id)}
                        className="rounded-lg px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        Reply
                      </button>
                      <button
                        onClick={() => setReplyAllToMessageId(threadEmail.id)}
                        className="rounded-lg px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        Reply All
                      </button>
                    </div>
                  </div>
                </div>

                {/* Message Body */}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {threadEmail.htmlBody ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: threadEmail.htmlBody }}
                      className="text-gray-900 dark:text-white"
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-gray-900 dark:text-white">
                      {threadEmail.body}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply Section */}
      {email && (
        <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <ThreadReply
            messages={threadEmails.map((msg) => ({
              ...msg,
              fromAddress: msg.senderEmail,
              fromName: msg.sender,
              toAddresses: [msg.recipientEmail],
              ccAddresses: [],
              bccAddresses: [],
              date: msg.timestamp.toISOString(),
              snippet: msg.body.substring(0, 100),
              labels: [],
            }))}
            threadId={email.threadId}
            replyToMessageId={replyToMessageId}
            replyAllToMessageId={replyAllToMessageId}
            onReplyCancel={() => {
              setReplyToMessageId(null);
              setReplyAllToMessageId(null);
            }}
            onThreadRefresh={() => {
              // Refresh the thread when a reply is sent
              console.log("Thread refresh requested");
              setReplyToMessageId(null);
              setReplyAllToMessageId(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
