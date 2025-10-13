import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "@tanstack/react-router";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireOnboarding?: boolean;
  redirectTo?: string;
}

export default function AuthGuard({
  children,
  requireAuth = true,
  requireOnboarding = false,
  redirectTo,
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Check onboarding status if required
  useEffect(() => {
    async function checkOnboarding() {
      if (!requireOnboarding || !user?.email) {
        setOnboardingChecked(true);
        return;
      }

      try {
        const data = await window.onboarding.getData(user.email);
        setOnboardingCompleted(data.onboardingCompleted);
        setOnboardingChecked(true);

        // If onboarding is not completed, redirect to onboarding
        if (!data.onboardingCompleted) {
          navigate({ to: "/onboarding" });
        }
      } catch (error) {
        console.error("Error checking onboarding:", error);
        setOnboardingChecked(true);
        // Redirect to onboarding on error as a safe default
        navigate({ to: "/onboarding" });
      }
    }

    if (isAuthenticated && requireOnboarding) {
      checkOnboarding();
    } else {
      setOnboardingChecked(true);
    }
  }, [isAuthenticated, requireOnboarding, user?.email, navigate]);

  useEffect(() => {
    if (isLoading || (requireOnboarding && !onboardingChecked)) return;

    if (requireAuth && !isAuthenticated) {
      navigate({ to: redirectTo || "/" });
    } else if (!requireAuth && isAuthenticated) {
      // When redirecting authenticated users from public pages,
      // check onboarding status first
      if (window.onboarding && user?.email) {
        window.onboarding
          .getData(user.email)
          .then((data) => {
            if (!data.onboardingCompleted) {
              navigate({ to: "/onboarding" });
            } else {
              navigate({ to: redirectTo || "/emails" });
            }
          })
          .catch(() => {
            navigate({ to: "/onboarding" });
          });
      } else {
        navigate({ to: redirectTo || "/emails" });
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    requireAuth,
    redirectTo,
    navigate,
    requireOnboarding,
    onboardingChecked,
    user?.email,
  ]);

  if (isLoading || (requireOnboarding && !onboardingChecked)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show children if authentication and onboarding requirements are met
  if ((requireAuth && isAuthenticated) || (!requireAuth && !isAuthenticated)) {
    // If onboarding is required, also check if it's completed
    if (requireOnboarding && !onboardingCompleted) {
      return null; // Will redirect via useEffect
    }
    return <>{children}</>;
  }

  // Show nothing while redirecting
  return null;
}
