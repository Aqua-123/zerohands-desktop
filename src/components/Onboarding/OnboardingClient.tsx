import React from "react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import OnboardingLayout from "./OnboardingLayout";
import Step1FullName from "./Step1FullName";
import Step2Persona from "./Step2Persona";
import Step3VipContacts from "./Step3VipContacts";
// import Step4SmartGroup from './Step4SmartGroup';
import Step5About from "./Step5About";
// import Step6ImportantLabels from './Step6ImportantLabels';
// import Step7SecuritySpamLabels from './Step7SecuritySpamLabels';
import { OnboardingData, OnboardingFormData } from "@/types/onboarding";

interface OnboardingClientProps {
  initialData: OnboardingData;
}

export default function OnboardingClient({
  initialData,
}: OnboardingClientProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(initialData.onboardingStep);

  // Extract form data from the full data object
  const [data, setData] = useState<OnboardingFormData>({
    fullName: initialData.fullName,
    signature: initialData.signature,
    tone: initialData.tone,
    pronouns: initialData.pronouns,
    vipContacts: initialData.vipContacts,
    vipDomains: initialData.vipDomains,
    smartGroupName: initialData.smartGroupName,
    smartGroupEmails: initialData.smartGroupEmails,
    companyName: initialData.companyName,
    companySize: initialData.companySize,
    positionType: initialData.positionType,
    importantLabels: initialData.importantLabels,
    securityLabels: initialData.securityLabels,
    spamLabels: initialData.spamLabels,
    userEmail: initialData.userEmail,
  });

  const totalSteps = 4;

  const updateData = (updates: Partial<OnboardingFormData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const saveProgress = async (
    stepData: Partial<OnboardingFormData>,
    step: number,
  ) => {
    try {
      await window.onboarding.saveData(data.userEmail, {
        ...stepData,
        onboardingStep: step,
      });
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const nextStep = async () => {
    if (currentStep < totalSteps) {
      const nextStepNumber = currentStep + 1;
      setCurrentStep(nextStepNumber);
      // Save progress when moving to next step
      await saveProgress(data, nextStepNumber);
    } else {
      // Handle completion - save final data and mark as completed
      try {
        await window.onboarding.complete(data.userEmail, {
          ...data,
          onboardingStep: 4,
        });

        // Redirect to emails
        navigate({ to: "/emails" });
      } catch (error) {
        console.error("Error completing onboarding:", error);
      }
    }
  };

  const prevStep = async () => {
    if (currentStep > 1) {
      const prevStepNumber = currentStep - 1;
      setCurrentStep(prevStepNumber);
      // Save progress when moving to previous step
      await saveProgress(data, prevStepNumber);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1FullName
            data={data}
            updateData={updateData}
            onContinue={nextStep}
          />
        );
      case 2:
        return (
          <Step2Persona
            data={data}
            updateData={updateData}
            onContinue={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <Step3VipContacts
            data={data}
            updateData={updateData}
            onContinue={nextStep}
            onBack={prevStep}
          />
        );
      // case 4:
      //   return <Step4SmartGroup data={data} updateData={updateData} onContinue={nextStep} onBack={prevStep} />;
      case 4:
        return (
          <Step5About
            data={data}
            updateData={updateData}
            onContinue={nextStep}
            onBack={prevStep}
          />
        );
      // case 6:
      //   return <Step6ImportantLabels data={data} updateData={updateData} onContinue={nextStep} onBack={prevStep} />;
      // case 7:
      //   return <Step7SecuritySpamLabels data={data} updateData={updateData} onContinue={nextStep} onBack={prevStep} />;
      default:
        return null;
    }
  };

  return (
    <OnboardingLayout currentStep={currentStep} totalSteps={totalSteps}>
      {renderStep()}
    </OnboardingLayout>
  );
}
