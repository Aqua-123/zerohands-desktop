import { contextBridge, ipcRenderer } from "electron";
import { OAUTH_CHANNELS } from "./oauth-channels";
import type { OAuthTokens, GoogleUserInfo } from "../../../services/oauth";
import type { OutlookUserInfo } from "../../../services/outlook-oauth";

export interface OAuthContext {
  googleAuthenticate: () => Promise<{
    tokens: OAuthTokens;
    userInfo: GoogleUserInfo;
  }>;
  googleRefreshToken: (refreshToken: string) => Promise<OAuthTokens>;
  googleRevokeToken: (token: string) => Promise<void>;
  outlookAuthenticate: () => Promise<{
    tokens: OAuthTokens;
    userInfo: OutlookUserInfo;
  }>;
  outlookRefreshToken: (refreshToken: string) => Promise<OAuthTokens>;
  outlookRevokeToken: (token: string) => Promise<void>;
  onOAuthAuthenticated: (
    callback: (data: {
      tokens: OAuthTokens;
      userInfo: GoogleUserInfo | OutlookUserInfo;
    }) => void,
  ) => void;
  onOAuthError: (callback: (error: string) => void) => void;
}

const oauthContext: OAuthContext = {
  googleAuthenticate: () =>
    ipcRenderer.invoke(OAUTH_CHANNELS.GOOGLE_AUTHENTICATE),
  googleRefreshToken: (refreshToken: string) =>
    ipcRenderer.invoke(OAUTH_CHANNELS.GOOGLE_REFRESH_TOKEN, refreshToken),
  googleRevokeToken: (token: string) =>
    ipcRenderer.invoke(OAUTH_CHANNELS.GOOGLE_REVOKE_TOKEN, token),
  outlookAuthenticate: () =>
    ipcRenderer.invoke(OAUTH_CHANNELS.OUTLOOK_AUTHENTICATE),
  outlookRefreshToken: (refreshToken: string) =>
    ipcRenderer.invoke(OAUTH_CHANNELS.OUTLOOK_REFRESH_TOKEN, refreshToken),
  outlookRevokeToken: (token: string) =>
    ipcRenderer.invoke(OAUTH_CHANNELS.OUTLOOK_REVOKE_TOKEN, token),
  onOAuthAuthenticated: (callback) => {
    ipcRenderer.on(OAUTH_CHANNELS.OAUTH_AUTHENTICATED, (_, data) =>
      callback(data),
    );
  },
  onOAuthError: (callback) => {
    ipcRenderer.on(OAUTH_CHANNELS.OAUTH_ERROR, (_, error) => callback(error));
  },
};

contextBridge.exposeInMainWorld("oauth", oauthContext);
