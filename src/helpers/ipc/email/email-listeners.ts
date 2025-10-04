import { ipcMain, BrowserWindow } from "electron";
import { EmailService } from "../../../services/email";
import { EMAIL_CHANNELS } from "./email-channels";

let emailService: EmailService;

export function registerEmailListeners(mainWindow: BrowserWindow) {
  emailService = new EmailService();

  ipcMain.handle(
    EMAIL_CHANNELS.GET_INBOX_EMAILS,
    async (_, userEmail: string, pageToken?: string, maxResults?: number) => {
      try {
        return await emailService.getInboxEmails(
          userEmail,
          pageToken,
          maxResults,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch emails";
        mainWindow.webContents.send(EMAIL_CHANNELS.EMAIL_ERROR, errorMessage);
        throw error;
      }
    },
  );

  ipcMain.handle(
    EMAIL_CHANNELS.GET_EMAIL_CONTENT,
    async (_, userEmail: string, messageId: string) => {
      try {
        return await emailService.getEmailContent(userEmail, messageId);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch email content";
        mainWindow.webContents.send(EMAIL_CHANNELS.EMAIL_ERROR, errorMessage);
        throw error;
      }
    },
  );

  ipcMain.handle(
    EMAIL_CHANNELS.MARK_EMAIL_AS_READ,
    async (_, userEmail: string, messageId: string) => {
      try {
        await emailService.markEmailAsRead(userEmail, messageId);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to mark email as read";
        mainWindow.webContents.send(EMAIL_CHANNELS.EMAIL_ERROR, errorMessage);
        throw error;
      }
    },
  );

  ipcMain.handle(
    EMAIL_CHANNELS.SEND_EMAIL,
    async (
      _,
      userEmail: string,
      to: string,
      subject: string,
      body: string,
      isHtml: boolean = false,
    ) => {
      try {
        await emailService.sendEmail(userEmail, to, subject, body, isHtml);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to send email";
        mainWindow.webContents.send(EMAIL_CHANNELS.EMAIL_ERROR, errorMessage);
        throw error;
      }
    },
  );

  ipcMain.handle(
    EMAIL_CHANNELS.SETUP_GMAIL_PUSH_NOTIFICATIONS,
    async (_, userEmail: string) => {
      try {
        await emailService.setupGmailPushNotifications(userEmail);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to setup Gmail push notifications";
        mainWindow.webContents.send(EMAIL_CHANNELS.EMAIL_ERROR, errorMessage);
        throw error;
      }
    },
  );

  ipcMain.handle(
    EMAIL_CHANNELS.SETUP_OUTLOOK_WEBHOOK,
    async (_, userEmail: string, webhookUrl: string) => {
      try {
        await emailService.setupOutlookWebhook(userEmail, webhookUrl);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to setup Outlook webhook";
        mainWindow.webContents.send(EMAIL_CHANNELS.EMAIL_ERROR, errorMessage);
        throw error;
      }
    },
  );
}
