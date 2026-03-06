import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Mobile-friendly defaults; we can tune per-feature later
            staleTime: 10_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnReconnect: true,
            refetchOnMount: true,
            refetchOnWindowFocus: true, // RN focus manager uses AppState internally
        },
        mutations: {
            retry: 0,
        },
    },
});
