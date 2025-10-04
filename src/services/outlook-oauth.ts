import {
  ConfidentialClientApplication,
  AuthenticationResult,
} from "@azure/msal-node";
import { BrowserWindow } from "electron";

export interface OutlookTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

export interface OutlookUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

export class OutlookOAuthService {
  private msalInstance: ConfidentialClientApplication;
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;

  constructor() {
    this.clientId = process.env.AZURE_AD_CLIENT_ID!;
    this.clientSecret = process.env.AZURE_AD_CLIENT_SECRET!;
    this.tenantId = process.env.AZURE_AD_TENANT_ID!;

    if (!this.clientId || !this.clientSecret || !this.tenantId) {
      throw new Error(
        "Azure AD OAuth credentials not found in environment variables",
      );
    }

    const msalConfig = {
      auth: {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        authority: `https://login.microsoftonline.com/${this.tenantId}`,
      },
    };

    this.msalInstance = new ConfidentialClientApplication(msalConfig);
  }

  async authenticate(): Promise<{
    tokens: OutlookTokens;
    userInfo: OutlookUserInfo;
  }> {
    const scopes = [
      "openid",
      "email",
      "profile",
      "https://graph.microsoft.com/Mail.Read",
      "https://graph.microsoft.com/Calendars.ReadWrite",
      "https://graph.microsoft.com/Contacts.Read",
      "https://graph.microsoft.com/Files.ReadWrite",
    ];

    const authCodeUrlParameters = {
      scopes,
      redirectUri: "http://localhost:8080/auth/callback",
    };

    try {
      const authUrl = await this.msalInstance.getAuthCodeUrl(
        authCodeUrlParameters,
      );

      // Create a new window for OAuth flow
      const authWindow = new BrowserWindow({
        width: 500,
        height: 600,
        show: true,
        modal: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      return new Promise((resolve, reject) => {
        authWindow.loadURL(authUrl);

        authWindow.on("closed", () => {
          reject(new Error("Authentication window was closed"));
        });

        const handleAuthCode = async (code: string) => {
          try {
            const tokenRequest = {
              code,
              scopes,
              redirectUri: "http://localhost:8080/auth/callback",
            };

            const response: AuthenticationResult =
              await this.msalInstance.acquireTokenByCode(tokenRequest);

            if (!response.account) {
              throw new Error("No account information received");
            }

            // Get user info from Microsoft Graph
            const userInfo = await this.getUserInfo(response.accessToken);

            authWindow.close();

            const tokens: OutlookTokens = {
              access_token: response.accessToken,
              refresh_token: undefined, // MSAL handles refresh tokens internally
              scope: response.scopes?.join(" ") || "",
              token_type: "Bearer",
              expiry_date: response.expiresOn?.getTime(),
            };

            resolve({
              tokens,
              userInfo,
            });
          } catch (error) {
            authWindow.close();
            reject(error);
          }
        };

        authWindow.webContents.on(
          "will-redirect",
          async (event, navigationUrl) => {
            const url = new URL(navigationUrl);

            if (url.searchParams.has("code")) {
              const code = url.searchParams.get("code");

              if (!code) {
                authWindow.close();
                reject(new Error("No authorization code received"));
                return;
              }

              await handleAuthCode(code);
            }
          },
        );

        // Handle the case where the URL changes but doesn't trigger will-redirect
        authWindow.webContents.on(
          "did-navigate",
          async (event, navigationUrl) => {
            const url = new URL(navigationUrl);

            if (url.searchParams.has("code")) {
              const code = url.searchParams.get("code");

              if (!code) {
                authWindow.close();
                reject(new Error("No authorization code received"));
                return;
              }

              await handleAuthCode(code);
            }
          },
        );
      });
    } catch (error) {
      throw new Error(`Failed to initiate authentication: ${error}`);
    }
  }

  private async getUserInfo(accessToken: string): Promise<OutlookUserInfo> {
    try {
      const response = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.statusText}`);
      }

      const userData = await response.json();

      return {
        id: userData.id,
        email: userData.mail || userData.userPrincipalName,
        name: userData.displayName,
        picture: userData.photo
          ? `https://graph.microsoft.com/v1.0/me/photo/$value`
          : undefined,
        verified_email: true, // Microsoft accounts are verified by default
      };
    } catch (error) {
      throw new Error(`Failed to get user info: ${error}`);
    }
  }

  async refreshToken(refreshToken: string): Promise<OutlookTokens> {
    try {
      const refreshTokenRequest = {
        refreshToken,
        scopes: [
          "openid",
          "email",
          "profile",
          "https://graph.microsoft.com/Mail.Read",
          "https://graph.microsoft.com/Calendars.ReadWrite",
          "https://graph.microsoft.com/Contacts.Read",
          "https://graph.microsoft.com/Files.ReadWrite",
        ],
      };

      const response =
        await this.msalInstance.acquireTokenByRefreshToken(refreshTokenRequest);

      if (!response) {
        throw new Error("Failed to refresh token - no response received");
      }

      return {
        access_token: response.accessToken,
        refresh_token: undefined, // MSAL handles refresh tokens internally
        scope: response.scopes?.join(" ") || "",
        token_type: "Bearer",
        expiry_date: response.expiresOn?.getTime(),
      };
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error}`);
    }
  }

  async revokeToken(): Promise<void> {
    try {
      // Microsoft doesn't provide a direct token revocation endpoint
      // The token will expire naturally
      console.log("Token revocation not supported by Microsoft Graph API");
    } catch (error) {
      throw new Error(`Failed to revoke token: ${error}`);
    }
  }
}
