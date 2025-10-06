import { google, gmail_v1 } from "googleapis";
import type { Auth } from "googleapis";
import { Client } from "@microsoft/microsoft-graph-client";

import {
  DatabaseService,
  CreateEmailThreadData,
  CreateEmailData,
  CreateEmailAttachmentData,
} from "./database";
import {
  AuthProvider,
  EmailThread as PrismaEmailThread,
  Email,
} from "@prisma/client";
import { generateLabels } from "../lib/generateLabels";

// ---------------- Types ----------------

type GmailMessageData = gmail_v1.Schema$Message;
interface OutlookMessageData {
  id: string;
  subject: string;
  bodyPreview?: string;
  receivedDateTime: string;
  isRead: boolean;
  importance: string;
  hasAttachments: boolean;
  from?: { emailAddress?: { name?: string; address?: string } };
  toRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>;
  body?: { content?: string; contentType?: string };
  categories?: string[];
  "@odata.type"?: string;
  "@removed"?: unknown;
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
  messages?: EmailMessage[]; // Store individual messages for processing
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

// ---------------- Helpers: Clients ----------------

function gmailClientFromAccessToken(accessToken: string) {
  const auth = new google.auth.OAuth2() as Auth.OAuth2Client;
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

function graphClientFromAccessToken(accessToken: string) {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

// ---------------- Service ----------------

export class EmailService {
  private databaseService: DatabaseService;

  constructor() {
    console.log(`[EMAIL_SERVICE] Initializing EmailService`);
    this.databaseService = new DatabaseService();
    console.log(`[EMAIL_SERVICE] EmailService initialized successfully`);
  }

  async performIncrementalSync(
    userId: string,
    maxResults: number = 50,
  ): Promise<{ newEmailsCount: number; totalEmailsCount: number }> {
    try {
      console.log(
        `[INCREMENTAL_SYNC] Starting incremental sync for user: ${userId}`,
      );
      const user = await this.databaseService.findUserByEmail(userId);
      if (!user) throw new Error("User not found");

      let newEmails: EmailThread[] = [];

      if (user.provider === AuthProvider.GOOGLE) {
        newEmails = await this.getGmailIncrementalSync(
          user.accessToken,
          user.id,
          maxResults,
        );
      } else if (user.provider === AuthProvider.OUTLOOK) {
        newEmails = await this.getOutlookIncrementalSync(
          user.accessToken,
          user.id,
          maxResults,
        );
      } else {
        throw new Error("Unsupported email provider");
      }

      if (newEmails.length) {
        await this.saveEmailsToDatabase(user.id, newEmails);
      }

      return {
        newEmailsCount: newEmails.length,
        totalEmailsCount: newEmails.length,
      };
    } catch (error) {
      console.error(`[INCREMENTAL_SYNC] Error:`, error);
      throw error;
    }
  }

  async performInitialSync(
    userId: string,
    onProgress?: (progress: {
      processed: number;
      total: number;
      currentEmail: string;
    }) => void,
    onEmailProcessed?: (email: EmailThread) => void,
  ): Promise<{ newEmailsCount: number; totalEmailsCount: number }> {
    try {
      console.log(`[INITIAL_SYNC] Starting initial sync for user: ${userId}`);
      const user = await this.databaseService.findUserByEmail(userId);
      if (!user) throw new Error("User not found");

      // Calculate date range for past 1 month
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const dateFilter = oneMonthAgo.toISOString().split("T")[0]; // YYYY-MM-DD format

      let allEmails: EmailThread[] = [];

      if (user.provider === AuthProvider.GOOGLE) {
        allEmails = await this.getGmailInitialSync(
          user.accessToken,
          user.id,
          dateFilter,
          onProgress,
        );
      } else if (user.provider === AuthProvider.OUTLOOK) {
        allEmails = await this.getOutlookInitialSync(
          user.accessToken,
          user.id,
          dateFilter,
          onProgress,
        );
      } else {
        throw new Error("Unsupported email provider");
      }

      if (allEmails.length) {
        console.log(
          `[INITIAL_SYNC] Saving ${allEmails.length} emails to database`,
        );
        // Pass the callback to send real-time updates as emails are saved
        await this.saveEmailsToDatabase(user.id, allEmails, onEmailProcessed);
      }

      console.log(
        `[INITIAL_SYNC] Completed initial sync for user: ${userId}, processed ${allEmails.length} emails`,
      );

      return {
        newEmailsCount: allEmails.length,
        totalEmailsCount: allEmails.length,
      };
    } catch (error) {
      console.error(`[INITIAL_SYNC] Error:`, error);
      throw error;
    }
  }

  async getInboxEmailsFromDB(
    userId: string,
    limit: number = 25,
    offset: number = 0,
  ): Promise<{ emails: EmailThread[]; hasMore: boolean }> {
    const user = await this.databaseService.findUserByEmail(userId);
    if (!user) throw new Error("User not found");

    const dbThreads = await this.databaseService.getEmailThreadsByUser(
      user.id,
      limit,
      offset,
      true,
    );
    const emails: EmailThread[] = dbThreads.map((t) => ({
      id: t.externalId,
      subject: t.subject,
      sender: t.sender,
      senderEmail: t.senderEmail,
      preview: t.preview,
      timestamp: t.timestamp,
      isRead: t.isRead,
      isImportant: t.isImportant,
      hasAttachments: t.hasAttachments,
      labels: t.labels?.map((l) => l.label) || [],
    }));

    const totalCount = await this.databaseService.getEmailThreadCount(
      user.id,
      true,
    );
    const hasMore = offset + dbThreads.length < totalCount;

    return { emails, hasMore };
  }

  // --------------- Gmail (SDK) ---------------

  private async getGmailInitialSync(
    accessToken: string,
    userId: string,
    dateFilter: string,
    onProgress?: (progress: {
      processed: number;
      total: number;
      currentEmail: string;
    }) => void,
  ): Promise<EmailThread[]> {
    const gmail = gmailClientFromAccessToken(accessToken);
    const emailThreads: EmailThread[] = [];

    try {
      console.log(
        `[GMAIL_INITIAL_SYNC] Starting initial sync from ${dateFilter}`,
      );

      // First, get all thread IDs from the past month
      let pageToken: string | undefined;
      let totalThreads = 0;
      const allThreadIds: string[] = [];

      do {
        const listRes = await gmail.users.threads.list({
          userId: "me",
          q: `after:${dateFilter}`,
          maxResults: 100,
          pageToken,
        });

        const threads = listRes.data.threads || [];
        allThreadIds.push(...threads.map((t) => t.id!));
        totalThreads += threads.length;
        pageToken = listRes.data.nextPageToken;

        console.log(
          `[GMAIL_INITIAL_SYNC] Found ${totalThreads} threads so far...`,
        );
      } while (pageToken);

      console.log(
        `[GMAIL_INITIAL_SYNC] Total threads to process: ${totalThreads}`,
      );

      // Process threads in parallel batches
      const batchSize = 5; // Smaller batch size for initial sync to avoid rate limits
      const threadBatches = this.chunkArray(allThreadIds, batchSize);

      for (
        let batchIndex = 0;
        batchIndex < threadBatches.length;
        batchIndex++
      ) {
        const batch = threadBatches[batchIndex];
        const batchPromises = batch.map(async (id) => {
          try {
            const res = await gmail.users.threads.get({
              userId: "me",
              id,
              format: "full",
            });
            return this.parseGmailThread(res.data);
          } catch (error) {
            console.error(
              `[GMAIL_INITIAL_SYNC] Failed to fetch thread ${id}:`,
              error,
            );
            return null;
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        const validThreads = batchResults
          .filter(
            (result): result is PromiseFulfilledResult<EmailThread | null> =>
              result.status === "fulfilled" && result.value !== null,
          )
          .map((result) => result.value)
          .filter((thread): thread is EmailThread => thread !== null);

        emailThreads.push(...validThreads);

        // Report progress
        const processed = Math.min((batchIndex + 1) * batchSize, totalThreads);
        if (onProgress && validThreads.length > 0) {
          onProgress({
            processed,
            total: totalThreads,
            currentEmail: validThreads[0].subject || "Processing...",
          });
        }

        // Add a small delay between batches to avoid rate limits
        if (batchIndex < threadBatches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      console.log(
        `[GMAIL_INITIAL_SYNC] Completed processing ${emailThreads.length} threads`,
      );
    } catch (error) {
      console.error(`[GMAIL_INITIAL_SYNC] Error:`, error);
      throw error;
    }

    return emailThreads;
  }

  private async getGmailIncrementalSync(
    accessToken: string,
    userId: string,
    maxResults: number = 50,
  ): Promise<EmailThread[]> {
    const gmail = gmailClientFromAccessToken(accessToken);

    // Current historyId
    const profile = await gmail.users.getProfile({ userId: "me" });
    const currentHistoryId = profile.data.historyId;

    const syncState = await this.databaseService.getUserSyncState(userId);
    const lastHistoryId = syncState.gmailHistoryId;

    const emailThreads: EmailThread[] = [];

    if (!lastHistoryId) {
      // First-time: list recent INBOX threads
      const list = await gmail.users.threads.list({
        userId: "me",
        q: "in:inbox",
        maxResults,
      });
      const threads = list.data.threads || [];

      // Process threads in parallel batches
      const batchSize = 10;
      const threadBatches = this.chunkArray(threads, batchSize);

      for (const batch of threadBatches) {
        const batchPromises = batch.map(async (t) => {
          if (!t.id) return null;
          try {
            const res = await gmail.users.threads.get({
              userId: "me",
              id: t.id,
              format: "full",
            });
            return this.parseGmailThread(res.data);
          } catch (error) {
            console.error(
              `[GMAIL_INC_SYNC] Failed to fetch thread ${t.id}:`,
              error,
            );
            return null;
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        const validThreads = batchResults
          .filter(
            (result): result is PromiseFulfilledResult<EmailThread | null> =>
              result.status === "fulfilled" && result.value !== null,
          )
          .map((result) => result.value)
          .filter((thread): thread is EmailThread => thread !== null);

        emailThreads.push(...validThreads);
      }
    } else {
      // Incremental via history.list
      const hist = await gmail.users.history.list({
        userId: "me",
        startHistoryId: lastHistoryId,
        historyTypes: ["messageAdded", "labelAdded", "labelRemoved"],
      });

      const history = hist.data.history || [];
      const allThreadIds: string[] = [];

      for (const rec of history) {
        // Handle message additions
        const adds = rec.messagesAdded || [];
        for (const add of adds) {
          const id = add.message?.threadId;
          if (id) allThreadIds.push(id);
        }

        // Handle label changes
        const labelsAdded = rec.labelsAdded || [];
        for (const labelAdd of labelsAdded) {
          const id = labelAdd.message?.threadId;
          if (id) allThreadIds.push(id);
        }

        const labelsRemoved = rec.labelsRemoved || [];
        for (const labelRemove of labelsRemoved) {
          const id = labelRemove.message?.threadId;
          if (id) allThreadIds.push(id);
        }
      }

      // Remove duplicates from thread IDs
      const uniqueThreadIds = Array.from(new Set(allThreadIds));

      // Process all thread IDs in parallel batches
      const batchSize = 10;
      const threadBatches = this.chunkArray(uniqueThreadIds, batchSize);

      for (const batch of threadBatches) {
        const batchPromises = batch.map(async (id) => {
          try {
            const res = await gmail.users.threads.get({
              userId: "me",
              id,
              format: "full",
            });
            return this.parseGmailThread(res.data);
          } catch (error) {
            console.error(
              `[GMAIL_INC_SYNC] Failed to fetch thread ${id}:`,
              error,
            );
            return null;
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        const validThreads = batchResults
          .filter(
            (result): result is PromiseFulfilledResult<EmailThread | null> =>
              result.status === "fulfilled" && result.value !== null,
          )
          .map((result) => result.value)
          .filter((thread): thread is EmailThread => thread !== null);

        emailThreads.push(...validThreads);
      }
    }

    if (currentHistoryId) {
      await this.databaseService.updateUserSyncState(userId, {
        gmailHistoryId: currentHistoryId,
        lastSyncTime: new Date(),
      });
    }

    return emailThreads;
  }

  private async getGmailInbox(
    accessToken: string,
    pageToken?: string,
    maxResults: number = 50,
  ): Promise<{ emails: EmailThread[]; nextPageToken?: string }> {
    const gmail = gmailClientFromAccessToken(accessToken);

    const list = await gmail.users.threads.list({
      userId: "me",
      q: "in:inbox",
      maxResults,
      pageToken,
    });

    const threads = list.data.threads || [];
    const nextPageToken = list.data.nextPageToken;

    // Process threads in parallel batches of 10 to avoid rate limiting
    const batchSize = 10;
    const threadBatches = this.chunkArray(threads, batchSize);
    const emailThreads: EmailThread[] = [];

    for (const batch of threadBatches) {
      const batchPromises = batch.map(async (t) => {
        if (!t.id) return null;
        try {
          const thread = await gmail.users.threads.get({
            userId: "me",
            id: t.id,
            format: "full",
          });
          return this.parseGmailThread(thread.data);
        } catch (error) {
          console.error(`[GMAIL_INBOX] Failed to fetch thread ${t.id}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      const validThreads = batchResults
        .filter(
          (result): result is PromiseFulfilledResult<EmailThread | null> =>
            result.status === "fulfilled" && result.value !== null,
        )
        .map((result) => result.value)
        .filter((thread): thread is EmailThread => thread !== null);

      emailThreads.push(...validThreads);
    }

    emailThreads.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return { emails: emailThreads, nextPageToken: nextPageToken || undefined };
  }

  private async getGmailMessage(
    accessToken: string,
    messageId: string,
  ): Promise<EmailMessage> {
    const gmail = gmailClientFromAccessToken(accessToken);
    const res = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });
    return this.parseGmailMessageContent(res.data as GmailMessageData);
  }

  private async markGmailMessageAsRead(
    accessToken: string,
    messageId: string,
  ): Promise<void> {
    const gmail = gmailClientFromAccessToken(accessToken);
    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: { removeLabelIds: ["UNREAD"] },
    });
  }

  // ---------- NEW: Efficient label ensure + batch modify ----------

  /** Ensure a set of label names exist and return a name -> id map. */
  private async ensureGmailLabels(
    accessToken: string,
    labelNames: string[],
  ): Promise<Map<string, string>> {
    const gmail = gmailClientFromAccessToken(accessToken);

    // Fetch once
    const res = await gmail.users.labels.list({ userId: "me" });
    const existing = new Map<string, string>();
    (res.data.labels || []).forEach((l) => {
      if (l.name && l.id) existing.set(l.name, l.id);
    });

    const missing = labelNames.filter((n) => !existing.has(n));

    // Create missing labels (no batch create in Gmail API)
    for (const name of missing) {
      try {
        const created = await gmail.users.labels.create({
          userId: "me",
          requestBody: {
            name,
            labelListVisibility: "labelShow",
            messageListVisibility: "show",
          },
        });
        if (created.data.name && created.data.id) {
          existing.set(created.data.name, created.data.id);
        }
      } catch (e) {
        // Race-safe: if another worker created it meanwhile, re-read once
        const reread = await gmail.users.labels.list({ userId: "me" });
        const hit = (reread.data.labels || []).find((l) => l.name === name);
        if (hit?.id) existing.set(name, hit.id);
        else throw e;
      }
    }

    return existing;
  }

  /** Return IDs of all ZEROHANDS_* labels (once). */
  private async getAllZeroHandsLabelIds(
    accessToken: string,
  ): Promise<string[]> {
    const gmail = gmailClientFromAccessToken(accessToken);
    const res = await gmail.users.labels.list({ userId: "me" });
    const all = res.data.labels || [];
    return all
      .filter((l) => (l.name || "").startsWith("ZEROHANDS_"))
      .map((l) => l.id!)
      .filter(Boolean);
  }

  /**
   * Batch update labels using individual thread modifications with minimal calls.
   * - "replace": remove ALL ZEROHANDS_* then add target set (no per-thread reads).
   * - "add": only add targets.
   * - "remove": only remove targets (if label exists).
   */
  // Utility: dedupe + stable sort for consistent grouping keys
  private uniqSorted = (arr: string[]) => Array.from(new Set(arr)).sort();

  private async batchUpdateGmailLabels(
    accessToken: string,
    ops: {
      threadId: string;
      labels: string[];
      operation?: "add" | "remove" | "replace";
    }[],
    chunkSize: number = 1000,
  ): Promise<void> {
    if (!ops.length) return;

    const gmail = gmailClientFromAccessToken(accessToken);

    // Normalize ops: expand to ZEROHANDS_*, default to 'replace'
    const normalized = ops.map((o) => ({
      threadId: o.threadId,
      labels: o.labels.map((l) => `ZEROHANDS_${l.toUpperCase()}`),
      operation: (o.operation ?? "replace") as "add" | "remove" | "replace",
    }));

    // Ensure labels exist for add/replace paths
    const needCreate = new Set<string>();
    for (const o of normalized) {
      if (o.operation === "add" || o.operation === "replace") {
        o.labels.forEach((n) => needCreate.add(n));
      }
    }
    const labelIdMap = await this.ensureGmailLabels(accessToken, [
      ...needCreate,
    ]);

    // IDs for all ZEROHANDS_* labels (used to remove in replace)
    const allZeroHandsIds = await this.getAllZeroHandsLabelIds(accessToken);

    // Group by identical add/remove sets
    const mkKey = (addIds: string[], removeIds: string[]) =>
      `A:${this.uniqSorted(addIds).join(",")}#R:${this.uniqSorted(removeIds).join(",")}`;

    const groups = new Map<
      string,
      { add: string[]; remove: string[]; ids: string[] }
    >();

    for (const o of normalized) {
      let addIds: string[] = [];
      let removeIds: string[] = [];

      if (o.operation === "replace") {
        // 1) compute what we'll ADD
        addIds = o.labels
          .map((name) => labelIdMap.get(name))
          .filter((x): x is string => Boolean(x));

        // 2) remove = ALL ZEROHANDS minus the ones we are adding
        const addSet = new Set(addIds);
        removeIds = allZeroHandsIds.filter((id) => !addSet.has(id));
      } else if (o.operation === "add") {
        addIds = o.labels
          .map((name) => labelIdMap.get(name))
          .filter((x): x is string => Boolean(x));
        removeIds = [];
      } else {
        // remove
        addIds = [];
        // Only include known IDs; unknown labels -> no-op
        removeIds = o.labels
          .map((name) => labelIdMap.get(name))
          .filter((x): x is string => Boolean(x));
      }

      // Avoid illegal overlap (defensive, though replace logic above already prevents it)
      if (addIds.length && removeIds.length) {
        const addSet = new Set(addIds);
        removeIds = removeIds.filter((id) => !addSet.has(id));
      }

      // Skip no-op groups (shouldn't happen for replace/add, but safe)
      if (!addIds.length && !removeIds.length) continue;

      const key = mkKey(addIds, removeIds);
      const cur = groups.get(key);
      if (cur) cur.ids.push(o.threadId);
      else
        groups.set(key, { add: addIds, remove: removeIds, ids: [o.threadId] });
    }

    // Execute individual thread modifications (Gmail API doesn't have threads.batchModify)
    for (const { add, remove, ids } of groups.values()) {
      const modifyPromises = ids.map(async (threadId) => {
        try {
          await gmail.users.threads.modify({
            userId: "me",
            id: threadId,
            requestBody: {
              addLabelIds: add.length ? add : undefined,
              removeLabelIds: remove.length ? remove : undefined,
            },
          });
        } catch (error) {
          console.error(
            `[GMAIL_THREAD_MODIFY] Failed to modify thread ${threadId}:`,
            error,
          );
        }
      });

      // Process in chunks to avoid overwhelming the API
      for (let i = 0; i < modifyPromises.length; i += chunkSize) {
        const chunk = modifyPromises.slice(i, i + chunkSize);
        await Promise.allSettled(chunk);
      }
    }
  }

  // ---------- Existing helpers kept for compatibility ----------

  // Use the new batcher (single-thread wrapper)
  private async updateGmailThreadLabels(
    accessToken: string,
    threadId: string,
    labels: string[],
    operation: "add" | "remove" | "replace" = "replace",
  ): Promise<void> {
    await this.batchUpdateGmailLabels(accessToken, [
      { threadId, labels, operation },
    ]);
  }

  private async sendGmailMessage(
    accessToken: string,
    to: string,
    subject: string,
    body: string,
    isHtml: boolean = false,
  ): Promise<void> {
    const gmail = gmailClientFromAccessToken(accessToken);

    const rfc822 = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset=UTF-8`,
      "",
      body,
    ].join("\n");

    const raw = Buffer.from(rfc822)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
  }

  async setupGmailPushNotifications(userId: string): Promise<void> {
    const user = await this.databaseService.findUserByEmail(userId);
    if (!user) throw new Error(`User not found: ${userId}`);
    if (user.provider !== AuthProvider.GOOGLE)
      throw new Error(`Not a Gmail user`);

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    if (!projectId || projectId === "your-google-cloud-project-id") {
      throw new Error("GOOGLE_CLOUD_PROJECT_ID not configured");
    }
    const topicName = projectId.startsWith("projects/")
      ? projectId
      : `projects/${projectId}/topics/gmail-notifications`;

    const gmail = gmailClientFromAccessToken(user.accessToken);
    await gmail.users.watch({
      userId: "me",
      requestBody: {
        topicName,
        labelIds: ["INBOX"],
        labelFilterAction: "include",
      },
    });
  }

  // --------------- Outlook / Microsoft Graph (SDK) ---------------

  private async getOutlookInitialSync(
    accessToken: string,
    userId: string,
    dateFilter: string,
    onProgress?: (progress: {
      processed: number;
      total: number;
      currentEmail: string;
    }) => void,
  ): Promise<EmailThread[]> {
    const client = graphClientFromAccessToken(accessToken);
    const emailThreads: EmailThread[] = [];

    try {
      console.log(
        `[OUTLOOK_INITIAL_SYNC] Starting initial sync from ${dateFilter}`,
      );

      // Get all messages from the past month
      let skip = 0;
      const pageSize = 50;
      let hasMore = true;
      let totalProcessed = 0;

      while (hasMore) {
        const messages = await client
          .api("/me/messages")
          .filter(`receivedDateTime ge ${dateFilter}T00:00:00Z`)
          .top(pageSize)
          .skip(skip)
          .get();

        const messageList = messages.value || [];
        if (messageList.length === 0) {
          hasMore = false;
          break;
        }

        console.log(
          `[OUTLOOK_INITIAL_SYNC] Processing batch ${Math.floor(skip / pageSize) + 1}, ${messageList.length} messages`,
        );

        // Process messages in parallel batches
        const batchSize = 10;
        const messageBatches = this.chunkArray(messageList, batchSize);

        for (
          let batchIndex = 0;
          batchIndex < messageBatches.length;
          batchIndex++
        ) {
          const batch = messageBatches[batchIndex];
          const batchPromises = batch.map(async (message) => {
            try {
              return await this.parseOutlookMessage(message, accessToken);
            } catch (error) {
              console.error(
                `[OUTLOOK_INITIAL_SYNC] Failed to parse message ${message.id}:`,
                error,
              );
              return null;
            }
          });

          const batchResults = await Promise.allSettled(batchPromises);
          const validThreads = batchResults
            .filter(
              (result): result is PromiseFulfilledResult<EmailThread | null> =>
                result.status === "fulfilled" && result.value !== null,
            )
            .map((result) => result.value)
            .filter((thread): thread is EmailThread => thread !== null);

          emailThreads.push(...validThreads);
          totalProcessed += batch.length;

          // Report progress
          if (onProgress && validThreads.length > 0) {
            onProgress({
              processed: totalProcessed,
              total:
                totalProcessed + (messages["@odata.nextLink"] ? pageSize : 0),
              currentEmail: validThreads[0].subject || "Processing...",
            });
          }

          // Add a small delay between batches to avoid rate limits
          if (batchIndex < messageBatches.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        skip += pageSize;
        hasMore = !!messages["@odata.nextLink"];
      }

      console.log(
        `[OUTLOOK_INITIAL_SYNC] Completed processing ${emailThreads.length} threads`,
      );
    } catch (error) {
      console.error(`[OUTLOOK_INITIAL_SYNC] Error:`, error);
      throw error;
    }

    return emailThreads;
  }

  private async getOutlookIncrementalSync(
    accessToken: string,
    userId: string,
    maxResults: number = 50,
  ): Promise<EmailThread[]> {
    const client = graphClientFromAccessToken(accessToken);
    const syncState = await this.databaseService.getUserSyncState(userId);
    const lastDeltaToken = syncState.outlookDeltaToken;

    if (!lastDeltaToken) {
      const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const data = await client
        .api("/me/messages")
        .filter(`receivedDateTime ge ${yesterday}`)
        .orderby("receivedDateTime desc")
        .top(maxResults)
        .get();

      const messages: OutlookMessageData[] = data.value || [];
      const parsedMessages = await Promise.all(
        messages.map((m) => this.parseOutlookMessage(m, accessToken)),
      );
      return parsedMessages;
    }

    const delta = await client
      .api("/me/messages/delta")
      .query({ $deltatoken: lastDeltaToken })
      .get();

    const messages: (OutlookMessageData & {
      "@odata.type"?: string;
      "@removed"?: boolean;
    })[] = delta.value || [];

    const newOnes = messages.filter(
      (m) => m["@odata.type"] === "#microsoft.graph.message" && !m["@removed"],
    );

    // Persist next delta token if present
    const deltaLink: string | undefined = delta["@odata.deltaLink"];
    if (deltaLink) {
      const nextToken = (deltaLink.split("$deltatoken=")[1] || "").trim();
      if (nextToken) {
        await this.databaseService.updateUserSyncState(userId, {
          outlookDeltaToken: nextToken,
          lastSyncTime: new Date(),
        });
      }
    }

    const parsedMessages = await Promise.all(
      newOnes.map((m) => this.parseOutlookMessage(m, accessToken)),
    );
    return parsedMessages;
  }

  private async getOutlookInbox(
    accessToken: string,
    pageToken?: string,
    maxResults: number = 50,
  ): Promise<{ emails: EmailThread[]; nextPageToken?: string }> {
    const client = graphClientFromAccessToken(accessToken);

    const skip = pageToken ? Number(pageToken) : 0;
    const data = await client
      .api("/me/messages")
      .orderby("receivedDateTime desc")
      .top(maxResults)
      .query(skip ? { $skip: skip } : {})
      .get();

    const emails: EmailThread[] = await Promise.all(
      (data.value as OutlookMessageData[]).map((m) =>
        this.parseOutlookMessage(m, accessToken),
      ),
    );

    const nextPageToken =
      data.value && data.value.length === maxResults
        ? String(skip + maxResults)
        : undefined;

    return { emails, nextPageToken };
  }

  private async getOutlookMessage(
    accessToken: string,
    messageId: string,
  ): Promise<EmailMessage> {
    const client = graphClientFromAccessToken(accessToken);
    const data = (await client
      .api(`/me/messages/${messageId}`)
      .get()) as OutlookMessageData;
    return this.parseOutlookMessageContent(data, accessToken);
  }

  private async markOutlookMessageAsRead(
    accessToken: string,
    messageId: string,
  ): Promise<void> {
    const client = graphClientFromAccessToken(accessToken);
    await client.api(`/me/messages/${messageId}`).patch({ isRead: true });
  }

  private async updateOutlookMessageCategories(
    accessToken: string,
    messageId: string,
    categories: string[],
  ): Promise<void> {
    const client = graphClientFromAccessToken(accessToken);
    await client.api(`/me/messages/${messageId}`).patch({ categories });
  }

  private async getOutlookMessageCategories(
    accessToken: string,
    messageId: string,
  ): Promise<string[]> {
    const client = graphClientFromAccessToken(accessToken);
    const msg = (await client
      .api(`/me/messages/${messageId}`)
      .get()) as OutlookMessageData;
    return msg.categories || [];
  }

  private async sendOutlookMessage(
    accessToken: string,
    to: string,
    subject: string,
    body: string,
    isHtml: boolean = false,
  ): Promise<void> {
    const client = graphClientFromAccessToken(accessToken);
    await client.api("/me/sendMail").post({
      message: {
        subject,
        body: {
          contentType: isHtml ? "HTML" : "Text",
          content: body,
        },
        toRecipients: [{ emailAddress: { address: to } }],
      },
    });
  }

  async setupOutlookWebhook(userId: string, webhookUrl: string): Promise<void> {
    const user = await this.databaseService.findUserByEmail(userId);
    if (!user) throw new Error(`User not found: ${userId}`);
    if (user.provider !== AuthProvider.OUTLOOK)
      throw new Error("Not an Outlook user");

    const client = graphClientFromAccessToken(user.accessToken);
    await client.api("/subscriptions").post({
      changeType: "created",
      notificationUrl: webhookUrl,
      resource: "me/messages",
      expirationDateTime: new Date(Date.now() + 4230 * 60 * 1000).toISOString(), // ~3 days
      clientState: `outlook-${user.id}`,
    });
  }

  // --------------- Shared logic (unchanged APIs to callers) ---------------

  async getInboxEmails(
    userId: string,
    pageToken?: string,
    maxResults: number = 50,
    onEmailSaved?: (email: EmailThread) => void,
  ): Promise<{ emails: EmailThread[]; nextPageToken?: string }> {
    const user = await this.databaseService.findUserByEmail(userId);
    if (!user) throw new Error("User not found");

    const result =
      user.provider === AuthProvider.GOOGLE
        ? await this.getGmailInbox(user.accessToken, pageToken, maxResults)
        : user.provider === AuthProvider.OUTLOOK
          ? await this.getOutlookInbox(user.accessToken, pageToken, maxResults)
          : (() => {
              throw new Error("Unsupported email provider");
            })();

    await this.saveEmailsToDatabase(user.id, result.emails, onEmailSaved);
    return result;
  }

  private async saveEmailsToDatabase(
    userId: string,
    emails: EmailThread[],
    onEmailSaved?: (email: EmailThread) => void,
  ): Promise<void> {
    const user = await this.databaseService.findUserById(userId);
    if (!user) throw new Error("User not found");

    // Process emails in batches of 100 for better performance
    const batchSize = 100;
    const batches = this.chunkArray(emails, batchSize);

    for (const batch of batches) {
      await this.processEmailBatch(user, batch, onEmailSaved);
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async processEmailBatch(
    user: { id: string; provider: AuthProvider; accessToken: string },
    emails: EmailThread[],
    onEmailSaved?: (email: EmailThread) => void,
  ): Promise<void> {
    // 1) Upsert threads in parallel
    const dbPromises = emails.map(async (email) => {
      try {
        const threadData: CreateEmailThreadData = {
          externalId: email.id,
          subject: email.subject,
          sender: email.sender,
          senderEmail: email.senderEmail,
          preview: email.preview,
          timestamp: email.timestamp,
          isRead: email.isRead,
          isImportant: email.isImportant,
          hasAttachments: email.hasAttachments,
          userId: user.id,
        };

        const savedThread =
          await this.databaseService.upsertEmailThread(threadData);
        return { email, savedThread };
      } catch (e) {
        console.error(`[EMAIL_SERVICE] Save failed for ${email.id}:`, e);
        return null;
      }
    });

    const dbResults = await Promise.allSettled(dbPromises);
    const successfulResults = dbResults
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<{
          email: EmailThread;
          savedThread: PrismaEmailThread;
        } | null> => result.status === "fulfilled" && result.value !== null,
      )
      .map((result) => result.value)
      .filter(
        (
          item,
        ): item is { email: EmailThread; savedThread: PrismaEmailThread } =>
          item !== null,
      );

    // 2) Process individual messages from the threads we already fetched
    // Note: The threads were already fetched with format: "full" and include individual messages
    const messageProcessingPromises = successfulResults.map(
      async ({ email, savedThread }) => {
        try {
          // Get the individual messages from the thread data
          const threadMessages = email.messages || [];

          // Process each individual message
          const messageLabels: string[] = [];
          for (const message of threadMessages) {
            try {
              // Generate labels using full message content
              const labels = await generateLabels(
                message.subject,
                message.body,
              );

              // Save individual email message to database
              const savedEmail = await this.saveEmailMessageToDatabase(
                user.id,
                message,
                savedThread.id,
              );

              // Add individual email labels to database
              if (savedEmail) {
                await this.databaseService.addEmailLabels(
                  savedEmail.id,
                  labels,
                );
              }

              // Collect labels for thread-level aggregation
              messageLabels.push(...labels);
            } catch (e) {
              console.error(
                `[EMAIL_SERVICE] Failed to process message ${message.id}:`,
                e,
              );
            }
          }

          // Remove duplicates and update thread-level labels
          const uniqueLabels = Array.from(new Set(messageLabels));
          await this.databaseService.addEmailThreadLabels(
            savedThread.id,
            uniqueLabels,
          );

          email.labels = uniqueLabels;
          onEmailSaved?.(email);
        } catch (e) {
          console.error(
            `[EMAIL_SERVICE] Thread processing failed for ${email.id}:`,
            e,
          );
        }
      },
    );

    await Promise.allSettled(messageProcessingPromises);
  }

  async updateMessageLabels(
    user: { provider: AuthProvider; accessToken: string },
    threadId: string,
    labels: string[],
    operation: "add" | "remove" | "replace" = "replace",
  ): Promise<void> {
    if (user.provider === AuthProvider.GOOGLE) {
      await this.updateGmailThreadLabels(
        user.accessToken,
        threadId,
        labels,
        operation,
      );
    } else if (user.provider === AuthProvider.OUTLOOK) {
      await this.updateOutlookMessageLabels(
        user.accessToken,
        threadId,
        labels,
        operation,
      );
    }
  }

  private async updateOutlookMessageLabels(
    accessToken: string,
    messageId: string,
    labels: string[],
    operation: "add" | "remove" | "replace" = "replace",
  ): Promise<void> {
    const existing = await this.getOutlookMessageCategories(
      accessToken,
      messageId,
    );
    const zExisting = existing.filter((c) => c.startsWith("ZEROHANDS_"));

    let categoriesToAdd: string[] = [];
    let categoriesToRemove: string[] = [];

    if (operation === "replace") {
      categoriesToRemove = zExisting;
      categoriesToAdd = labels.map((l) => `ZEROHANDS_${l.toUpperCase()}`);
    } else if (operation === "add") {
      const next = labels.map((l) => `ZEROHANDS_${l.toUpperCase()}`);
      categoriesToAdd = next.filter((c) => !zExisting.includes(c));
    } else {
      categoriesToRemove = labels.map((l) => `ZEROHANDS_${l.toUpperCase()}`);
    }

    if (categoriesToAdd.length || categoriesToRemove.length) {
      const finalCategories = existing
        .filter((c) => !categoriesToRemove.includes(c))
        .concat(categoriesToAdd);
      await this.updateOutlookMessageCategories(
        accessToken,
        messageId,
        finalCategories,
      );
    }
  }

  async updateMessageLabelsByUser(
    userEmail: string,
    threadId: string,
    labels: string[],
    operation: "add" | "remove" | "replace" = "add",
  ): Promise<void> {
    const user = await this.databaseService.findUserByEmail(userEmail);
    if (!user) throw new Error("User not found");

    await this.updateMessageLabels(user, threadId, labels, operation);

    const thread = await this.databaseService.getEmailThreadByExternalId(
      user.id,
      threadId,
    );
    if (thread) {
      if (operation === "replace") {
        await this.databaseService.updateEmailThreadLabels(thread.id, labels);
      } else if (operation === "add") {
        await this.databaseService.addEmailThreadLabels(thread.id, labels);
      } else {
        await this.databaseService.removeEmailThreadLabels(thread.id, labels);
      }
    }
  }

  async getEmailContent(
    userId: string,
    messageId: string,
  ): Promise<EmailMessage> {
    const user = await this.databaseService.findUserByEmail(userId);
    if (!user) throw new Error("User not found");

    // First, try to get email content from database
    try {
      const dbEmail = await this.databaseService.getEmailByExternalId(
        user.id,
        messageId,
      );

      if (dbEmail) {
        console.log(
          `[EMAIL_SERVICE] Found email content in database: ${messageId}`,
        );

        // Get attachments for this email
        const attachments = await this.databaseService.getEmailAttachments(
          dbEmail.id,
        );

        // Convert database email to EmailMessage format
        return {
          id: dbEmail.externalId,
          threadId: dbEmail.threadId,
          subject: dbEmail.subject,
          sender: dbEmail.sender,
          senderEmail: dbEmail.senderEmail,
          recipient: dbEmail.recipient,
          recipientEmail: dbEmail.recipientEmail,
          timestamp: dbEmail.timestamp,
          body: dbEmail.body,
          htmlBody: dbEmail.htmlBody || undefined,
          attachments: attachments.map((att) => ({
            id: att.externalId,
            filename: att.filename,
            mimeType: att.mimeType,
            size: att.size,
            downloadUrl: att.downloadUrl || undefined,
          })),
          isRead: dbEmail.isRead,
        };
      }
    } catch (dbError) {
      console.error(
        `[EMAIL_SERVICE] Database error, falling back to API:`,
        dbError,
      );
    }

    // If not found in database, this suggests the email wasn't processed during initial sync
    // This should rarely happen if the initial processing worked correctly
    console.log(
      `[EMAIL_SERVICE] Email content not found in database, fetching from API: ${messageId}. This suggests the email wasn't processed during initial sync.`,
    );

    const email =
      user.provider === AuthProvider.GOOGLE
        ? await this.getGmailMessage(user.accessToken, messageId)
        : user.provider === AuthProvider.OUTLOOK
          ? await this.getOutlookMessage(user.accessToken, messageId)
          : (() => {
              throw new Error("Unsupported email provider");
            })();

    await this.saveEmailContentToDatabase(user.id, email);
    return email;
  }

  async getThreadEmails(
    userId: string,
    threadId: string,
  ): Promise<EmailMessage[]> {
    const user = await this.databaseService.findUserByEmail(userId);
    if (!user) throw new Error("User not found");

    console.log(
      `[EMAIL_SERVICE] Getting thread emails for threadId: ${threadId}, userId: ${user.id}`,
    );

    // Get the thread to find the external thread ID
    const thread = await this.databaseService.getEmailThreadByExternalId(
      user.id,
      threadId,
    );
    if (!thread) {
      console.log(`[EMAIL_SERVICE] Thread not found in database: ${threadId}`);
      throw new Error("Thread not found");
    }

    console.log(
      `[EMAIL_SERVICE] Found thread in database: ${thread.id} (${thread.externalId})`,
    );

    // Get all emails in the thread from database
    const dbEmails = await this.databaseService.getEmailsByThreadId(
      thread.id,
      user.id,
    );

    console.log(
      `[EMAIL_SERVICE] Found ${dbEmails.length} emails in thread from database`,
    );

    // Convert database emails to EmailMessage format with attachments
    const emailsWithAttachments = await Promise.all(
      dbEmails.map(async (email) => {
        const attachments = await this.databaseService.getEmailAttachments(
          email.id,
        );
        return {
          id: email.externalId,
          threadId: email.threadId,
          subject: email.subject,
          sender: email.sender,
          senderEmail: email.senderEmail,
          recipient: email.recipient,
          recipientEmail: email.recipientEmail,
          timestamp: email.timestamp,
          body: email.body,
          htmlBody: email.htmlBody || undefined,
          attachments: attachments.map((att) => ({
            id: att.externalId,
            filename: att.filename,
            mimeType: att.mimeType,
            size: att.size,
            downloadUrl: att.downloadUrl || undefined,
          })),
          isRead: email.isRead,
        };
      }),
    );

    return emailsWithAttachments;
  }

  private async saveEmailContentToDatabase(
    userId: string,
    email: EmailMessage,
  ): Promise<void> {
    try {
      const threadData: CreateEmailThreadData = {
        externalId: email.threadId,
        subject: email.subject,
        sender: email.sender,
        senderEmail: email.senderEmail,
        preview:
          email.body.substring(0, 100) + (email.body.length > 100 ? "..." : ""),
        timestamp: email.timestamp,
        isRead: email.isRead,
        isImportant: false,
        hasAttachments: Boolean(
          email.attachments && email.attachments.length > 0,
        ),
        userId,
      };

      const emailThread =
        await this.databaseService.upsertEmailThread(threadData);

      const emailData: CreateEmailData = {
        externalId: email.id,
        threadId: email.threadId,
        subject: email.subject,
        sender: email.sender,
        senderEmail: email.senderEmail,
        recipient: email.recipient,
        recipientEmail: email.recipientEmail,
        timestamp: email.timestamp,
        body: email.body,
        htmlBody: email.htmlBody,
        isRead: email.isRead,
        userId,
        emailThreadId: emailThread.id,
      };

      const savedEmail = await this.databaseService.upsertEmail(emailData);

      // Save attachments if they exist
      if (email.attachments && email.attachments.length > 0) {
        console.log(
          `[EMAIL_SERVICE] Saving ${email.attachments.length} attachments for email: ${email.id}`,
        );

        for (const attachment of email.attachments) {
          try {
            const attachmentData: CreateEmailAttachmentData = {
              externalId: attachment.id,
              filename: attachment.filename,
              mimeType: attachment.mimeType,
              size: attachment.size,
              downloadUrl: attachment.downloadUrl,
              emailId: savedEmail.id,
            };

            await this.databaseService.upsertEmailAttachment(attachmentData);
            console.log(
              `[EMAIL_SERVICE] Successfully saved attachment: ${attachment.filename}`,
            );
          } catch (attachmentError) {
            console.error(
              `[EMAIL_SERVICE] Error saving attachment ${attachment.filename}:`,
              attachmentError,
            );
          }
        }
      }
    } catch (e) {
      console.error("Error saving email content to database:", e);
    }
  }

  private async saveEmailMessageToDatabase(
    userId: string,
    email: EmailMessage,
    emailThreadId: string,
  ): Promise<Email | null> {
    try {
      console.log(
        `[EMAIL_SERVICE] Saving email message to database: ${email.id} (externalId: ${email.id})`,
      );

      const emailData: CreateEmailData = {
        externalId: email.id,
        threadId: email.threadId,
        subject: email.subject,
        sender: email.sender,
        senderEmail: email.senderEmail,
        recipient: email.recipient,
        recipientEmail: email.recipientEmail,
        timestamp: email.timestamp,
        body: email.body,
        htmlBody: email.htmlBody,
        isRead: email.isRead,
        userId,
        emailThreadId,
      };

      const savedEmail = await this.databaseService.upsertEmail(emailData);
      console.log(
        `[EMAIL_SERVICE] Successfully saved email message: ${email.id}`,
      );

      // Save attachments if they exist
      if (email.attachments && email.attachments.length > 0) {
        console.log(
          `[EMAIL_SERVICE] Saving ${email.attachments.length} attachments for email: ${email.id}`,
        );

        for (const attachment of email.attachments) {
          try {
            const attachmentData: CreateEmailAttachmentData = {
              externalId: attachment.id,
              filename: attachment.filename,
              mimeType: attachment.mimeType,
              size: attachment.size,
              downloadUrl: attachment.downloadUrl,
              emailId: savedEmail.id,
            };

            await this.databaseService.upsertEmailAttachment(attachmentData);
            console.log(
              `[EMAIL_SERVICE] Successfully saved attachment: ${attachment.filename}`,
            );
          } catch (attachmentError) {
            console.error(
              `[EMAIL_SERVICE] Error saving attachment ${attachment.filename}:`,
              attachmentError,
            );
          }
        }
      }

      return savedEmail;
    } catch (e) {
      console.error(`Error saving email message ${email.id} to database:`, e);
      return null;
    }
  }

  async markEmailAsRead(userId: string, messageId: string): Promise<void> {
    const user = await this.databaseService.findUserByEmail(userId);
    if (!user) throw new Error("User not found");

    try {
      // Mark as read in the external service
      if (user.provider === AuthProvider.GOOGLE) {
        await this.markGmailMessageAsRead(user.accessToken, messageId);
      } else if (user.provider === AuthProvider.OUTLOOK) {
        await this.markOutlookMessageAsRead(user.accessToken, messageId);
      } else {
        throw new Error("Unsupported email provider");
      }

      // Update local database
      await this.databaseService.updateEmailReadStatus(
        user.id,
        messageId,
        true,
      );
      console.log(
        `[EMAIL_SERVICE] Successfully marked email ${messageId} as read`,
      );
    } catch (error) {
      console.error(
        `[EMAIL_SERVICE] Error marking email ${messageId} as read:`,
        error,
      );
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
    const user = await this.databaseService.findUserByEmail(userId);
    if (!user) throw new Error("User not found");

    if (user.provider === AuthProvider.GOOGLE) {
      await this.sendGmailMessage(user.accessToken, to, subject, body, isHtml);
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
  }

  // ---------------- Parsers ----------------

  private parseGmailThread(
    threadData: gmail_v1.Schema$Thread,
  ): EmailThread | null {
    try {
      if (!threadData.messages || threadData.messages.length === 0) {
        return null;
      }

      // Get the most recent message in the thread
      const latestMessage = threadData.messages[threadData.messages.length - 1];
      const headers = latestMessage.payload?.headers || [];
      const getHeader = (n: string) =>
        headers.find((h) => h.name?.toLowerCase() === n.toLowerCase())?.value ||
        "";

      const subject = getHeader("Subject");
      const from = getHeader("From");
      const date = getHeader("Date");

      const fromMatch = from.match(/^(.*?)\s*<(.+)>$/) || from.match(/^(.+)$/);
      const senderName = fromMatch ? fromMatch[1].trim() : from;
      const senderEmail =
        fromMatch && (fromMatch as RegExpMatchArray)[2]
          ? (fromMatch as RegExpMatchArray)[2]
          : from;

      // Use the thread's snippet if available, otherwise use the latest message's snippet
      const snippet = threadData.snippet || latestMessage.snippet || "";

      // Check if any message in the thread is unread
      const isRead = !threadData.messages.some((msg) =>
        (msg.labelIds || []).includes("UNREAD"),
      );

      // Check if any message in the thread is important
      const isImportant = threadData.messages.some((msg) =>
        (msg.labelIds || []).includes("IMPORTANT"),
      );

      // Check if any message in the thread has attachments
      const hasAttachments = threadData.messages.some(
        (msg) =>
          !!msg.payload?.parts?.some(
            (p) => p.filename || p.parts?.some((pp) => pp.filename),
          ),
      );

      // Get all unique labels from all messages in the thread
      const allLabels = new Set<string>();
      threadData.messages.forEach((msg) => {
        (msg.labelIds || []).forEach((label) => allLabels.add(label));
      });

      // Extract individual messages from the thread
      const messages: EmailMessage[] = [];
      if (threadData.messages) {
        for (const messageData of threadData.messages) {
          try {
            const message = this.parseGmailMessageContent(
              messageData as GmailMessageData,
            );
            messages.push(message);
          } catch (e) {
            console.error(
              `Error parsing Gmail message ${messageData.id} in thread:`,
              e,
            );
          }
        }
      }

      return {
        id: threadData.id!,
        subject: subject || "(No Subject)",
        sender: senderName,
        senderEmail,
        preview:
          snippet.substring(0, 100) + (snippet.length > 100 ? "..." : ""),
        timestamp: new Date(date),
        isRead,
        isImportant,
        hasAttachments,
        labels: Array.from(allLabels),
        messages, // Include individual messages
      };
    } catch (e) {
      console.error("parseGmailThread error:", e);
      return null;
    }
  }

  private parseGmailMessageContent(
    messageData: GmailMessageData,
  ): EmailMessage {
    const headers = messageData.payload?.headers || [];
    const getHeader = (n: string) =>
      headers.find((h) => h.name?.toLowerCase() === n.toLowerCase())?.value ||
      "";

    const subject = getHeader("Subject");
    const from = getHeader("From");
    const to = getHeader("To");
    const date = getHeader("Date");

    const fromMatch = from.match(/^(.*?)\s*<(.+)>$/) || from.match(/^(.+)$/);
    const senderName = fromMatch ? fromMatch[1].trim() : from;
    const senderEmail =
      fromMatch && (fromMatch as RegExpMatchArray)[2]
        ? (fromMatch as RegExpMatchArray)[2]
        : from;

    const toMatch = to.match(/^(.*?)\s*<(.+)>$/) || to.match(/^(.+)$/);
    const recipientName = toMatch ? toMatch[1].trim() : to;
    const recipientEmail =
      toMatch && (toMatch as RegExpMatchArray)[2]
        ? (toMatch as RegExpMatchArray)[2]
        : to;

    const body = this.extractGmailBody(messageData.payload);
    const html = this.extractGmailHtmlBody(messageData.payload);
    const attachments = this.extractGmailAttachments(messageData.payload);

    return {
      id: messageData.id!,
      threadId: messageData.threadId || messageData.id!,
      subject: subject || "(No Subject)",
      sender: senderName,
      senderEmail,
      recipient: recipientName,
      recipientEmail,
      timestamp: new Date(date),
      body: body || "",
      htmlBody: html,
      attachments,
      isRead: !(messageData.labelIds || []).includes("UNREAD"),
    };
  }

  private async parseOutlookMessage(
    messageData: OutlookMessageData,
    accessToken?: string,
  ): Promise<EmailThread> {
    const from = messageData.from?.emailAddress || {};
    const senderName = from.name || from.address || "Unknown";
    const senderEmail = from.address || "";

    // Parse the individual message content
    const message = await this.parseOutlookMessageContent(
      messageData,
      accessToken,
    );

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
      messages: [message], // Include the individual message
    };
  }

  private async parseOutlookMessageContent(
    messageData: OutlookMessageData,
    accessToken?: string,
  ): Promise<EmailMessage> {
    const from = messageData.from?.emailAddress || {};
    const to = messageData.toRecipients?.[0]?.emailAddress || {};

    // Fetch attachments if access token is provided
    let attachments: EmailAttachment[] = [];
    if (accessToken && messageData.hasAttachments) {
      try {
        attachments = await this.getOutlookAttachments(
          accessToken,
          messageData.id,
        );
      } catch (error) {
        console.error(
          `[OUTLOOK_PARSE] Error fetching attachments for message ${messageData.id}:`,
          error,
        );
      }
    }

    return {
      id: messageData.id,
      threadId: messageData.id, // Graph "threads" differ; using messageId for now
      subject: messageData.subject || "(No Subject)",
      sender: from.name || from.address || "Unknown",
      senderEmail: from.address || "",
      recipient: to.name || to.address || "Unknown",
      recipientEmail: to.address || "",
      timestamp: new Date(messageData.receivedDateTime),
      body: messageData.body?.content || "",
      htmlBody:
        messageData.body?.contentType?.toLowerCase() === "html"
          ? messageData.body?.content
          : undefined,
      attachments,
      isRead: messageData.isRead,
    };
  }

  private extractGmailBody(payload?: gmail_v1.Schema$MessagePart): string {
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
          const nested = this.extractGmailBody(part);
          if (nested) return nested;
        }
      }
    }
    return "";
  }

  private extractGmailHtmlBody(
    payload?: gmail_v1.Schema$MessagePart,
  ): string | undefined {
    if (!payload) return undefined;
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === "text/html" && part.body?.data) {
          return Buffer.from(part.body.data, "base64").toString();
        }
        if (part.parts) {
          const nested = this.extractGmailHtmlBody(part);
          if (nested) return nested;
        }
      }
    }
    return undefined;
  }

  private extractGmailAttachments(
    payload?: gmail_v1.Schema$MessagePart,
  ): EmailAttachment[] {
    const attachments: EmailAttachment[] = [];

    if (!payload) return attachments;

    // Check if this part itself is an attachment
    if (payload.filename && payload.body?.attachmentId) {
      attachments.push({
        id: payload.body.attachmentId,
        filename: payload.filename,
        mimeType: payload.mimeType || "application/octet-stream",
        size: payload.body.size || 0,
        downloadUrl: undefined, // Will be set when we fetch the attachment
      });
    }

    // Recursively check nested parts
    if (payload.parts) {
      for (const part of payload.parts) {
        const nestedAttachments = this.extractGmailAttachments(part);
        attachments.push(...nestedAttachments);
      }
    }

    return attachments;
  }

  private async getGmailAttachmentDownloadUrl(
    accessToken: string,
    messageId: string,
    attachmentId: string,
  ): Promise<string> {
    const gmail = gmailClientFromAccessToken(accessToken);
    await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId,
    });

    // Gmail returns the attachment data directly, not a download URL
    // We'll store the attachment data or create a temporary download URL
    // For now, we'll return a placeholder that indicates we have the data
    return `gmail://${messageId}/${attachmentId}`;
  }

  private async getOutlookAttachments(
    accessToken: string,
    messageId: string,
  ): Promise<EmailAttachment[]> {
    const client = graphClientFromAccessToken(accessToken);
    const attachments: EmailAttachment[] = [];

    try {
      const data = await client
        .api(`/me/messages/${messageId}/attachments`)
        .get();

      if (data.value && Array.isArray(data.value)) {
        for (const attachment of data.value) {
          attachments.push({
            id: attachment.id,
            filename: attachment.name || "unknown",
            mimeType: attachment.contentType || "application/octet-stream",
            size: attachment.size || 0,
            downloadUrl: attachment.contentBytes
              ? `data:${attachment.contentType};base64,${attachment.contentBytes}`
              : undefined,
          });
        }
      }
    } catch (error) {
      console.error(
        `[OUTLOOK_ATTACHMENTS] Error fetching attachments for message ${messageId}:`,
        error,
      );
    }

    return attachments;
  }
}
