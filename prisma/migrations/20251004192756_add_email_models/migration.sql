-- CreateTable
CREATE TABLE "EmailThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "preview" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
    "isLabeled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "EmailThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "body" TEXT NOT NULL,
    "htmlBody" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isLabeled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "emailThreadId" TEXT NOT NULL,
    CONSTRAINT "Email_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Email_emailThreadId_fkey" FOREIGN KEY ("emailThreadId") REFERENCES "EmailThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailThreadLabel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailThreadId" TEXT NOT NULL,
    CONSTRAINT "EmailThreadLabel_emailThreadId_fkey" FOREIGN KEY ("emailThreadId") REFERENCES "EmailThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailLabel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailId" TEXT NOT NULL,
    CONSTRAINT "EmailLabel_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EmailThread_userId_timestamp_idx" ON "EmailThread"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "EmailThread_userId_isLabeled_idx" ON "EmailThread"("userId", "isLabeled");

-- CreateIndex
CREATE UNIQUE INDEX "EmailThread_userId_externalId_key" ON "EmailThread"("userId", "externalId");

-- CreateIndex
CREATE INDEX "Email_userId_timestamp_idx" ON "Email"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "Email_userId_isLabeled_idx" ON "Email"("userId", "isLabeled");

-- CreateIndex
CREATE INDEX "Email_emailThreadId_idx" ON "Email"("emailThreadId");

-- CreateIndex
CREATE UNIQUE INDEX "Email_userId_externalId_key" ON "Email"("userId", "externalId");

-- CreateIndex
CREATE INDEX "EmailThreadLabel_emailThreadId_idx" ON "EmailThreadLabel"("emailThreadId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailThreadLabel_emailThreadId_label_key" ON "EmailThreadLabel"("emailThreadId", "label");

-- CreateIndex
CREATE INDEX "EmailLabel_emailId_idx" ON "EmailLabel"("emailId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLabel_emailId_label_key" ON "EmailLabel"("emailId", "label");
