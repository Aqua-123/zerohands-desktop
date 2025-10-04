import { PrismaClient, User, AuthProvider } from "@prisma/client";
import * as path from "path";

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

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    // Use the same database path as configured in .env
    const dbPath = path.join(process.cwd(), "prisma", "dev.db");

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${dbPath}`,
        },
      },
    });
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
      return await this.prisma.user.findUnique({
        where: { email },
      });
    } catch (error) {
      console.error("Error finding user by email:", error);
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

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
