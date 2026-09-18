import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // The snapshot, plan and investment report all derive from the same
        // stored rows, so a short freshness window removes duplicate round
        // trips while navigating between dashboard, plan and invest.
        staleTime: 30_000,
        // Financial data is only refreshed on purpose (navigation, mutation,
        // explicit retry), not every time the tab regains focus.
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
