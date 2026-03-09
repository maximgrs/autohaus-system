import { useMemo } from "react";

import { useSessionSnapshot } from "@/src/features/session/hooks/useSessionSnapshot";
import { resolveSessionRequirement } from "@/src/features/session/lib/resolveSessionRequirement";

export function useSessionRequirement() {
    const snapshot = useSessionSnapshot();

    return useMemo(() => {
        const resolved = resolveSessionRequirement(snapshot);

        return {
            ...snapshot,
            requirement: resolved.requirement,
            href: resolved.href,
        };
    }, [snapshot]);
}
