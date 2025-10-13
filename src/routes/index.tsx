import React from "react";
import GoogleSignIn from "@/components/GoogleSignIn";
import AuthGuard from "@/components/AuthGuard";
import { createFileRoute } from "@tanstack/react-router";
import loginBulbulaAvif from "@/assets/login-bulbula.avif";

function HomePage() {
  return (
    <AuthGuard requireAuth={false} redirectTo="/emails">
      <div className="relative min-h-screen">
        {/* Background Image - hidden on mobile, visible on desktop */}
        <div
          className="absolute inset-0 hidden bg-contain bg-center bg-no-repeat lg:block"
          style={{
            backgroundImage: `url(${loginBulbulaAvif})`,
          }}
        />

        {/* Overlay content */}
        <div className="relative z-10 flex min-h-screen items-center justify-center lg:justify-end lg:p-4">
          {/* Mobile: full width centered, Desktop: right 50% */}
          <div className="flex h-[100dvh] w-full max-w-md justify-center md:h-[80dvh] lg:w-1/2 lg:max-w-none lg:justify-start lg:pr-16">
            <div className="h-full w-full max-w-md lg:max-w-none">
              <GoogleSignIn />
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
