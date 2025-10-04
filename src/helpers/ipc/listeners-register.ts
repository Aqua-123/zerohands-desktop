import { BrowserWindow } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
import { registerOAuthListeners } from "./oauth/oauth-listeners";
import { registerEmailListeners } from "./email/email-listeners";

export default function registerListeners(mainWindow: BrowserWindow) {
  addWindowEventListeners(mainWindow);
  addThemeEventListeners();
  registerOAuthListeners(mainWindow);
  registerEmailListeners(mainWindow);
}
