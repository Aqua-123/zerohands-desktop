/// <reference types="vite/client" />

// Global type declarations for Electron window extensions
declare global {
  interface Window {
    themeMode: ThemeModeContext;
    electronWindow: ElectronWindow;
    oauth: OAuthContext;
    email: EmailContext;
    calendar: CalendarContext;
    places: PlacesContext;
    onboarding: OnboardingContext;
  }
}

// Preload types
interface ThemeModeContext {
  toggle: () => Promise<boolean>;
  dark: () => Promise<void>;
  light: () => Promise<void>;
  system: () => Promise<boolean>;
  current: () => Promise<"dark" | "light" | "system">;
}

interface ElectronWindow {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  openExternal: (url: string) => Promise<void>;
}

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

interface EmailThread {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  preview: string;
  timestamp: Date;
  isRead: boolean;
  isImportant: boolean;
  hasAttachments: boolean;
  labels?: string[];
}

interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  sender: string;
  senderEmail: string;
  recipient: string;
  recipientEmail: string;
  timestamp: Date;
  body: string;
  htmlBody?: string;
  attachments?: EmailAttachment[];
  isRead: boolean;
}

interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  downloadUrl?: string;
}

interface OAuthContext {
  googleAuthenticate: () => Promise<{
    tokens: OAuthTokens;
    userInfo: GoogleUserInfo;
  }>;
  googleRefreshToken: (refreshToken: string) => Promise<OAuthTokens>;
  googleRevokeToken: (token: string) => Promise<void>;
  outlookAuthenticate: () => Promise<{
    tokens: OAuthTokens;
    userInfo: GoogleUserInfo;
  }>;
  outlookRefreshToken: (refreshToken: string) => Promise<OAuthTokens>;
  outlookRevokeToken: (token: string) => Promise<void>;
  onOAuthAuthenticated: (
    callback: (data: {
      tokens: OAuthTokens;
      userInfo: GoogleUserInfo;
      isNewUser?: boolean;
      provider?: "GOOGLE" | "OUTLOOK";
    }) => void,
  ) => void;
  onOAuthError: (callback: (error: string) => void) => void;
}

interface EmailContext {
  getInboxEmails: (
    userEmail: string,
    pageToken?: string,
    maxResults?: number,
  ) => Promise<{ emails: EmailThread[]; nextPageToken?: string }>;
  getEmailContent: (
    userEmail: string,
    messageId: string,
  ) => Promise<EmailMessage>;
  getThreadEmails: (
    userEmail: string,
    threadId: string,
  ) => Promise<EmailMessage[]>;
  markEmailAsRead: (userEmail: string, messageId: string) => Promise<void>;
  sendEmail: (
    userEmail: string,
    to: string,
    subject: string,
    body: string,
    isHtml?: boolean,
  ) => Promise<void>;
  setupGmailPushNotifications: (userEmail: string) => Promise<void>;
  setupOutlookWebhook: (userEmail: string, webhookUrl: string) => Promise<void>;
  getInboxEmailsFromDB: (
    userEmail: string,
    limit?: number,
    offset?: number,
  ) => Promise<{ emails: EmailThread[]; hasMore: boolean }>;
  processAndLabelEmails: (
    userEmail: string,
    onEmailProcessed?: (email: EmailThread) => void,
  ) => Promise<void>;
  performIncrementalSync: (
    userEmail: string,
    maxResults?: number,
  ) => Promise<{ newEmailsCount: number; totalEmailsCount: number }>;
  performInitialSync: (
    userEmail: string,
    onEmailProcessed?: (email: EmailThread) => void,
  ) => Promise<void>;
  onEmailError: (callback: (error: string) => void) => void;
  onNewEmailNotification: (
    callback: (data: { userEmail: string; newEmails: EmailThread[] }) => void,
  ) => void;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface PlacesAutocompleteRequest {
  input: string;
  sessionToken: string;
  types?: string;
}

interface PlacesDetailsRequest {
  placeId: string;
  sessionToken: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  meetingLink?: string;
  isOnlineMeeting?: boolean;
  startTimezone?: string;
  endTimezone?: string;
}

export interface CreateEventData {
  title: string;
  startDate: string;
  startTime: string;
  endTime: string;
  description?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  isVirtual?: boolean;
  location?: string;
  timezone?: string; // Client timezone
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflictingEvents: Array<{
    summary: string;
    start: string;
    end: string;
  }>;
}

interface CalendarContext {
  // Event management
  createEvent: (
    userEmail: string,
    eventData: CreateEventData,
  ) => Promise<{
    id: string;
    summary: string;
    description?: string;
    hangoutLink?: string;
  }>;
  getEvent: (
    userEmail: string,
    eventId: string,
  ) => Promise<CalendarEvent | null>;
  updateEvent: (
    userEmail: string,
    eventId: string,
    eventData: Partial<CreateEventData>,
  ) => Promise<CalendarEvent>;
  deleteEvent: (
    userEmail: string,
    eventId: string,
  ) => Promise<{ success: boolean }>;
  listEvents: (
    userEmail: string,
    startDate: string,
    endDate: string,
    maxResults?: number,
  ) => Promise<CalendarEvent[]>;

  // Conflict checking
  checkConflicts: (
    userEmail: string,
    eventData: CreateEventData,
  ) => Promise<ConflictCheckResult>;

  // Permissions
  canEditEvent: (userEmail: string, eventId: string) => Promise<boolean>;

  // Error handling
  onCalendarError: (callback: (error: string) => void) => void;
}

interface PlacesContext {
  // Place predictions
  getPlacePredictions: (
    request: PlacesAutocompleteRequest,
  ) => Promise<PlacePrediction[]>;

  // Place details
  getPlaceDetails: (
    request: PlacesDetailsRequest,
  ) => Promise<PlaceDetails | null>;

  // Session token management
  refreshSessionToken: () => Promise<{ sessionToken: string }>;

  // Error handling
  onPlacesError: (callback: (error: string) => void) => void;
}

export interface OnboardingFormData {
  fullName: string;
  signature: string;
  tone: string;
  pronouns: string;
  vipContacts: string[];
  vipDomains: string[];
  smartGroupName: string;
  smartGroupEmails: string[];
  companyName: string;
  companySize: string;
  positionType: string;
  importantLabels: string[];
  securityLabels: string[];
  spamLabels: string[];
  userEmail: string;
}

export interface OnboardingData extends OnboardingFormData {
  onboardingStep: number;
  onboardingCompleted: boolean;
}

interface OnboardingContext {
  getData: (userEmail: string) => Promise<OnboardingData>;
  saveData: (
    userEmail: string,
    data: Partial<OnboardingFormData> & { onboardingStep: number },
  ) => Promise<{ success: boolean }>;
  complete: (
    userEmail: string,
    data: OnboardingFormData & { onboardingStep: number },
  ) => Promise<{ success: boolean }>;
}

export {};
