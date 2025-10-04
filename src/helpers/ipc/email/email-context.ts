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
  onEmailError: (callback: (error: string) => void) => void;
  onNewEmailNotification: (
    callback: (data: { userEmail: string; newEmails: EmailThread[] }) => void,
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
  onEmailError: (callback) => {
    ipcRenderer.on(EMAIL_CHANNELS.EMAIL_ERROR, (_, error) => callback(error));
  },
  onNewEmailNotification: (callback) => {
    ipcRenderer.on(EMAIL_CHANNELS.NEW_EMAIL_NOTIFICATION, (_, data) =>
      callback(data),
    );
  },
};

contextBridge.exposeInMainWorld("email", emailContext);
