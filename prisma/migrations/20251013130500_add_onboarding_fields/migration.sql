-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "picture" TEXT,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" DATETIME,
    "scope" TEXT NOT NULL,
    "verifiedEmail" BOOLEAN NOT NULL DEFAULT false,
    "gmailHistoryId" TEXT,
    "outlookDeltaToken" TEXT,
    "lastSyncTime" DATETIME,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" INTEGER NOT NULL DEFAULT 1,
    "fullName" TEXT,
    "signature" TEXT,
    "tone" TEXT,
    "pronouns" TEXT,
    "vipContacts" TEXT,
    "vipDomains" TEXT,
    "smartGroupName" TEXT,
    "smartGroupEmails" TEXT,
    "companyName" TEXT,
    "companySize" TEXT,
    "positionType" TEXT,
    "importantLabels" TEXT,
    "securityLabels" TEXT,
    "spamLabels" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("accessToken", "createdAt", "email", "gmailHistoryId", "id", "lastSyncTime", "name", "outlookDeltaToken", "picture", "provider", "providerId", "refreshToken", "scope", "tokenExpiry", "updatedAt", "verifiedEmail") SELECT "accessToken", "createdAt", "email", "gmailHistoryId", "id", "lastSyncTime", "name", "outlookDeltaToken", "picture", "provider", "providerId", "refreshToken", "scope", "tokenExpiry", "updatedAt", "verifiedEmail" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_provider_providerId_key" ON "User"("provider", "providerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
