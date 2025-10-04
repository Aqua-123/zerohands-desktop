import { DatabaseService } from "./database";
import { AuthProvider } from "@prisma/client";

interface GmailMessageData {
  id: string;
  snippet: string;
  labelIds?: string[];
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
      filename?: string;
      parts?: Array<{
        mimeType: string;
        body?: { data?: string };
      }>;
    }>;
  };
  threadId?: string;
}

interface OutlookMessageData {
  id: string;
  subject: string;
  bodyPreview?: string;
  receivedDateTime: string;
  isRead: boolean;
  importance: string;
  hasAttachments: boolean;
  from?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
  toRecipients?: Array<{
    emailAddress?: {
      name?: string;
      address?: string;
    };
  }>;
  body?: {
    content?: string;
    contentType?: string;
  };
}

export interface EmailThread {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  preview: string;
  timestamp: Date;
  isRead: boolean;
  isImportant: boolean;
  hasAttachments: boolean;
  labels?: string[];
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  sender: string;
  senderEmail: string;
  recipient: string;
  recipientEmail: string;
  timestamp: Date;
  body: string;
  htmlBody?: string;
  attachments?: EmailAttachment[];
  isRead: boolean;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  downloadUrl?: string;
}

export class EmailService {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = new DatabaseService();
  }

  async getInboxEmails(
    userId: string,
    pageToken?: string,
    maxResults: number = 20,
  ): Promise<{ emails: EmailThread[]; nextPageToken?: string }> {
    try {
      const user = await this.databaseService.findUserByEmail(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (user.provider === AuthProvider.GOOGLE) {
        return await this.getGmailInbox(
          user.accessToken,
          pageToken,
          maxResults,
        );
      } else if (user.provider === AuthProvider.OUTLOOK) {
        return await this.getOutlookInbox(
          user.accessToken,
          pageToken,
          maxResults,
        );
      }

      throw new Error("Unsupported email provider");
    } catch (error) {
      console.error("Error fetching inbox emails:", error);
      throw error;
    }
  }

  async getEmailContent(
    userId: string,
    messageId: string,
  ): Promise<EmailMessage> {
    try {
      const user = await this.databaseService.findUserByEmail(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (user.provider === AuthProvider.GOOGLE) {
        return await this.getGmailMessage(user.accessToken, messageId);
      } else if (user.provider === AuthProvider.OUTLOOK) {
        return await this.getOutlookMessage(user.accessToken, messageId);
      }

      throw new Error("Unsupported email provider");
    } catch (error) {
      console.error("Error fetching email content:", error);
      throw error;
    }
  }

  async markEmailAsRead(userId: string, messageId: string): Promise<void> {
    try {
      const user = await this.databaseService.findUserByEmail(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (user.provider === AuthProvider.GOOGLE) {
        await this.markGmailMessageAsRead(user.accessToken, messageId);
      } else if (user.provider === AuthProvider.OUTLOOK) {
        await this.markOutlookMessageAsRead(user.accessToken, messageId);
      } else {
        throw new Error("Unsupported email provider");
      }
    } catch (error) {
      console.error("Error marking email as read:", error);
      throw error;
    }
  }

  async sendEmail(
    userId: string,
    to: string,
    subject: string,
    body: string,
    isHtml: boolean = false,
  ): Promise<void> {
    try {
      const user = await this.databaseService.findUserByEmail(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (user.provider === AuthProvider.GOOGLE) {
        await this.sendGmailMessage(
          user.accessToken,
          to,
          subject,
          body,
          isHtml,
        );
      } else if (user.provider === AuthProvider.OUTLOOK) {
        await this.sendOutlookMessage(
          user.accessToken,
          to,
          subject,
          body,
          isHtml,
        );
      } else {
        throw new Error("Unsupported email provider");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }

  private async getGmailInbox(
    accessToken: string,
    pageToken?: string,
    maxResults: number = 20,
  ): Promise<{ emails: EmailThread[]; nextPageToken?: string }> {
    try {
      // Build URL with pagination parameters
      let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:inbox&maxResults=${maxResults}`;
      if (pageToken) {
        url += `&pageToken=${pageToken}`;
      }

      const listResponse = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!listResponse.ok) {
        throw new Error(`Gmail API error: ${listResponse.statusText}`);
      }

      const listData = await listResponse.json();
      const messages = listData.messages || [];
      const nextPageToken = listData.nextPageToken;

      // Fetch details for each message
      const emailThreads: EmailThread[] = [];

      for (const message of messages) {
        try {
          const messageResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          if (messageResponse.ok) {
            const messageData = await messageResponse.json();
            const thread = this.parseGmailMessage(messageData);
            if (thread) {
              emailThreads.push(thread);
            }
          }
        } catch (error) {
          console.error(`Error fetching message ${message.id}:`, error);
        }
      }

      const sortedEmails = emailThreads.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );

      return { emails: sortedEmails, nextPageToken };
    } catch (error) {
      throw new Error(`Failed to fetch Gmail inbox: ${error}`);
    }
  }

  private async getOutlookInbox(
    accessToken: string,
    pageToken?: string,
    maxResults: number = 20,
  ): Promise<{ emails: EmailThread[]; nextPageToken?: string }> {
    try {
      // Build URL with pagination parameters
      let url = `https://graph.microsoft.com/v1.0/me/messages?$top=${maxResults}&$orderby=receivedDateTime desc`;
      if (pageToken) {
        url += `&$skip=${pageToken}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Outlook API error: ${response.statusText}`);
      }

      const data = await response.json();
      const emails = data.value.map((message: OutlookMessageData) =>
        this.parseOutlookMessage(message),
      );

      // Outlook uses skip parameter for pagination, calculate next skip value
      const nextPageToken =
        data.value.length === maxResults
          ? (parseInt(pageToken || "0") + maxResults).toString()
          : undefined;

      return { emails, nextPageToken };
    } catch (error) {
      throw new Error(`Failed to fetch Outlook inbox: ${error}`);
    }
  }

  private async getGmailMessage(
    accessToken: string,
    messageId: string,
  ): Promise<EmailMessage> {
    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseGmailMessageContent(data);
    } catch (error) {
      throw new Error(`Failed to fetch Gmail message: ${error}`);
    }
  }

  private async getOutlookMessage(
    accessToken: string,
    messageId: string,
  ): Promise<EmailMessage> {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Outlook API error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseOutlookMessageContent(data);
    } catch (error) {
      throw new Error(`Failed to fetch Outlook message: ${error}`);
    }
  }

  private parseGmailMessage(messageData: GmailMessageData): EmailThread | null {
    try {
      const headers = messageData.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())
          ?.value || "";

      const subject = getHeader("Subject");
      const from = getHeader("From");
      const date = getHeader("Date");

      // Extract sender name and email
      const fromMatch = from.match(/^(.*?)\s*<(.+)>$/) || from.match(/^(.+)$/);
      const senderName = fromMatch ? fromMatch[1].trim() : from;
      const senderEmail = fromMatch && fromMatch[2] ? fromMatch[2] : from;

      // Get preview from snippet
      const preview = messageData.snippet || "";

      // Check if read
      const isRead = !messageData.labelIds?.includes("UNREAD");

      // Check if important
      const isImportant = messageData.labelIds?.includes("IMPORTANT") || false;

      return {
        id: messageData.id,
        subject: subject || "(No Subject)",
        sender: senderName,
        senderEmail,
        preview:
          preview.substring(0, 100) + (preview.length > 100 ? "..." : ""),
        timestamp: new Date(date),
        isRead,
        isImportant,
        hasAttachments:
          messageData.payload?.parts?.some((part) => part.filename) || false,
        labels: messageData.labelIds || [],
      };
    } catch (error) {
      console.error("Error parsing Gmail message:", error);
      return null;
    }
  }

  private parseOutlookMessage(messageData: OutlookMessageData): EmailThread {
    const from = messageData.from?.emailAddress || {};
    const senderName = from.name || from.address || "Unknown";
    const senderEmail = from.address || "";

    return {
      id: messageData.id,
      subject: messageData.subject || "(No Subject)",
      sender: senderName,
      senderEmail,
      preview: messageData.bodyPreview
        ? messageData.bodyPreview.substring(0, 100) +
          (messageData.bodyPreview.length > 100 ? "..." : "")
        : "",
      timestamp: new Date(messageData.receivedDateTime),
      isRead: messageData.isRead,
      isImportant: messageData.importance === "high",
      hasAttachments: messageData.hasAttachments,
    };
  }

  private parseGmailMessageContent(
    messageData: GmailMessageData,
  ): EmailMessage {
    const headers = messageData.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ||
      "";

    const subject = getHeader("Subject");
    const from = getHeader("From");
    const to = getHeader("To");
    const date = getHeader("Date");

    // Extract sender info
    const fromMatch = from.match(/^(.*?)\s*<(.+)>$/) || from.match(/^(.+)$/);
    const senderName = fromMatch ? fromMatch[1].trim() : from;
    const senderEmail = fromMatch && fromMatch[2] ? fromMatch[2] : from;

    // Extract recipient info
    const toMatch = to.match(/^(.*?)\s*<(.+)>$/) || to.match(/^(.+)$/);
    const recipientName = toMatch ? toMatch[1].trim() : to;
    const recipientEmail = toMatch && toMatch[2] ? toMatch[2] : to;

    // Get body content
    const body = this.extractGmailBody(messageData.payload);

    return {
      id: messageData.id,
      threadId: messageData.threadId || messageData.id,
      subject: subject || "(No Subject)",
      sender: senderName,
      senderEmail,
      recipient: recipientName,
      recipientEmail,
      timestamp: new Date(date),
      body: body || "",
      htmlBody: this.extractGmailHtmlBody(messageData.payload),
      isRead: !messageData.labelIds?.includes("UNREAD"),
    };
  }

  private parseOutlookMessageContent(
    messageData: OutlookMessageData,
  ): EmailMessage {
    const from = messageData.from?.emailAddress || {};
    const to = messageData.toRecipients?.[0]?.emailAddress || {};

    return {
      id: messageData.id,
      threadId: messageData.id, // Outlook doesn't have thread concept
      subject: messageData.subject || "(No Subject)",
      sender: from.name || from.address || "Unknown",
      senderEmail: from.address || "",
      recipient: to.name || to.address || "Unknown",
      recipientEmail: to.address || "",
      timestamp: new Date(messageData.receivedDateTime),
      body: messageData.body?.content || "",
      htmlBody:
        messageData.body?.contentType === "html"
          ? messageData.body?.content
          : undefined,
      isRead: messageData.isRead,
    };
  }

  private extractGmailBody(payload: GmailMessageData["payload"]): string {
    if (!payload) return "";

    if (payload.body?.data) {
      return Buffer.from(payload.body.data, "base64").toString();
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          return Buffer.from(part.body.data, "base64").toString();
        }
        if (part.parts) {
          const nestedBody = this.extractGmailBody(part);
          if (nestedBody) return nestedBody;
        }
      }
    }

    return "";
  }

  private extractGmailHtmlBody(
    payload: GmailMessageData["payload"],
  ): string | undefined {
    if (!payload) return undefined;

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === "text/html" && part.body?.data) {
          return Buffer.from(part.body.data, "base64").toString();
        }
        if (part.parts) {
          const nestedBody = this.extractGmailHtmlBody(part);
          if (nestedBody) return nestedBody;
        }
      }
    }
    return undefined;
  }

  private async markGmailMessageAsRead(
    accessToken: string,
    messageId: string,
  ): Promise<void> {
    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            removeLabelIds: ["UNREAD"],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to mark Gmail message as read: ${error}`);
    }
  }

  private async markOutlookMessageAsRead(
    accessToken: string,
    messageId: string,
  ): Promise<void> {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isRead: true,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Outlook API error: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to mark Outlook message as read: ${error}`);
    }
  }

  private async sendGmailMessage(
    accessToken: string,
    to: string,
    subject: string,
    body: string,
    isHtml: boolean = false,
  ): Promise<void> {
    try {
      // Create the email message in RFC 2822 format
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset=UTF-8`,
        "",
        body,
      ].join("\n");

      // Encode the message in base64url format
      const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            raw: encodedMessage,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to send Gmail message: ${error}`);
    }
  }

  private async sendOutlookMessage(
    accessToken: string,
    to: string,
    subject: string,
    body: string,
    isHtml: boolean = false,
  ): Promise<void> {
    try {
      const response = await fetch(
        "https://graph.microsoft.com/v1.0/me/sendMail",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              subject: subject,
              body: {
                contentType: isHtml ? "HTML" : "Text",
                content: body,
              },
              toRecipients: [
                {
                  emailAddress: {
                    address: to,
                  },
                },
              ],
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Outlook API error: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to send Outlook message: ${error}`);
    }
  }

  // Gmail Push Notifications Setup
  async setupGmailPushNotifications(userId: string): Promise<void> {
    try {
      const user = await this.databaseService.findUserByEmail(userId);
      if (!user || user.provider !== AuthProvider.GOOGLE) {
        throw new Error("Gmail user not found");
      }

      // First, we need to get the user's Gmail profile to get the email address
      const profileResponse = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/profile",
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        },
      );

      if (!profileResponse.ok) {
        throw new Error(
          `Failed to get Gmail profile: ${profileResponse.statusText}`,
        );
      }

      // Set up push notifications for the inbox
      const watchResponse = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/watch",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/topics/gmail-notifications`,
            labelIds: ["INBOX"],
            labelFilterAction: "include",
          }),
        },
      );

      if (!watchResponse.ok) {
        throw new Error(
          `Failed to setup Gmail watch: ${watchResponse.statusText}`,
        );
      }

      const watchData = await watchResponse.json();
      console.log("Gmail push notifications setup successfully:", watchData);
    } catch (error) {
      console.error("Error setting up Gmail push notifications:", error);
      throw error;
    }
  }

  // Outlook Webhook Setup
  async setupOutlookWebhook(userId: string, webhookUrl: string): Promise<void> {
    try {
      const user = await this.databaseService.findUserByEmail(userId);
      if (!user || user.provider !== AuthProvider.OUTLOOK) {
        throw new Error("Outlook user not found");
      }

      // Create a subscription for new messages
      const subscriptionResponse = await fetch(
        "https://graph.microsoft.com/v1.0/subscriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            changeType: "created",
            notificationUrl: webhookUrl,
            resource: "me/messages",
            expirationDateTime: new Date(
              Date.now() + 4230 * 60 * 1000,
            ).toISOString(), // ~3 days
            clientState: `outlook-${user.id}`,
          }),
        },
      );

      if (!subscriptionResponse.ok) {
        throw new Error(
          `Failed to setup Outlook webhook: ${subscriptionResponse.statusText}`,
        );
      }

      const subscriptionData = await subscriptionResponse.json();
      console.log("Outlook webhook setup successfully:", subscriptionData);
    } catch (error) {
      console.error("Error setting up Outlook webhook:", error);
      throw error;
    }
  }
}
