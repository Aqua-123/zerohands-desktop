import { contextBridge, ipcRenderer } from "electron";
import { EMAIL_CHANNELS } from "./email-channels";
import type { EmailThread, EmailMessage } from "../../../services/email";

export interface EmailContext {
  getInboxEmails: (
    userEmail: string,
    pageToken?: string,
    maxResults?: number,
  ) => Promise<{ emails: EmailThread[]; nextPageToken?: string }>;
  getEmailContent: (
    userEmail: string,
    messageId: string,
  ) => Promise<EmailMessage>;
  getThreadEmails: (
    userEmail: string,
    threadId: string,
  ) => Promise<EmailMessage[]>;
  markEmailAsRead: (userEmail: string, messageId: string) => Promise<void>;
  sendEmail: (
    userEmail: string,
    to: string,
    subject: string,
    body: string,
    isHtml?: boolean,
  ) => Promise<void>;
  setupGmailPushNotifications: (userEmail: string) => Promise<void>;
  setupOutlookWebhook: (userEmail: string, webhookUrl: string) => Promise<void>;
  getInboxEmailsFromDB: (
    userEmail: string,
    limit?: number,
    offset?: number,
  ) => Promise<{ emails: EmailThread[]; hasMore: boolean }>;
  processAndLabelEmails: (
    userEmail: string,
    onEmailProcessed?: (email: EmailThread) => void,
  ) => Promise<void>;
  performIncrementalSync: (
    userEmail: string,
    maxResults?: number,
  ) => Promise<{ newEmailsCount: number; totalEmailsCount: number }>;
  performInitialSync: (
    userEmail: string,
    onEmailProcessed?: (email: EmailThread) => void,
  ) => Promise<{ newEmailsCount: number; totalEmailsCount: number }>;
  updateMessageLabels: (
    userEmail: string,
    messageId: string,
    labels: string[],
    operation?: "add" | "remove" | "replace",
  ) => Promise<{ success: boolean }>;
  onEmailError: (callback: (error: string) => void) => void;
  onNewEmailNotification: (
    callback: (data: { userEmail: string; newEmails: EmailThread[] }) => void,
  ) => void;
  onInitialSyncProgress: (
    callback: (data: {
      userEmail: string;
      progress: { processed: number; total: number; currentEmail: string };
    }) => void,
  ) => void;
}

const emailContext: EmailContext = {
  getInboxEmails: (
    userEmail: string,
    pageToken?: string,
    maxResults?: number,
  ) =>
    ipcRenderer.invoke(
      EMAIL_CHANNELS.GET_INBOX_EMAILS,
      userEmail,
      pageToken,
      maxResults,
    ),
  getEmailContent: (userEmail: string, messageId: string) =>
    ipcRenderer.invoke(EMAIL_CHANNELS.GET_EMAIL_CONTENT, userEmail, messageId),
  getThreadEmails: (userEmail: string, threadId: string) =>
    ipcRenderer.invoke(EMAIL_CHANNELS.GET_THREAD_EMAILS, userEmail, threadId),
  markEmailAsRead: (userEmail: string, messageId: string) =>
    ipcRenderer.invoke(EMAIL_CHANNELS.MARK_EMAIL_AS_READ, userEmail, messageId),
  sendEmail: (
    userEmail: string,
    to: string,
    subject: string,
    body: string,
    isHtml: boolean = false,
  ) =>
    ipcRenderer.invoke(
      EMAIL_CHANNELS.SEND_EMAIL,
      userEmail,
      to,
      subject,
      body,
      isHtml,
    ),
  setupGmailPushNotifications: (userEmail: string) =>
    ipcRenderer.invoke(
      EMAIL_CHANNELS.SETUP_GMAIL_PUSH_NOTIFICATIONS,
      userEmail,
    ),
  setupOutlookWebhook: (userEmail: string, webhookUrl: string) =>
    ipcRenderer.invoke(
      EMAIL_CHANNELS.SETUP_OUTLOOK_WEBHOOK,
      userEmail,
      webhookUrl,
    ),
  getInboxEmailsFromDB: (userEmail: string, limit?: number, offset?: number) =>
    ipcRenderer.invoke(
      EMAIL_CHANNELS.GET_INBOX_EMAILS_FROM_DB,
      userEmail,
      limit,
      offset,
    ),
  processAndLabelEmails: (
    userEmail: string,
    onEmailProcessed?: (email: EmailThread) => void,
  ) => {
    // Set up listener for processed emails if callback provided
    if (onEmailProcessed) {
      const listener = (_: unknown, processedEmail: EmailThread) => {
        onEmailProcessed(processedEmail);
      };
      ipcRenderer.on(EMAIL_CHANNELS.NEW_EMAIL_NOTIFICATION, listener);
    }

    return ipcRenderer.invoke(
      EMAIL_CHANNELS.PROCESS_AND_LABEL_EMAILS,
      userEmail,
    );
  },
  performIncrementalSync: (userEmail: string, maxResults?: number) =>
    ipcRenderer.invoke(
      EMAIL_CHANNELS.PERFORM_INCREMENTAL_SYNC,
      userEmail,
      maxResults,
    ),
  performInitialSync: (
    userEmail: string,
    onEmailProcessed?: (email: EmailThread) => void,
  ) => {
    // Set up listener for processed emails if callback provided
    if (onEmailProcessed) {
      const listener = (
        _: unknown,
        data: { userEmail: string; newEmails: EmailThread[] },
      ) => {
        if (data.userEmail === userEmail) {
          data.newEmails.forEach(onEmailProcessed);
        }
      };
      ipcRenderer.on(EMAIL_CHANNELS.NEW_EMAIL_NOTIFICATION, listener);

      // Return a promise that cleans up the listener when resolved
      return ipcRenderer
        .invoke(EMAIL_CHANNELS.PERFORM_INITIAL_SYNC, userEmail)
        .finally(() => {
          ipcRenderer.removeListener(
            EMAIL_CHANNELS.NEW_EMAIL_NOTIFICATION,
            listener,
          );
        });
    }

    return ipcRenderer.invoke(EMAIL_CHANNELS.PERFORM_INITIAL_SYNC, userEmail);
  },
  updateMessageLabels: (
    userEmail: string,
    messageId: string,
    labels: string[],
    operation?: "add" | "remove" | "replace",
  ) =>
    ipcRenderer.invoke(
      EMAIL_CHANNELS.UPDATE_MESSAGE_LABELS,
      userEmail,
      messageId,
      labels,
      operation,
    ),
  onEmailError: (callback) => {
    ipcRenderer.on(EMAIL_CHANNELS.EMAIL_ERROR, (_, error) => callback(error));
  },
  onNewEmailNotification: (callback) => {
    ipcRenderer.on(EMAIL_CHANNELS.NEW_EMAIL_NOTIFICATION, (_, data) =>
      callback(data),
    );
  },
  onInitialSyncProgress: (callback) => {
    ipcRenderer.on(EMAIL_CHANNELS.INITIAL_SYNC_PROGRESS, (_, data) =>
      callback(data),
    );
  },
};

contextBridge.exposeInMainWorld("email", emailContext);
