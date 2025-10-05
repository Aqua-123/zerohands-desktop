import React from "react";
import ToggleTheme from "@/components/ToggleTheme";
import { useTranslation } from "react-i18next";
import LangToggle from "@/components/LangToggle";
import Footer from "@/components/template/Footer";
import InitialIcons from "@/components/template/InitialIcons";
import GoogleSignIn from "@/components/GoogleSignIn";
import AuthGuard from "@/components/AuthGuard";
import { createFileRoute } from "@tanstack/react-router";

function HomePage() {
  const { t } = useTranslation();

  return (
    <AuthGuard requireAuth={false} redirectTo="/emails">
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <InitialIcons />
          <span>
            <h1 className="font-mono text-4xl font-bold">{t("appName")}</h1>
            <p
              className="text-muted-foreground text-end text-sm uppercase"
              data-testid="pageTitle"
            >
              {t("titleHomePage")}
            </p>
          </span>
          <LangToggle />
          <ToggleTheme />
          <div className="mt-8">
            <GoogleSignIn />
          </div>
        </div>
        <Footer />
      </div>
    </AuthGuard>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
