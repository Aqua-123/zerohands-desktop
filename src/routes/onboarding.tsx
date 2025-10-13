import React, { useEffect, useState, useRef } from "react";
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
  const syncStartedRef = useRef(false);
  const hasAttemptedLoadRef = useRef(false);

  useEffect(() => {
    async function loadOnboardingData() {
      // Prevent multiple calls
      if (hasAttemptedLoadRef.current || !user?.email) {
        if (!user?.email) {
          navigate({ to: "/" });
        }
        return;
      }

      hasAttemptedLoadRef.current = true;

      try {
        console.log("[ONBOARDING] Loading onboarding data for:", user.email);
        const data = await window.onboarding.getData(user.email);

        // If onboarding is already completed, redirect to emails
        if (data.onboardingCompleted) {
          console.log(
            "[ONBOARDING] Onboarding already completed, redirecting to emails",
          );
          navigate({ to: "/emails" });
          return;
        }

        console.log("[ONBOARDING] Setting onboarding data");
        setOnboardingData(data);
      } catch (error) {
        console.error("[ONBOARDING] Error loading onboarding data:", error);
        // If user is not found or any other error, redirect to sign-in page
        console.log("[ONBOARDING] Redirecting to sign-in page due to error");
        navigate({ to: "/" });
        return;
      } finally {
        setLoading(false);
      }
    }

    loadOnboardingData();
  }, [user?.email, navigate]); // Only depend on user.email, not the entire user object

  // Start background sync when onboarding data is loaded
  useEffect(() => {
    async function startBackgroundSync() {
      if (!user?.email || !onboardingData || syncStartedRef.current) {
        return;
      }

      if (!window.email) {
        console.warn("Email service not available for background sync");
        return;
      }

      // Mark sync as started to prevent multiple calls
      syncStartedRef.current = true;

      try {
        console.log("Starting background email sync during onboarding...");

        // Start initial sync in the background (don't await)
        window.email
          .performInitialSync(user.email, (email) => {
            console.log(
              `[Onboarding Background Sync] Processed: ${email.subject}`,
            );
          })
          .then(() => {
            console.log("Background email sync completed during onboarding");
          })
          .catch((error) => {
            console.error("Background email sync failed:", error);
          });
      } catch (error) {
        console.error("Error starting background sync:", error);
      }
    }

    startBackgroundSync();
  }, [user?.email, onboardingData]);

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
