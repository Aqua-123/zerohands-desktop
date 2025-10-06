import { ipcMain, BrowserWindow } from "electron";
import { EmailService, EmailThread } from "../../../services/email";
import { EMAIL_CHANNELS } from "./email-channels";

let emailService: EmailService;

export function registerEmailListeners(mainWindow: BrowserWindow) {
  emailService = new EmailService();

  ipcMain.handle(
    EMAIL_CHANNELS.GET_INBOX_EMAILS,
    async (_, userEmail: string, pageToken?: string, maxResults?: number) => {
      try {
        console.log(
          `[IPC_EMAIL] Received GET_INBOX_EMAILS request for user: ${userEmail}, pageToken: ${pageToken || "none"}, maxResults: ${maxResults || "default"}`,
        );

        // Set up callback to send emails to renderer as they're processed
        const onEmailSaved = (email: EmailThread) => {
          console.log(`[IPC_EMAIL] Sending email to renderer: ${email.id}`);
          mainWindow.webContents.send(EMAIL_CHANNELS.NEW_EMAIL_NOTIFICATION, {
            userEmail,
            newEmails: [email],
          });
        };

        const result = await emailService.getInboxEmails(
          userEmail,
          pageToken,
          maxResults,
          onEmailSaved,
        );
        console.log(
          `[IPC_EMAIL] Successfully processed GET_INBOX_EMAILS request for user: ${userEmail}, returned ${result.emails.length} emails`,
        );
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch emails";
        console.error(
          `[IPC_EMAIL] Error in GET_INBOX_EMAILS for user ${userEmail}:`,
          error,
        );

        // If user not found, send a special error to trigger sign-out
        if (errorMessage === "User not found") {
          mainWindow.webContents.send(
            EMAIL_CHANNELS.EMAIL_ERROR,
            "USER_NOT_FOUND",
          );
        } else {
          mainWindow.webContents.send(EMAIL_CHANNELS.EMAIL_ERROR, errorMessage);
        }
        throw error;
      }
    },
  );

  ipcMain.handle(
    EMAIL_CHANNELS.PERFORM_INCREMENTAL_SYNC,
    async (_, userEmail: string, maxResults?: number) => {
      try {
        console.log(
          `[IPC_EMAIL] Received PERFORM_INCREMENTAL_SYNC request for user: ${userEmail}, maxResults: ${maxResults || "default"}`,
        );
        const result = await emailService.performIncrementalSync(
          userEmail,
          maxResults,
        );
        console.log(
          `[IPC_EMAIL] Successfully processed PERFORM_INCREMENTAL_SYNC request for user: ${userEmail}, found ${result.newEmailsCount} new emails`,
        );
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to perform incremental sync";
        console.error(
          `[IPC_EMAIL] Error in PERFORM_INCREMENTAL_SYNC for user ${userEmail}:`,
          error,
        );
        mainWindow.webContents.send(EMAIL_CHANNELS.EMAIL_ERROR, errorMessage);
        throw error;
      }
    },
  );

  ipcMain.handle(
    EMAIL_CHANNELS.PERFORM_INITIAL_SYNC,
    async (_, userEmail: string) => {
      try {
        console.log(
          `[IPC_EMAIL] Received PERFORM_INITIAL_SYNC request for user: ${userEmail}`,
        );

        const result = await emailService.performInitialSync(
          userEmail,
          (progress) => {
            // Send progress updates to renderer
            mainWindow.webContents.send(EMAIL_CHANNELS.INITIAL_SYNC_PROGRESS, {
              userEmail,
              progress,
            });
          },
          (email) => {
            // Send individual email updates to renderer as they are processed
            mainWindow.webContents.send(EMAIL_CHANNELS.NEW_EMAIL_NOTIFICATION, {
              userEmail,
              newEmails: [email],
            });
          },
        );

        console.log(
          `[IPC_EMAIL] Successfully completed PERFORM_INITIAL_SYNC for user: ${userEmail}, processed ${result.newEmailsCount} emails`,
        );

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to perform initial sync";
        console.error(
          `[IPC_EMAIL] Error in PERFORM_INITIAL_SYNC for user ${userEmail}:`,
          error,
        );
        mainWindow.webContents.send(EMAIL_CHANNELS.EMAIL_ERROR, errorMessage);
        throw error;
      }
    },
  );

  ipcMain.handle(
    EMAIL_CHANNELS.UPDATE_MESSAGE_LABELS,
    async (
      _,
      userEmail: string,
      messageId: string,
      labels: string[],
      operation?: "add" | "remove" | "replace",
    ) => {
      try {
        console.log(
          `[IPC_EMAIL] Received UPDATE_MESSAGE_LABELS request for user: ${userEmail}, messageId: ${messageId}, labels: [${labels.join(", ")}], operation: ${operation || "add"}`,
        );

        await emailService.updateMessageLabelsByUser(
          userEmail,
          messageId,
          labels,
          operation || "add",
        );

        console.log(
          `[IPC_EMAIL] Successfully updated labels for message ${messageId}`,
        );

        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to update message labels";
        console.error(
          `[IPC_EMAIL] Error in UPDATE_MESSAGE_LABELS for user ${userEmail}, message ${messageId}:`,
          error,
        );
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
    EMAIL_CHANNELS.GET_THREAD_EMAILS,
    async (_, userEmail: string, threadId: string) => {
      try {
        console.log(
          `[IPC_EMAIL] Received GET_THREAD_EMAILS request for user: ${userEmail}, threadId: ${threadId}`,
        );
        const result = await emailService.getThreadEmails(userEmail, threadId);
        console.log(
          `[IPC_EMAIL] Successfully retrieved ${result.length} thread emails for user: ${userEmail}`,
        );
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch thread emails";
        console.error(
          `[IPC_EMAIL] Error in GET_THREAD_EMAILS for user ${userEmail}:`,
          error,
        );
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

  ipcMain.handle(
    EMAIL_CHANNELS.GET_INBOX_EMAILS_FROM_DB,
    async (_, userEmail: string, limit?: number, offset?: number) => {
      try {
        return await emailService.getInboxEmailsFromDB(
          userEmail,
          limit,
          offset,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch emails from database";
        mainWindow.webContents.send(EMAIL_CHANNELS.EMAIL_ERROR, errorMessage);
        throw error;
      }
    },
  );
}
