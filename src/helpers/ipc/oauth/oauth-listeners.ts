import { ipcMain, BrowserWindow } from "electron";
import { GoogleOAuthService } from "../../../services/oauth";
import { OutlookOAuthService } from "../../../services/outlook-oauth";
import { DatabaseService } from "../../../services/database";
import { OAUTH_CHANNELS } from "./oauth-channels";
import { AuthProvider } from "@prisma/client";

let googleOAuthService: GoogleOAuthService;
let outlookOAuthService: OutlookOAuthService;
let databaseService: DatabaseService;

export function registerOAuthListeners(mainWindow: BrowserWindow) {
  googleOAuthService = new GoogleOAuthService();
  outlookOAuthService = new OutlookOAuthService();
  databaseService = new DatabaseService();

  ipcMain.handle(OAUTH_CHANNELS.GOOGLE_AUTHENTICATE, async () => {
    try {
      const result = await googleOAuthService.authenticate();

      // Save or update user in database
      await databaseService.upsertUser({
        email: result.userInfo.email,
        name: result.userInfo.name,
        picture: result.userInfo.picture,
        provider: AuthProvider.GOOGLE,
        providerId: result.userInfo.id,
        accessToken: result.tokens.access_token,
        refreshToken: result.tokens.refresh_token,
        tokenExpiry: result.tokens.expiry_date
          ? new Date(result.tokens.expiry_date)
          : undefined,
        scope: result.tokens.scope,
        verifiedEmail: result.userInfo.verified_email,
      });

      // Send success event to renderer
      mainWindow.webContents.send(OAUTH_CHANNELS.OAUTH_AUTHENTICATED, result);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Authentication failed";
      mainWindow.webContents.send(OAUTH_CHANNELS.OAUTH_ERROR, errorMessage);
      throw error;
    }
  });

  ipcMain.handle(
    OAUTH_CHANNELS.GOOGLE_REFRESH_TOKEN,
    async (_, refreshToken: string) => {
      try {
        return await googleOAuthService.refreshToken(refreshToken);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Token refresh failed";
        mainWindow.webContents.send(OAUTH_CHANNELS.OAUTH_ERROR, errorMessage);
        throw error;
      }
    },
  );

  ipcMain.handle(
    OAUTH_CHANNELS.GOOGLE_REVOKE_TOKEN,
    async (_, token: string) => {
      try {
        await googleOAuthService.revokeToken(token);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Token revocation failed";
        mainWindow.webContents.send(OAUTH_CHANNELS.OAUTH_ERROR, errorMessage);
        throw error;
      }
    },
  );

  ipcMain.handle(OAUTH_CHANNELS.OUTLOOK_AUTHENTICATE, async () => {
    try {
      const result = await outlookOAuthService.authenticate();

      // Save or update user in database
      await databaseService.upsertUser({
        email: result.userInfo.email,
        name: result.userInfo.name,
        picture: result.userInfo.picture,
        provider: AuthProvider.OUTLOOK,
        providerId: result.userInfo.id,
        accessToken: result.tokens.access_token,
        refreshToken: result.tokens.refresh_token,
        tokenExpiry: result.tokens.expiry_date
          ? new Date(result.tokens.expiry_date)
          : undefined,
        scope: result.tokens.scope,
        verifiedEmail: result.userInfo.verified_email,
      });

      // Send success event to renderer
      mainWindow.webContents.send(OAUTH_CHANNELS.OAUTH_AUTHENTICATED, result);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Authentication failed";
      mainWindow.webContents.send(OAUTH_CHANNELS.OAUTH_ERROR, errorMessage);
      throw error;
    }
  });

  ipcMain.handle(
    OAUTH_CHANNELS.OUTLOOK_REFRESH_TOKEN,
    async (_, refreshToken: string) => {
      try {
        return await outlookOAuthService.refreshToken(refreshToken);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Token refresh failed";
        mainWindow.webContents.send(OAUTH_CHANNELS.OAUTH_ERROR, errorMessage);
        throw error;
      }
    },
  );

  ipcMain.handle(OAUTH_CHANNELS.OUTLOOK_REVOKE_TOKEN, async () => {
    try {
      await outlookOAuthService.revokeToken();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Token revocation failed";
      mainWindow.webContents.send(OAUTH_CHANNELS.OAUTH_ERROR, errorMessage);
      throw error;
    }
  });
}
