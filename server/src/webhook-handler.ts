import { Request, Response } from "express";
import { WebSocketManager } from "./websocket-manager";
import crypto from "crypto";

export class WebhookHandler {
  private readonly GMAIL_WEBHOOK_SECRET = process.env.GMAIL_WEBHOOK_SECRET;
  private readonly OUTLOOK_WEBHOOK_SECRET = process.env.OUTLOOK_WEBHOOK_SECRET;
  private readonly GOOGLE_CLOUD_PROJECT_ID =
    process.env.GOOGLE_CLOUD_PROJECT_ID;

  constructor(private webSocketManager: WebSocketManager) {}

  async handleGmailWebhook(req: Request, res: Response): Promise<void> {
    try {
      console.log(
        "📧 Received Gmail webhook:",
        JSON.stringify(req.body, null, 2),
      );

      // Validate the webhook signature and structure
      const validationResult = await this.validateGmailWebhook(req);
      if (!validationResult.isValid) {
        console.warn("⚠️ Invalid Gmail webhook:", validationResult.error);
        res.status(401).json({ error: validationResult.error });
        return;
      }

      // Gmail sends notifications with historyId
      const { historyId, emailAddress } = req.body;

      if (!historyId || !emailAddress) {
        console.warn("⚠️ Missing required fields in Gmail webhook");
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      // Send notification to the connected client
      const notification = {
        type: "new_email",
        provider: "gmail",
        userEmail: emailAddress,
        historyId,
        timestamp: new Date().toISOString(),
        message: "New email received in Gmail",
      };

      const sent = this.webSocketManager.sendToUser(emailAddress, notification);

      if (sent) {
        console.log(`✅ Gmail notification sent to ${emailAddress}`);
        res.status(200).json({ success: true, message: "Notification sent" });
      } else {
        console.log(`❌ No active connection found for ${emailAddress}`);
        res
          .status(200)
          .json({ success: true, message: "No active connection" });
      }
    } catch (error) {
      console.error("❌ Error handling Gmail webhook:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async handleOutlookWebhook(req: Request, res: Response): Promise<void> {
    try {
      console.log(
        "📧 Received Outlook webhook:",
        JSON.stringify(req.body, null, 2),
      );

      // Validate the webhook signature and structure
      const validationResult = await this.validateOutlookWebhook(req);
      if (!validationResult.isValid) {
        console.warn("⚠️ Invalid Outlook webhook:", validationResult.error);
        res.status(401).json({ error: validationResult.error });
        return;
      }

      // Outlook sends notifications with resource data
      const { value } = req.body;

      if (!value || !Array.isArray(value)) {
        console.warn("⚠️ Invalid Outlook webhook format");
        res.status(400).json({ error: "Invalid webhook format" });
        return;
      }

      // Process each notification
      for (const change of value) {
        if (
          change.changeType === "created" &&
          change.resource === "me/messages"
        ) {
          // Extract user email from clientState
          const userEmail =
            this.extractUserEmailFromOutlookNotification(change);

          if (userEmail) {
            const notification = {
              type: "new_email",
              provider: "outlook",
              userEmail,
              resourceId: change.resourceId,
              timestamp: new Date().toISOString(),
              message: "New email received in Outlook",
            };

            const sent = this.webSocketManager.sendToUser(
              userEmail,
              notification,
            );

            if (sent) {
              console.log(`✅ Outlook notification sent to ${userEmail}`);
            } else {
              console.log(`❌ No active connection found for ${userEmail}`);
            }
          }
        }
      }

      res
        .status(200)
        .json({ success: true, message: "Notifications processed" });
    } catch (error) {
      console.error("❌ Error handling Outlook webhook:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async validateGmailWebhook(
    req: Request,
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // 1. Check basic structure
      const { historyId, emailAddress } = req.body;
      if (!historyId || !emailAddress) {
        return {
          isValid: false,
          error: "Missing required fields (historyId, emailAddress)",
        };
      }

      // 2. Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailAddress)) {
        return { isValid: false, error: "Invalid email address format" };
      }

      // 3. Validate historyId is a number
      if (typeof historyId !== "string" || !/^\d+$/.test(historyId)) {
        return { isValid: false, error: "Invalid historyId format" };
      }

      // 4. Verify JWT token if present (Gmail Pub/Sub notifications)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const isValidToken = await this.verifyGmailJWT(token);
        if (!isValidToken) {
          return { isValid: false, error: "Invalid JWT token" };
        }
      }

      // 5. Verify webhook signature if secret is configured
      if (this.GMAIL_WEBHOOK_SECRET) {
        const signature = req.headers["x-hub-signature-256"] as string;
        if (!signature) {
          return { isValid: false, error: "Missing webhook signature" };
        }

        const payload = JSON.stringify(req.body);
        const isValidSignature = this.validateWebhookSignature(
          payload,
          signature,
          this.GMAIL_WEBHOOK_SECRET,
        );

        if (!isValidSignature) {
          return { isValid: false, error: "Invalid webhook signature" };
        }
      }

      return { isValid: true };
    } catch (error) {
      console.error("Error validating Gmail webhook:", error);
      return { isValid: false, error: "Validation error" };
    }
  }

  private async validateOutlookWebhook(
    req: Request,
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // 1. Check basic structure
      const { value } = req.body;
      if (!value || !Array.isArray(value)) {
        return {
          isValid: false,
          error: "Invalid webhook format - missing or invalid value array",
        };
      }

      // 2. Validate each notification in the value array
      for (const change of value) {
        if (!change.changeType || !change.resource) {
          return {
            isValid: false,
            error: "Missing required fields in notification",
          };
        }

        // Validate changeType
        const validChangeTypes = ["created", "updated", "deleted"];
        if (!validChangeTypes.includes(change.changeType)) {
          return {
            isValid: false,
            error: `Invalid changeType: ${change.changeType}`,
          };
        }

        // Validate resource
        const validResources = ["me/messages", "me/events", "me/contacts"];
        if (!validResources.includes(change.resource)) {
          return {
            isValid: false,
            error: `Invalid resource: ${change.resource}`,
          };
        }

        // Validate resourceId format
        if (change.resourceId && typeof change.resourceId !== "string") {
          return { isValid: false, error: "Invalid resourceId format" };
        }
      }

      // 3. Verify webhook signature if secret is configured
      if (this.OUTLOOK_WEBHOOK_SECRET) {
        const signature = req.headers["x-hub-signature-256"] as string;
        if (!signature) {
          return { isValid: false, error: "Missing webhook signature" };
        }

        const payload = JSON.stringify(req.body);
        const isValidSignature = this.validateWebhookSignature(
          payload,
          signature,
          this.OUTLOOK_WEBHOOK_SECRET,
        );

        if (!isValidSignature) {
          return { isValid: false, error: "Invalid webhook signature" };
        }
      }

      return { isValid: true };
    } catch (error) {
      console.error("Error validating Outlook webhook:", error);
      return { isValid: false, error: "Validation error" };
    }
  }

  private async verifyGmailJWT(token: string): Promise<boolean> {
    try {
      // For Gmail Pub/Sub notifications, we need to verify the JWT token
      // This is a simplified version - in production, you should use proper JWT verification
      // with Google's public keys

      if (!this.GOOGLE_CLOUD_PROJECT_ID) {
        console.warn(
          "GOOGLE_CLOUD_PROJECT_ID not configured, skipping JWT verification",
        );
        return true; // Allow if not configured
      }

      // In a real implementation, you would:
      // 1. Decode the JWT header to get the key ID
      // 2. Fetch Google's public keys from https://www.googleapis.com/oauth2/v3/certs
      // 3. Verify the signature using the appropriate public key
      // 4. Check the token claims (iss, aud, exp, etc.)

      // For now, we'll do basic validation
      const parts = token.split(".");
      if (parts.length !== 3) {
        return false;
      }

      // Basic JWT structure validation
      try {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString(),
        );

        // Check if token is expired
        if (payload.exp && payload.exp < Date.now() / 1000) {
          return false;
        }

        // Check audience (should be your project ID)
        if (payload.aud !== this.GOOGLE_CLOUD_PROJECT_ID) {
          return false;
        }

        return true;
      } catch (decodeError) {
        console.error("Error decoding JWT:", decodeError);
        return false;
      }
    } catch (error) {
      console.error("Error verifying Gmail JWT:", error);
      return false;
    }
  }

