export const OAUTH_CHANNELS = {
  GOOGLE_AUTHENTICATE: "oauth:google:authenticate",
  GOOGLE_REFRESH_TOKEN: "oauth:google:refresh-token",
  GOOGLE_REVOKE_TOKEN: "oauth:google:revoke-token",
  OUTLOOK_AUTHENTICATE: "oauth:outlook:authenticate",
  OUTLOOK_REFRESH_TOKEN: "oauth:outlook:refresh-token",
  OUTLOOK_REVOKE_TOKEN: "oauth:outlook:revoke-token",
  OAUTH_AUTHENTICATED: "oauth:authenticated",
  OAUTH_ERROR: "oauth:error",
} as const;

export type OAuthChannels = typeof OAUTH_CHANNELS;
