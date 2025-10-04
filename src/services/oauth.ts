import { google } from "googleapis";
import { shell } from "electron";
import http from "http";
import { URL } from "url";
import crypto from "crypto";
import { AddressInfo } from "net";

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export class GoogleOAuthService {
  private clientId: string;
  private clientSecret?: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID!;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    console.log("clientSecret", this.clientSecret);
    console.log("clientId", this.clientId);

    if (!this.clientId) {
      throw new Error(
        "Google OAuth client ID not found in environment variables",
      );
    }
  }

  async authenticate(): Promise<{
    tokens: OAuthTokens;
    userInfo: GoogleUserInfo;
  }> {
    // 1) Start a loopback server on a random port
    const server = http.createServer();
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", () => resolve()),
    );
    const { port } = server.address() as AddressInfo;
    const redirectUri = `http://127.0.0.1:${port}/oauth/callback`;

    // 2) Create OAuth2 client with loopback redirect
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret, // include client secret if available (for web app clients)
      redirectUri,
    );

    // 3) PKCE generation
    const codeVerifier = base64url(crypto.randomBytes(32));
    const codeChallenge = base64url(
      crypto.createHash("sha256").update(codeVerifier).digest(),
    );

    // 4) Use granular, non-restricted scopes
    const scopes = [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/contacts.readonly",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/drive.file",
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      codeChallenge,
    });

    // 5) Open system browser (NOT an Electron BrowserWindow)
    await shell.openExternal(authUrl);

    // 6) Wait for Google to redirect back to loopback, then exchange code
    const tokens = await new Promise<OAuthTokens>((resolve, reject) => {
      const timeout = setTimeout(() => {
        server.close();
        reject(new Error("OAuth timeout - no response received"));
      }, 300000); // 5 minute timeout

      server.on("request", async (req, res) => {
        try {
          if (!req.url) return;
          const u = new URL(req.url, `http://127.0.0.1:${port}`);
          if (u.pathname !== "/oauth/callback") return;

          const code = u.searchParams.get("code");
          const error = u.searchParams.get("error");

          // Show a friendly page to the user
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h2>✅ Authentication Successful!</h2>
                <p>You can close this window and return to the application.</p>
              </body>
            </html>
          `);

          clearTimeout(timeout);

          if (error) {
            server.close();
            return reject(new Error(`OAuth error: ${error}`));
          }
          if (!code) {
            server.close();
            return reject(new Error("No authorization code received"));
          }

          const tokenRequest: {
            code: string;
            redirect_uri: string;
            codeVerifier?: string;
          } = {
            code,
            redirect_uri: redirectUri,
          };

          // Add PKCE parameters if no client secret (desktop app flow)
          if (!this.clientSecret) {
            tokenRequest.codeVerifier = codeVerifier;
          }

          const { tokens: tokenResponse } =
            await oauth2Client.getToken(tokenRequest);

          server.close();
          resolve(tokenResponse as OAuthTokens);
        } catch (e) {
          clearTimeout(timeout);
          server.close();
          reject(e);
        }
      });
    });

    // 7) Set credentials and get user info
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    return { tokens, userInfo: userInfo as GoogleUserInfo };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret, // include client secret if available
      "http://127.0.0.1:8080/oauth/callback", // dummy redirect for refresh
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials as OAuthTokens;
  }

  async revokeToken(token: string): Promise<void> {
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret, // include client secret if available
      "http://127.0.0.1:8080/oauth/callback", // dummy redirect for revoke
    );

    await oauth2Client.revokeToken(token);
  }

  getAuthClient() {
    // Return a new client instance for API calls
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      "http://127.0.0.1:8080/oauth/callback",
    );
  }
}
