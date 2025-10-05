import { routeTree } from "@/routeTree.gen";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Function to determine initial route based on authentication state
function getInitialRoute(): string {
  try {
    const storedUser = localStorage.getItem("authenticatedUser");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      // Validate the stored user data
      if (userData && userData.email && userData.provider) {
        return "/emails";
      }
    }
  } catch (error) {
    console.error("Error checking initial auth state:", error);
    localStorage.removeItem("authenticatedUser");
  }
  return "/";
}

export const router = createRouter({
  defaultPendingMinMs: 0,
  routeTree,
  history: createMemoryHistory({
    initialEntries: [getInitialRoute()],
  }),
});
