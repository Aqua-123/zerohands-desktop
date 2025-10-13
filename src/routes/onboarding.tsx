import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import OnboardingClient from "@/components/Onboarding/OnboardingClient";
import { useAuth } from "@/contexts/AuthContext";
import { OnboardingData } from "@/types/onboarding";

function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOnboardingData() {
      if (!user?.email) {
        navigate({ to: "/" });
        return;
      }

      try {
        const data = await window.onboarding.getData(user.email);

        // If onboarding is already completed, redirect to emails
        if (data.onboardingCompleted) {
          navigate({ to: "/emails" });
          return;
        }

        setOnboardingData(data);
      } catch (error) {
        console.error("Error loading onboarding data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadOnboardingData();
  }, [user, navigate]);

  if (loading || !onboardingData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <OnboardingClient initialData={onboardingData} />;
}

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});