  private extractUserEmailFromOutlookNotification(change: {
    clientState?: string;
    changeType?: string;
    resource?: string;
    resourceId?: string;
  }): string | null {
    try {
      // Try to get from clientState first
      if (change.clientState) {
        // clientState format: "outlook-{userId}" or could contain email
        const clientState = change.clientState;

        // If clientState contains an email pattern, extract it
        const emailMatch = clientState.match(
          /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
        );
        if (emailMatch) {
          return emailMatch[1];
        }

        // Otherwise, try to extract userId and construct email
        const userId = clientState.replace("outlook-", "");
        if (userId && userId !== clientState) {
          console.log(`Extracted userId from clientState: ${userId}`);
          // In a real implementation, you would look up the user by ID in your database
          // For now, we'll use a placeholder pattern
          return `user-${userId}@outlook.com`;
        }
      }

      // If no clientState, we can't determine the user
      console.warn(
        "No clientState found in Outlook notification, cannot determine user",
      );
      return null;
    } catch (error) {
      console.error(
        "Error extracting user email from Outlook notification:",
        error,
      );
      return null;
    }
  }

  // Helper method to validate webhook signatures (for production use)
  private validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
    algorithm: string = "sha256",
  ): boolean {
    try {
      const expectedSignature = crypto
        .createHmac(algorithm, secret)
        .update(payload)
        .digest("hex");

      const providedSignature = signature.replace("sha256=", "");

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(providedSignature, "hex"),
      );
    } catch (error) {
      console.error("Error validating webhook signature:", error);
      return false;
    }
  }
}
