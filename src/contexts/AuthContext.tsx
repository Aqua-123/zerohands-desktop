import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import type { OAuthTokens, GoogleUserInfo } from "@/services/oauth";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: "GOOGLE" | "OUTLOOK";
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (userData: AuthUser) => void;
  signOut: () => void;
  checkAuthState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const isAuthenticated = !!user;

  const signIn = (userData: AuthUser) => {
    setUser(userData);
    localStorage.setItem("authenticatedUser", JSON.stringify(userData));
    console.log("User signed in:", userData);
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("authenticatedUser");
    console.log("User signed out");
    navigate({ to: "/" });
  };

  const checkAuthState = async () => {
    try {
      setIsLoading(true);

      // Check localStorage for existing auth state
      const storedUser = localStorage.getItem("authenticatedUser");
      if (storedUser) {
        const userData = JSON.parse(storedUser);

        // Validate the stored user data
        if (userData && userData.email && userData.provider) {
          // Optionally validate user exists in database
          // This could be done by making a simple API call
          // For now, we'll trust the localStorage data and let the email service handle validation
          setUser(userData);
          console.log("Restored authentication state:", userData);
        } else {
          // Invalid stored data, remove it
          localStorage.removeItem("authenticatedUser");
          console.log("Invalid stored auth data, cleared");
        }
      }
    } catch (error) {
      console.error("Error checking auth state:", error);
      localStorage.removeItem("authenticatedUser");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthState();
  }, []);

  // Listen for OAuth events from the main process
  useEffect(() => {
    if (window.oauth) {
      const handleOAuthSuccess = async (data: {
        tokens: OAuthTokens;
        userInfo: GoogleUserInfo;
        isNewUser?: boolean;
        provider?: "GOOGLE" | "OUTLOOK";
      }) => {
        if (data.userInfo) {
          const authUser: AuthUser = {
            id: data.userInfo.id,
            email: data.userInfo.email,
            name: data.userInfo.name,
            picture: data.userInfo.picture,
            provider: data.provider || "GOOGLE", // Default to GOOGLE for backwards compatibility
          };
          signIn(authUser);

          // Check onboarding status
          try {
            const onboardingData = await window.onboarding.getData(
              data.userInfo.email,
            );

            if (!onboardingData.onboardingCompleted) {
              // Redirect to onboarding if not completed
              navigate({ to: "/onboarding" });
              return; // IMPORTANT: Stop here, don't continue to emails
            }
          } catch (error) {
            console.error("Error checking onboarding status:", error);
            // If there's an error, redirect to onboarding as a safe default
            navigate({ to: "/onboarding" });
            return;
          }

          // Trigger initial sync for new users (only if onboarding is completed)
          if (data.isNewUser && window.email) {
            console.log("New user detected, starting initial sync...");
            try {
              await window.email.performInitialSync(
                data.userInfo.email,
                (email) => {
                  // This callback will be called for each email as it's processed
                  console.log(`Email processed: ${email.subject}`);
                  // The email will automatically appear in the UI via the existing notification system
                },
              );
              console.log("Initial sync completed successfully");
            } catch (error) {
              console.error("Initial sync failed:", error);
            }
          }

          navigate({ to: "/emails" });
        }
      };

      const handleOAuthError = (error: string) => {
        console.error("OAuth error:", error);
      };

      window.oauth.onOAuthAuthenticated(handleOAuthSuccess);
      window.oauth.onOAuthError(handleOAuthError);

      // Cleanup listeners on unmount
      return () => {
        // Note: The actual cleanup would depend on how the OAuth listeners are implemented
        // This is a placeholder for cleanup
      };
    }
  }, [navigate]);

  // Listen for email errors that indicate user not found
  useEffect(() => {
    if (window.email) {
      const handleEmailError = (error: string) => {
        console.error("Email error:", error);

        // If user not found in database, sign out automatically
        if (error === "USER_NOT_FOUND") {
          console.log("User not found in database, signing out...");
          signOut();
        }
      };

      window.email.onEmailError(handleEmailError);

      // Cleanup listeners on unmount
      return () => {
        // Note: The actual cleanup would depend on how the email listeners are implemented
        // This is a placeholder for cleanup
      };
    }
  }, [signOut]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
    checkAuthState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
