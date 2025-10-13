import { ipcMain } from "electron";
import {
  ONBOARDING_GET_DATA_CHANNEL,
  ONBOARDING_SAVE_DATA_CHANNEL,
  ONBOARDING_COMPLETE_CHANNEL,
} from "./onboarding-channels";
import { DatabaseService } from "@/services/database";
import { OnboardingFormData } from "@/types/onboarding";

const databaseService = new DatabaseService();

export function registerOnboardingListeners() {
  // Get onboarding data
  ipcMain.handle(
    ONBOARDING_GET_DATA_CHANNEL,
    async (_event, userEmail: string) => {
      try {
        const user = await databaseService.findUserByEmail(userEmail);
        if (!user) {
          throw new Error("User not found");
        }

        return {
          onboardingStep: user.onboardingStep,
          onboardingCompleted: user.onboardingCompleted,
          fullName: user.fullName || "",
          signature: user.signature || "",
          tone: user.tone || "",
          pronouns: user.pronouns || "",
          vipContacts: user.vipContacts ? JSON.parse(user.vipContacts) : [],
          vipDomains: user.vipDomains ? JSON.parse(user.vipDomains) : [],
          smartGroupName: user.smartGroupName || "",
          smartGroupEmails: user.smartGroupEmails
            ? JSON.parse(user.smartGroupEmails)
            : [],
          companyName: user.companyName || "",
          companySize: user.companySize || "",
          positionType: user.positionType || "",
          importantLabels: user.importantLabels
            ? JSON.parse(user.importantLabels)
            : [],
          securityLabels: user.securityLabels
            ? JSON.parse(user.securityLabels)
            : [],
          spamLabels: user.spamLabels ? JSON.parse(user.spamLabels) : [],
          userEmail: user.email,
        };
      } catch (error) {
        console.error("Error getting onboarding data:", error);
        throw error;
      }
    },
  );

  // Save onboarding data
  ipcMain.handle(
    ONBOARDING_SAVE_DATA_CHANNEL,
    async (
      _event,
      userEmail: string,
      data: Partial<OnboardingFormData> & { onboardingStep: number },
    ) => {
      try {
        const user = await databaseService.findUserByEmail(userEmail);
        if (!user) {
          throw new Error("User not found");
        }

        await databaseService.updateUser(user.id, {
          onboardingStep: data.onboardingStep,
          fullName: data.fullName,
          signature: data.signature,
          tone: data.tone,
          pronouns: data.pronouns,
          vipContacts: data.vipContacts
            ? JSON.stringify(data.vipContacts)
            : null,
          vipDomains: data.vipDomains ? JSON.stringify(data.vipDomains) : null,
          smartGroupName: data.smartGroupName,
          smartGroupEmails: data.smartGroupEmails
            ? JSON.stringify(data.smartGroupEmails)
            : null,
          companyName: data.companyName,
          companySize: data.companySize,
          positionType: data.positionType,
          importantLabels: data.importantLabels
            ? JSON.stringify(data.importantLabels)
            : null,
          securityLabels: data.securityLabels
            ? JSON.stringify(data.securityLabels)
            : null,
          spamLabels: data.spamLabels ? JSON.stringify(data.spamLabels) : null,
        });

        return { success: true };
      } catch (error) {
        console.error("Error saving onboarding data:", error);
        throw error;
      }
    },
  );

  // Complete onboarding
  ipcMain.handle(
    ONBOARDING_COMPLETE_CHANNEL,
    async (
      _event,
      userEmail: string,
      data: OnboardingFormData & { onboardingStep: number },
    ) => {
      try {
        const user = await databaseService.findUserByEmail(userEmail);
        if (!user) {
          throw new Error("User not found");
        }

        await databaseService.updateUser(user.id, {
          onboardingCompleted: true,
          onboardingStep: data.onboardingStep,
          fullName: data.fullName,
          signature: data.signature,
          tone: data.tone,
          pronouns: data.pronouns,
          vipContacts: data.vipContacts
            ? JSON.stringify(data.vipContacts)
            : null,
          vipDomains: data.vipDomains ? JSON.stringify(data.vipDomains) : null,
          smartGroupName: data.smartGroupName,
          smartGroupEmails: data.smartGroupEmails
            ? JSON.stringify(data.smartGroupEmails)
            : null,
          companyName: data.companyName,
          companySize: data.companySize,
          positionType: data.positionType,
          importantLabels: data.importantLabels
            ? JSON.stringify(data.importantLabels)
            : null,
          securityLabels: data.securityLabels
            ? JSON.stringify(data.securityLabels)
            : null,
          spamLabels: data.spamLabels ? JSON.stringify(data.spamLabels) : null,
        });

        return { success: true };
      } catch (error) {
        console.error("Error completing onboarding:", error);
        throw error;
      }
    },
  );
}
