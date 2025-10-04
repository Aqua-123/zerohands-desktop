import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import EmailInterface from "@/components/EmailInterface";

function EmailsPage() {
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    // In a real app, you would get this from your authentication state
    // For now, we'll use a placeholder or get it from localStorage
    const storedUser = localStorage.getItem("authenticatedUser");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserEmail(user.email);
    } else {
      // Fallback to a placeholder for demo purposes
      setUserEmail("user@example.com");
    }
  }, []);

  if (!userEmail) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <EmailInterface userEmail={userEmail} />
    </div>
  );
}

export const Route = createFileRoute("/emails")({
  component: EmailsPage,
});
