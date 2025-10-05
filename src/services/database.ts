import {
  PrismaClient,
  User,
  AuthProvider,
  EmailThread,
  Email,
  EmailThreadLabel,
  Prisma,
} from "@prisma/client";

export interface CreateUserData {
  email: string;
  name: string;
  picture?: string;
  provider: AuthProvider;
  providerId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  scope: string;
  verifiedEmail: boolean;
}

export interface UpdateUserData {
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  scope?: string;
  verifiedEmail?: boolean;
}

export interface CreateEmailThreadData {
  externalId: string;
  subject: string;
  sender: string;
  senderEmail: string;
  preview: string;
  timestamp: Date;
  isRead: boolean;
  isImportant: boolean;
  hasAttachments: boolean;
  userId: string;
}

export interface CreateEmailData {
  externalId: string;
  threadId: string;
  subject: string;
  sender: string;
  senderEmail: string;
  recipient: string;
  recipientEmail: string;
  timestamp: Date;
  body: string;
  htmlBody?: string;
  isRead: boolean;
  userId: string;
  emailThreadId: string;
}

let prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (prisma) return prisma;
  prisma = new PrismaClient();

  console.log(`[DATABASE] Prisma client created successfully`);
  return prisma!;
}

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    console.log(`[DATABASE] Initializing DatabaseService`);
    this.prisma = getPrisma();
    console.log(`[DATABASE] DatabaseService initialized successfully`);
  }

  async createUser(userData: CreateUserData): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: userData,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async upsertUser(userData: CreateUserData): Promise<User> {
    try {
      return await this.prisma.user.upsert({
        where: {
          provider_providerId: {
            provider: userData.provider,
            providerId: userData.providerId,
          },
        },
        update: {
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          accessToken: userData.accessToken,
          refreshToken: userData.refreshToken,
          tokenExpiry: userData.tokenExpiry,
          scope: userData.scope,
          verifiedEmail: userData.verifiedEmail,
          updatedAt: new Date(),
        },
        create: userData,
      });
    } catch (error) {
      console.error("Error upserting user:", error);
      throw error;
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    try {
      console.log(`[DATABASE] Finding user by email: ${email}`);
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        console.log(
          `[DATABASE] Found user: ${user.email} (${user.id}), provider: ${user.provider}`,
        );
      } else {
        console.log(`[DATABASE] User not found for email: ${email}`);
      }

      return user;
    } catch (error) {
      console.error(`[DATABASE] Error finding user by email ${email}:`, error);
      throw error;
    }
  }

  async findUserById(id: string): Promise<User | null> {
    try {
      console.log(`[DATABASE] Finding user by id: ${id}`);
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (user) {
        console.log(
          `[DATABASE] Found user: ${user.email} (${user.id}), provider: ${user.provider}`,
        );
      } else {
        console.log(`[DATABASE] User not found for id: ${id}`);
      }

      return user;
    } catch (error) {
      console.error(`[DATABASE] Error finding user by id ${id}:`, error);
      throw error;
    }
  }

  async findUserByProvider(
    provider: AuthProvider,
    providerId: string,
  ): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: {
          provider_providerId: {
            provider,
            providerId,
          },
        },
      });
    } catch (error) {
      console.error("Error finding user by provider:", error);
      throw error;
    }
  }

  async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: userData,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async updateUserByProvider(
    provider: AuthProvider,
    providerId: string,
    userData: UpdateUserData,
  ): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: {
          provider_providerId: {
            provider,
            providerId,
          },
        },
        data: userData,
      });
    } catch (error) {
      console.error("Error updating user by provider:", error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<User> {
    try {
      return await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await this.prisma.user.findMany({
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("Error getting all users:", error);
      throw error;
    }
  }

  // Email Thread methods
  async upsertEmailThread(
    threadData: CreateEmailThreadData,
  ): Promise<EmailThread> {
    try {
      console.log(
        `[DATABASE] Upserting email thread: ${threadData.externalId} - "${threadData.subject}" for userId: ${threadData.userId}`,
      );

      const result = await this.prisma.emailThread.upsert({
        where: {
          userId_externalId: {
            userId: threadData.userId,
            externalId: threadData.externalId,
          },
        },
        update: {
          subject: threadData.subject,
          sender: threadData.sender,
          senderEmail: threadData.senderEmail,
          preview: threadData.preview,
          timestamp: threadData.timestamp,
          isRead: threadData.isRead,
          isImportant: threadData.isImportant,
          hasAttachments: threadData.hasAttachments,
          updatedAt: new Date(),
        },
        create: threadData,
      });

      console.log(
        `[DATABASE] Successfully upserted email thread: ${result.id} (${result.externalId})`,
      );
      return result;
    } catch (error) {
      console.error(
        `[DATABASE] Error upserting email thread ${threadData.externalId}:`,
        error,
      );
      throw error;
    }
  }

  async getEmailThreadsByUser(
    userId: string,
    limit: number = 25,
    offset: number = 0,
    includeUnlabeled: boolean = true,
  ): Promise<(EmailThread & { labels: EmailThreadLabel[] })[]> {
    try {
      console.log(
        `[DATABASE] Getting email threads for userId: ${userId}, limit: ${limit}, offset: ${offset}, includeUnlabeled: ${includeUnlabeled}`,
      );

      const whereClause: Prisma.EmailThreadWhereInput = { userId };
      if (!includeUnlabeled) {
        whereClause.isLabeled = true;
      }

      const result = await this.prisma.emailThread.findMany({
        where: whereClause,
        include: {
          labels: true,
        },
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
      });

      console.log(
        `[DATABASE] Found ${result.length} email threads for userId: ${userId}`,
      );
      return result;
    } catch (error) {
      console.error(
        `[DATABASE] Error getting email threads for userId ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async getEmailThreadByExternalId(
    userId: string,
    externalId: string,
  ): Promise<(EmailThread & { labels: EmailThreadLabel[] }) | null> {
    try {
      console.log(
        `[DATABASE] Getting email thread by externalId: ${externalId} for userId: ${userId}`,
      );

      const result = await this.prisma.emailThread.findFirst({
        where: {
          userId,
          externalId,
        },
        include: {
          labels: true,
        },
      });

      if (result) {
        console.log(
          `[DATABASE] Found email thread: ${result.id} (${result.externalId})`,
        );
      } else {
        console.log(
          `[DATABASE] Email thread not found for externalId: ${externalId}`,
        );
      }

      return result;
    } catch (error) {
      console.error(
        `[DATABASE] Error getting email thread by externalId ${externalId}:`,
        error,
      );
      throw error;
    }
  }

  async getEmailThreadCount(
    userId: string,
    includeUnlabeled: boolean = true,
  ): Promise<number> {
    try {
      console.log(
        `[DATABASE] Getting email thread count for userId: ${userId}, includeUnlabeled: ${includeUnlabeled}`,
      );

      const whereClause: Prisma.EmailThreadWhereInput = { userId };
      if (!includeUnlabeled) {
        whereClause.isLabeled = true;
      }

      const count = await this.prisma.emailThread.count({
        where: whereClause,
      });

      console.log(
        `[DATABASE] Found ${count} email threads for userId: ${userId}`,
      );
      return count;
    } catch (error) {
      console.error(
        `[DATABASE] Error getting email thread count for userId ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async updateUserSyncState(
    userId: string,
    syncState: {
      gmailHistoryId?: string;
      outlookDeltaToken?: string;
      lastSyncTime?: Date;
    },
  ): Promise<void> {
    try {
      console.log(
        `[DATABASE] Updating sync state for userId: ${userId}`,
        syncState,
      );

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(syncState.gmailHistoryId && {
            gmailHistoryId: syncState.gmailHistoryId,
          }),
          ...(syncState.outlookDeltaToken && {
            outlookDeltaToken: syncState.outlookDeltaToken,
          }),
          ...(syncState.lastSyncTime && {
            lastSyncTime: syncState.lastSyncTime,
          }),
        },
      });

      console.log(
        `[DATABASE] Successfully updated sync state for userId: ${userId}`,
      );
    } catch (error) {
      console.error(
        `[DATABASE] Error updating sync state for userId ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async getUserSyncState(userId: string): Promise<{
    gmailHistoryId: string | null;
    outlookDeltaToken: string | null;
    lastSyncTime: Date | null;
  }> {
    try {
      console.log(`[DATABASE] Getting sync state for userId: ${userId}`);

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          gmailHistoryId: true,
          outlookDeltaToken: true,
          lastSyncTime: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      console.log(`[DATABASE] Retrieved sync state for userId: ${userId}`);
      return {
        gmailHistoryId: user.gmailHistoryId,
        outlookDeltaToken: user.outlookDeltaToken,
        lastSyncTime: user.lastSyncTime,
      };
    } catch (error) {
      console.error(
        `[DATABASE] Error getting sync state for userId ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async updateEmailThreadLabels(
    threadId: string,
    labels: string[],
  ): Promise<EmailThread> {
    try {
      // Get existing labels for this thread
      const existingLabels = await this.prisma.emailThreadLabel.findMany({
        where: { emailThreadId: threadId },
        select: { label: true },
      });

      const existingLabelSet = new Set(existingLabels.map((l) => l.label));
      const newLabels = labels.filter((label) => !existingLabelSet.has(label));
      const labelsToRemove = existingLabels
        .map((l) => l.label)
        .filter((label) => !labels.includes(label));

      // Remove labels that are no longer needed
      if (labelsToRemove.length > 0) {
        await this.prisma.emailThreadLabel.deleteMany({
          where: {
            emailThreadId: threadId,
            label: { in: labelsToRemove },
          },
        });
      }

      // Add new labels one by one to handle duplicates gracefully
      if (newLabels.length > 0) {
        for (const label of newLabels) {
          try {
            await this.prisma.emailThreadLabel.create({
              data: {
                emailThreadId: threadId,
                label,
              },
            });
          } catch (error: unknown) {
            // If it's a unique constraint error, the label already exists, so we can ignore it
            if (
              error &&
              typeof error === "object" &&
              "code" in error &&
              error.code === "P2002"
            ) {
              console.log(
                `[DATABASE] Label ${label} already exists for thread ${threadId}, skipping`,
              );
              continue;
            }
            // For other errors, log and continue
            console.error(
              `[DATABASE] Error creating label ${label} for thread ${threadId}:`,
              error,
            );
          }
        }
      }

      // Update the thread to mark it as labeled
      return await this.prisma.emailThread.update({
        where: { id: threadId },
        data: {
          isLabeled: true,
          updatedAt: new Date(),
        },
        include: {
          labels: true,
        },
      });
    } catch (error) {
      console.error("Error updating email thread labels:", error);
      throw error;
    }
  }

  async addEmailThreadLabels(
    threadId: string,
    labels: string[],
  ): Promise<EmailThread> {
    try {
      if (labels.length === 0) {
        return await this.prisma.emailThread.findUniqueOrThrow({
          where: { id: threadId },
          include: { labels: true },
        });
      }

      // Get existing labels to avoid duplicates
      const existingLabels = await this.prisma.emailThreadLabel.findMany({
        where: { emailThreadId: threadId },
        select: { label: true },
      });

      const existingLabelSet = new Set(existingLabels.map((l) => l.label));
      const newLabels = labels.filter((label) => !existingLabelSet.has(label));

      // Add only new labels one by one to handle duplicates gracefully
      if (newLabels.length > 0) {
        for (const label of newLabels) {
          try {
            await this.prisma.emailThreadLabel.create({
              data: {
                emailThreadId: threadId,
                label,
              },
            });
          } catch (error: unknown) {
            // If it's a unique constraint error, the label already exists, so we can ignore it
            if (
              error &&
              typeof error === "object" &&
              "code" in error &&
              error.code === "P2002"
            ) {
              console.log(
                `[DATABASE] Label ${label} already exists for thread ${threadId}, skipping`,
              );
              continue;
            }
            // For other errors, log and continue
            console.error(
              `[DATABASE] Error creating label ${label} for thread ${threadId}:`,
              error,
            );
          }
        }
      }

      // Return updated thread
      return await this.prisma.emailThread.findUniqueOrThrow({
        where: { id: threadId },
        include: { labels: true },
      });
    } catch (error) {
      console.error("Error adding email thread labels:", error);
      throw error;
    }
  }

  async addEmailLabels(emailId: string, labels: string[]): Promise<Email> {
    try {
      if (labels.length === 0) {
        return await this.prisma.email.findUniqueOrThrow({
          where: { id: emailId },
          include: { labels: true },
        });
      }

      // Get existing labels to avoid duplicates
      const existingLabels = await this.prisma.emailLabel.findMany({
        where: { emailId },
        select: { label: true },
      });

      const existingLabelSet = new Set(existingLabels.map((l) => l.label));
      const newLabels = labels.filter((label) => !existingLabelSet.has(label));

      // Add only new labels one by one to handle duplicates gracefully
      if (newLabels.length > 0) {
        for (const label of newLabels) {
          try {
            await this.prisma.emailLabel.create({
              data: {
                emailId,
                label,
              },
            });
          } catch (error: unknown) {
            // If it's a unique constraint error, the label already exists, so we can ignore it
            if (
              error &&
              typeof error === "object" &&
              "code" in error &&
              error.code === "P2002"
            ) {
              console.log(
                `[DATABASE] Label ${label} already exists for email ${emailId}, skipping`,
              );
              continue;
            }
            // For other errors, log and continue
            console.error(
              `[DATABASE] Error creating label ${label} for email ${emailId}:`,
              error,
            );
          }
        }
      }

      // Return updated email
      return await this.prisma.email.findUniqueOrThrow({
        where: { id: emailId },
        include: { labels: true },
      });
    } catch (error) {
      console.error("Error adding email labels:", error);
      throw error;
    }
  }

  async removeEmailThreadLabels(
    threadId: string,
    labels: string[],
  ): Promise<EmailThread> {
    try {
      if (labels.length === 0) {
        return await this.prisma.emailThread.findUniqueOrThrow({
          where: { id: threadId },
          include: { labels: true },
        });
      }

      // Remove specified labels
      await this.prisma.emailThreadLabel.deleteMany({
        where: {
          emailThreadId: threadId,
          label: { in: labels },
        },
      });

      // Return updated thread
      return await this.prisma.emailThread.findUniqueOrThrow({
        where: { id: threadId },
        include: { labels: true },
      });
    } catch (error) {
      console.error("Error removing email thread labels:", error);
      throw error;
    }
  }

  async getEmailsByThreadId(
    threadId: string,
    userId: string,
  ): Promise<Email[]> {
    try {
      return await this.prisma.email.findMany({
        where: {
          emailThreadId: threadId,
          userId: userId,
        },
        orderBy: { timestamp: "desc" }, // Newest first
        include: {
          labels: true,
        },
      });
    } catch (error) {
      console.error("Error getting emails by thread ID:", error);
      throw error;
    }
  }

  // Email methods
  async upsertEmail(emailData: CreateEmailData): Promise<Email> {
    try {
      return await this.prisma.email.upsert({
        where: {
          userId_externalId: {
            userId: emailData.userId,
            externalId: emailData.externalId,
          },
        },
        update: {
          subject: emailData.subject,
          sender: emailData.sender,
          senderEmail: emailData.senderEmail,
          recipient: emailData.recipient,
          recipientEmail: emailData.recipientEmail,
          timestamp: emailData.timestamp,
          body: emailData.body,
          htmlBody: emailData.htmlBody,
          isRead: emailData.isRead,
          updatedAt: new Date(),
        },
        create: emailData,
      });
    } catch (error) {
      console.error("Error upserting email:", error);
      throw error;
    }
  }

  async getEmailById(emailId: string): Promise<Email | null> {
    try {
      return await this.prisma.email.findUnique({
        where: { id: emailId },
        include: {
          labels: true,
          emailThread: {
            include: {
              labels: true,
            },
          },
        },
      });
    } catch (error) {
      console.error("Error getting email by id:", error);
      throw error;
    }
  }

  async getEmailByExternalId(
    userId: string,
    externalId: string,
  ): Promise<Email | null> {
    try {
      console.log(
        `[DATABASE] Getting email by externalId: ${externalId} for userId: ${userId}`,
      );

      const result = await this.prisma.email.findFirst({
        where: {
          externalId,
          userId,
        },
        include: {
          labels: true,
          emailThread: {
            include: {
              labels: true,
            },
          },
        },
      });

      if (result) {
        console.log(
          `[DATABASE] Found email in database: ${result.id} (${result.externalId})`,
        );
      } else {
        console.log(`[DATABASE] Email not found in database: ${externalId}`);
      }

      return result;
    } catch (error) {
      console.error(
        `[DATABASE] Error getting email by externalId ${externalId}:`,
        error,
      );
      throw error;
    }
  }

  async updateEmailLabels(emailId: string, labels: string[]): Promise<Email> {
    try {
      // First, delete existing labels
      await this.prisma.emailLabel.deleteMany({
        where: { emailId },
      });

      // Then create new labels
      if (labels.length > 0) {
        await this.prisma.emailLabel.createMany({
          data: labels.map((label) => ({
            emailId,
            label,
          })),
        });
      }

      // Update the email to mark it as labeled
      return await this.prisma.email.update({
        where: { id: emailId },
        data: {
          isLabeled: true,
          updatedAt: new Date(),
        },
        include: {
          labels: true,
        },
      });
    } catch (error) {
      console.error("Error updating email labels:", error);
      throw error;
    }
  }

  async updateEmailReadStatus(
    userId: string,
    externalId: string,
    isRead: boolean,
  ): Promise<Email | null> {
    try {
      console.log(
        `[DATABASE] Updating email read status: ${externalId} -> ${isRead} for userId: ${userId}`,
      );

      return await this.prisma.email.update({
        where: {
          userId_externalId: {
            userId,
            externalId,
          },
        },
        data: {
          isRead,
          updatedAt: new Date(),
        },
        include: {
          labels: true,
        },
      });
    } catch (error) {
      console.error(
        `[DATABASE] Error updating email read status for ${externalId}:`,
        error,
      );
      return null;
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
