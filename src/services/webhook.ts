import { EmailService } from "./email";
import { DatabaseService } from "./database";
import { AuthProvider } from "@prisma/client";

export class WebhookService {
  private emailService: EmailService;
  private databaseService: DatabaseService;

  constructor() {
    this.emailService = new EmailService();
    this.databaseService = new DatabaseService();
  }

  // Handle Gmail push notifications
  async handleGmailNotification(notification: any): Promise<void> {
    try {
      console.log("Received Gmail notification:", notification);

      // Gmail sends notifications with historyId
      if (notification.historyId) {
        // Get the user from the notification
        const userEmail = notification.emailAddress;
        if (!userEmail) {
          console.error("No email address in Gmail notification");
          return;
        }

        // Fetch new emails for this user
        const result = await this.emailService.getInboxEmails(
          userEmail,
          undefined,
          5,
        );

        // Send notification to renderer process
        this.notifyRenderer(userEmail, result.emails);
      }
    } catch (error) {
      console.error("Error handling Gmail notification:", error);
    }
  }

  // Handle Outlook webhook notifications
  async handleOutlookNotification(notification: any): Promise<void> {
    try {
      console.log("Received Outlook notification:", notification);

      // Outlook sends notifications with resource data
      if (notification.value && notification.value.length > 0) {
        for (const change of notification.value) {
          if (
            change.changeType === "created" &&
            change.resource === "me/messages"
          ) {
            // Extract user email from clientState or resource
            const userEmail =
              this.extractUserEmailFromOutlookNotification(change);
            if (!userEmail) {
              console.error(
                "Could not extract user email from Outlook notification",
              );
              continue;
            }

            // Fetch new emails for this user
            const result = await this.emailService.getInboxEmails(
              userEmail,
              undefined,
              5,
            );

            // Send notification to renderer process
            this.notifyRenderer(userEmail, result.emails);
          }
        }
      }
    } catch (error) {
      console.error("Error handling Outlook notification:", error);
    }
  }

  // Extract user email from Outlook notification
  private extractUserEmailFromOutlookNotification(change: any): string | null {
    try {
      // Try to get from clientState first
      if (change.clientState) {
        const user = this.databaseService.findUserByProvider(
          AuthProvider.OUTLOOK,
          change.clientState.replace("outlook-", ""),
        );
        if (user) {
          return user.then((u) => u?.email || null);
        }
      }

      // Fallback: try to extract from resource URL
      if (change.resourceData) {
        // This would need to be implemented based on your specific setup
        console.log("Resource data:", change.resourceData);
      }

      return null;
    } catch (error) {
      console.error(
        "Error extracting user email from Outlook notification:",
        error,
      );
      return null;
    }
  }

  // Notify the renderer process about new emails
  private notifyRenderer(userEmail: string, newEmails: any[]): void {
    try {
      // This would need to be implemented to communicate with the main process
      // and then to the renderer process
      console.log(
        `Notifying renderer about ${newEmails.length} new emails for ${userEmail}`,
      );

      // In a real implementation, you would:
      // 1. Send IPC message to main process
      // 2. Main process sends to renderer via webContents.send
      // 3. Renderer listens for NEW_EMAIL_NOTIFICATION events
    } catch (error) {
      console.error("Error notifying renderer:", error);
    }
  }

  // Validate webhook signatures (for security)
  validateGmailSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    // Implement Gmail webhook signature validation
    // This is important for security
    return true; // Placeholder
  }

  validateOutlookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    // Implement Outlook webhook signature validation
    // This is important for security
    return true; // Placeholder
  }
}
