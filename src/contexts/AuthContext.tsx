import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";

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
      const handleOAuthSuccess = (data: any) => {
        if (data.userInfo) {
          const authUser: AuthUser = {
            id: data.userInfo.id,
            email: data.userInfo.email,
            name: data.userInfo.name,
            picture: data.userInfo.picture,
            provider: data.userInfo.provider || "GOOGLE", // Default to Google if not specified
          };
          signIn(authUser);
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
