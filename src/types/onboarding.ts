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

export interface OnboardingStepProps {
  data: OnboardingFormData;
  updateData: (updates: Partial<OnboardingFormData>) => void;
  onContinue: () => void;
  onBack?: () => void;
}
