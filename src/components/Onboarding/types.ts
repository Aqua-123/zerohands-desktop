export interface OnboardingData {
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
  onboardingStep: number;
  onboardingCompleted: boolean;
  userEmail: string;
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

// Available labels from the LLM system
export const AVAILABLE_LABELS = [
  "marketing",
  "credentials",
  "social",
  "news",
  "meeting",
  "pitch",
  "github",
  "invoice",
  "important",
] as const;

export type AvailableLabel = (typeof AVAILABLE_LABELS)[number];
