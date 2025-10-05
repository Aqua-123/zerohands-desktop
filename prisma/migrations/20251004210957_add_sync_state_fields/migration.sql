-- AlterTable
ALTER TABLE "User" ADD COLUMN "gmailHistoryId" TEXT;
ALTER TABLE "User" ADD COLUMN "lastSyncTime" DATETIME;
ALTER TABLE "User" ADD COLUMN "outlookDeltaToken" TEXT;
