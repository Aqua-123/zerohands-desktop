import {
  ONBOARDING_GET_DATA_CHANNEL,
  ONBOARDING_SAVE_DATA_CHANNEL,
  ONBOARDING_COMPLETE_CHANNEL,
} from "./onboarding-channels";

export function exposeOnboardingContext() {
  const { contextBridge, ipcRenderer } = window.require("electron");
  contextBridge.exposeInMainWorld("onboarding", {
    getData: (userEmail: string) =>
      ipcRenderer.invoke(ONBOARDING_GET_DATA_CHANNEL, userEmail),
    saveData: (userEmail: string, data: any) =>
      ipcRenderer.invoke(ONBOARDING_SAVE_DATA_CHANNEL, userEmail, data),
    complete: (userEmail: string, data: any) =>
      ipcRenderer.invoke(ONBOARDING_COMPLETE_CHANNEL, userEmail, data),
  });
}
