import { useMemo } from "react";

import { useSessionRequirement } from "@/src/features/session/hooks/useSessionRequirement";

type EntryHref =
    | "/(auth)/login"
    | "/(auth)/select-employee"
    | "/(tabs)/home";

type EntryRouteResult = {
    loading: boolean;
    href: EntryHref | null;
    route: EntryHref | null;
};

export function useAppEntryRoute(): EntryRouteResult {
    const { requirement, href } = useSessionRequirement();

    return useMemo(() => {
        if (requirement === "loading") {
            return {
                loading: true,
                href: null,
                route: null,
            };
        }

        return {
            loading: false,
            href,
            route: href,
        };
    }, [href, requirement]);
}
