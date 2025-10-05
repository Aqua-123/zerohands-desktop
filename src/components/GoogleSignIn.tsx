import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
  provider?: "GOOGLE";
}

interface OutlookUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
  provider?: "OUTLOOK";
}

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

interface AuthResult {
  tokens: OAuthTokens;
  userInfo: GoogleUserInfo | OutlookUserInfo;
}

export default function GoogleSignIn() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up event listeners for OAuth events
    if (window.oauth) {
      window.oauth.onOAuthAuthenticated((data: AuthResult) => {
        setIsLoading(false);
        setError(null);
        console.log("OAuth successful:", data);

        // Use the auth context to sign in the user
        if (data.userInfo) {
          const authUser = {
            id: data.userInfo.id,
            email: data.userInfo.email,
            name: data.userInfo.name,
            picture: data.userInfo.picture,
            provider:
              data.userInfo.provider || ("GOOGLE" as "GOOGLE" | "OUTLOOK"),
          };
          signIn(authUser);
        }

        // Navigate to emails page after successful authentication
        setTimeout(() => {
          navigate({ to: "/emails" });
        }, 1000);
      });

      window.oauth.onOAuthError((error: string) => {
        setError(error);
        setIsLoading(false);
        console.error("OAuth error:", error);
      });
    }
  }, [signIn, navigate]);

  const handleGoogleSignIn = async () => {
    if (!window.oauth) {
      setError("OAuth service not available");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await window.oauth.googleAuthenticate();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Google authentication failed",
      );
      setIsLoading(false);
    }
  };

  const handleOutlookSignIn = async () => {
    if (!window.oauth) {
      setError("OAuth service not available");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await window.oauth.outlookAuthenticate();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Outlook authentication failed",
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
      <div className="text-center">
        <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Sign in with your account
        </h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          Access your email, calendar, and cloud storage services
        </p>
      </div>

      {error && (
        <div className="w-full rounded-md border border-red-300 bg-red-100 p-3 dark:border-red-700 dark:bg-red-900">
          <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="w-full space-y-3">
        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white hover:bg-blue-700"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Signing in...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Sign in with Google</span>
            </div>
          )}
        </Button>

        <Button
          onClick={handleOutlookSignIn}
          disabled={isLoading}
          className="w-full bg-blue-500 text-white hover:bg-blue-600"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Signing in...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M7.46 11.5c-.2 0-.4-.1-.5-.2-.3-.3-.3-.8 0-1.1l4.5-4.5c.3-.3.8-.3 1.1 0s.3.8 0 1.1L8.1 11.3c-.1.1-.3.2-.5.2z"
                />
                <path
                  fill="currentColor"
                  d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"
                />
              </svg>
              <span>Sign in with Outlook</span>
            </div>
          )}
        </Button>
      </div>

      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        <p>This will grant access to:</p>
        <ul className="mt-1 space-y-1">
          <li>• Email (Gmail/Outlook)</li>
          <li>• Calendar</li>
          <li>• Cloud Storage (Drive/OneDrive)</li>
          <li>• Contacts</li>
        </ul>
      </div>
    </div>
  );
}
