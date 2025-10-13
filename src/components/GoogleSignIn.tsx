import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import logoSvg from "@/assets/logo.svg";
import googleSvg from "@/assets/google.svg";
import microsoftSvg from "@/assets/microsoft-logo.svg";
import "./GoogleSignIn.css";

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

  const openExternalLink = async (url: string) => {
    // Use Electron's shell to open external links
    if (window.electronWindow?.openExternal) {
      await window.electronWindow.openExternal(url);
    } else {
      // Fallback for non-Electron environments
      window.open(url, "_blank");
    }
  };

  return (
    <div className="h-full w-full">
      <div
        className="flex h-full flex-col justify-center space-y-6 rounded-3xl bg-white px-6 py-8 text-center md:space-y-8 md:px-24 md:py-16"
        style={{ boxShadow: "0px 4px 100px 0px rgba(105, 105, 105, 0.25)" }}
      >
        {/* Logo */}
        <div className="flex justify-center">
          <img
            src={logoSvg}
            alt="Zero Hands"
            className="h-[120px] w-[120px] md:h-40 md:w-40"
          />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="font-louize text-center text-[3.5rem] leading-[108%] font-normal tracking-[-0.112rem] text-[#303030] md:text-[4rem]">
            Access
          </h1>
          <h2 className="font-louize text-center text-[3.5rem] leading-[108%] font-normal tracking-[-0.112rem] text-[#303030] md:text-[4rem]">
            Zero Hands
          </h2>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-auto w-full max-w-2xl rounded-full border border-red-300 bg-red-100 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Sign In Buttons */}
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <Button
            className={`signin-buttons w-full rounded-full bg-blue-600 hover:bg-blue-700 ${isLoading ? "disabled-buttons" : ""}`}
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              <>
                <img src={googleSvg} alt="Google" className="mr-3 h-6 w-6" />
                Sign Up with Google
              </>
            )}
          </Button>

          <Button
            className={`signin-buttons w-full rounded-full bg-[#0078d4] hover:bg-[#106ebe] ${isLoading ? "disabled-buttons" : ""}`}
            onClick={handleOutlookSignIn}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              <>
                <img
                  src={microsoftSvg}
                  alt="Outlook"
                  className="mr-3 h-6 w-6"
                />
                Sign Up with Outlook
              </>
            )}
          </Button>
        </div>

        {/* Footer Links */}
        <div className="policy-links space-x-2">
          <button
            onClick={() => openExternalLink("https://zerohands.com/terms")}
            className="cursor-pointer hover:underline"
          >
            Terms of Use
          </button>
          <span>|</span>
          <button
            onClick={() => openExternalLink("https://zerohands.com/privacy")}
            className="cursor-pointer hover:underline"
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
}
