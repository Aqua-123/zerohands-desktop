export const EMAIL_CHANNELS = {
  GET_INBOX_EMAILS: "email:get-inbox-emails",
  GET_EMAIL_CONTENT: "email:get-email-content",
  MARK_EMAIL_AS_READ: "email:mark-as-read",
  SEND_EMAIL: "email:send-email",
  SETUP_GMAIL_PUSH_NOTIFICATIONS: "email:setup-gmail-push",
  SETUP_OUTLOOK_WEBHOOK: "email:setup-outlook-webhook",
  EMAIL_ERROR: "email:error",
  NEW_EMAIL_NOTIFICATION: "email:new-email",
} as const;

export type EmailChannels = typeof EMAIL_CHANNELS;
