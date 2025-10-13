import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import EmailInterface from "@/components/EmailInterface";
import AuthGuard from "@/components/AuthGuard";

function EmailsPage() {
  const { user } = useAuth();

  return (
    <AuthGuard requireAuth={true} requireOnboarding={true}>
      {user ? (
        <div className="h-full">
          <EmailInterface userEmail={user.email} userProvider={user.provider} />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}

export const Route = createFileRoute("/emails")({
  component: EmailsPage,
});
