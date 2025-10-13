export const EMAIL_CHANNELS = {
  GET_INBOX_EMAILS: "email:get-inbox-emails",
  GET_EMAIL_CONTENT: "email:get-email-content",
  GET_THREAD_EMAILS: "email:get-thread-emails",
  MARK_EMAIL_AS_READ: "email:mark-as-read",
  SEND_EMAIL: "email:send-email",
  SETUP_GMAIL_PUSH_NOTIFICATIONS: "email:setup-gmail-push",
  SETUP_OUTLOOK_WEBHOOK: "email:setup-outlook-webhook",
  EMAIL_ERROR: "email:error",
  NEW_EMAIL_NOTIFICATION: "email:new-email",
  GET_INBOX_EMAILS_FROM_DB: "email:get-inbox-emails-from-db",
  GET_IMPORTANT_EMAILS_FROM_DB: "email:get-important-emails-from-db",
  GET_VIP_EMAILS_FROM_DB: "email:get-vip-emails-from-db",
  PROCESS_AND_LABEL_EMAILS: "email:process-and-label-emails",
  PERFORM_INCREMENTAL_SYNC: "email:perform-incremental-sync",
  PERFORM_INITIAL_SYNC: "email:perform-initial-sync",
  UPDATE_MESSAGE_LABELS: "email:update-message-labels",
  INITIAL_SYNC_PROGRESS: "email:initial-sync-progress",
  DOWNLOAD_ATTACHMENT: "email:download-attachment",
} as const;

export type EmailChannels = typeof EMAIL_CHANNELS;
