import React from "react";
import BaseLayout from "@/layouts/BaseLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { Outlet, createRootRoute } from "@tanstack/react-router";
/* import { TanStackRouterDevtools } from '@tanstack/react-router-devtools' */

function Root() {
  return (
    <AuthProvider>
      <BaseLayout>
        <Outlet />
        {/* Uncomment the following line to enable the router devtools */}
        {/* <TanStackRouterDevtools /> */}
      </BaseLayout>
    </AuthProvider>
  );
}

export const Route = createRootRoute({
  component: Root,
});
