import React, { useEffect, useRef, useCallback } from "react";
import { EmailThread } from "../services/email";

interface EmailListProps {
  emails: EmailThread[];
  selectedEmailId: string | null;
  onEmailSelect: (emailId: string) => void;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMoreEmails?: boolean;
  onLoadMore?: () => void;
  onCompose?: () => void;
}

export default function EmailList({
  emails,
  selectedEmailId,
  onEmailSelect,
  isLoading = false,
  isLoadingMore = false,
  hasMoreEmails = false,
  onLoadMore,
  onCompose,
}: EmailListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoLoadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Infinite scroll logic - Auto-trigger even if previous load is still in progress
  const handleScroll = useCallback(() => {
    if (!hasMoreEmails || !onLoadMore) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 200; // 200px threshold

    console.log(
      `[EMAIL_LIST] Scroll check: scrollTop=${scrollTop}, scrollHeight=${scrollHeight}, clientHeight=${clientHeight}, isNearBottom=${isNearBottom}, hasMore=${hasMoreEmails}, isLoading=${isLoadingMore}`,
    );

    if (isNearBottom) {
      console.log(
        `[EMAIL_LIST] 🔄 Auto-triggering load more due to scroll (regardless of loading state)`,
      );
      onLoadMore();
    }
  }, [hasMoreEmails, onLoadMore, isLoadingMore]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Check if we need to load more emails when component mounts or emails change - Auto-trigger regardless of loading state
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !hasMoreEmails || !onLoadMore) return;

    // Check if the container is not full and we have more emails to load
    const { scrollHeight, clientHeight } = container;
    const isNotFull = scrollHeight <= clientHeight;

    console.log(
      `[EMAIL_LIST] Auto-load check: scrollHeight=${scrollHeight}, clientHeight=${clientHeight}, isNotFull=${isNotFull}, emailsCount=${emails.length}, isLoading=${isLoadingMore}`,
    );

    if (isNotFull && emails.length > 0) {
      console.log(
        `[EMAIL_LIST] 🔄 Auto-triggering load more - container not full (regardless of loading state)`,
      );
      onLoadMore();
    }
  }, [emails.length, hasMoreEmails, onLoadMore, isLoadingMore]);

  // Continuous auto-load mechanism - keeps loading until container is full or no more emails
  useEffect(() => {
    if (!hasMoreEmails || !onLoadMore) {
      // Clear any existing interval if no more emails
      if (autoLoadIntervalRef.current) {
        clearInterval(autoLoadIntervalRef.current);
        autoLoadIntervalRef.current = null;
      }
      return;
    }

    const checkAndLoadMore = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const { scrollHeight, clientHeight } = container;
      const isNotFull = scrollHeight <= clientHeight + 50; // 50px buffer

      console.log(
        `[EMAIL_LIST] Continuous check: scrollHeight=${scrollHeight}, clientHeight=${clientHeight}, isNotFull=${isNotFull}, hasMore=${hasMoreEmails}`,
      );

      if (isNotFull && emails.length > 0) {
        console.log(`[EMAIL_LIST] 🔄 Continuous auto-load triggered`);
        onLoadMore();
      }
    };

    // Start continuous checking every 500ms
    autoLoadIntervalRef.current = setInterval(checkAndLoadMore, 500);

    // Also check immediately
    checkAndLoadMore();

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (autoLoadIntervalRef.current) {
        clearInterval(autoLoadIntervalRef.current);
        autoLoadIntervalRef.current = null;
      }
    };
  }, [emails.length, hasMoreEmails, onLoadMore]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
      if (autoLoadIntervalRef.current) {
        clearInterval(autoLoadIntervalRef.current);
      }
    };
  }, []);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 168) {
      // 7 days
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const getSenderInitials = (sender: string) => {
    return sender
      .split(" ")
      .map((name) => name.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getSenderIcon = (sender: string, isImportant: boolean) => {
    if (isImportant) {
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-xs font-medium text-red-600 dark:bg-red-900 dark:text-red-200">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    }

    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-200">
        {getSenderInitials(sender)}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div>
            <div className="flex-1">
              <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2 p-2">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-gray-200 p-3 dark:border-gray-700"
            >
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
                  <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
                  <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center space-x-3">
          <button className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg
              className="h-5 w-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search in important..."
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>
          <button
            onClick={onCompose}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-gray-800"
          >
            <svg
              className="mr-1 inline h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Compose
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-3 flex space-x-1">
          {["All", "Important", "VIP", "Follow-Up"].map((tab) => (
            <button
              key={tab}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === "Important"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Email List */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="mt-2">No emails found</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {emails.map((email) => (
              <div
                key={email.id}
                onClick={() => onEmailSelect(email.id)}
                className={`cursor-pointer rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedEmailId === email.id
                    ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                } ${!email.isRead ? "font-semibold" : ""}`}
              >
                <div className="flex items-start space-x-3">
                  {getSenderIcon(email.sender, email.isImportant)}

                  {/* Unread marker */}
                  {!email.isRead && (
                    <div className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-blue-600 shadow-sm"></div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-sm ${!email.isRead ? "font-semibold" : "font-medium"} text-gray-900 dark:text-white`}
                        >
                          {email.sender}
                        </span>
                        {email.hasAttachments && (
                          <svg
                            className="h-4 w-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(email.timestamp)}
                      </span>
                    </div>

                    <div className="mt-1">
                      <p
                        className={`text-sm ${!email.isRead ? "font-semibold" : ""} text-gray-900 dark:text-white`}
                      >
                        {email.subject}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
                        {email.preview}
                      </p>

                      {/* Labels */}
                      {email.labels && email.labels.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {email.labels.map((label, index) => (
                            <span
                              key={index}
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                label === "important"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  : label === "marketing"
                                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                    : label === "credentials"
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                      : label === "social"
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                        : label === "news"
                                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                          : label === "meeting"
                                            ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                                            : label === "pitch"
                                              ? "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
                                              : label === "github"
                                                ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                                : label === "invoice"
                                                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                                  : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                              }`}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator for more emails */}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-sm">Loading more emails...</span>
                </div>
              </div>
            )}

            {/* Load More Button */}
            {hasMoreEmails && !isLoadingMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={onLoadMore}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-gray-800"
                >
                  Load More Emails
                </button>
              </div>
            )}

            {/* End of emails indicator */}
            {!hasMoreEmails && emails.length > 0 && (
              <div className="flex justify-center py-4">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  No more emails to load
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
