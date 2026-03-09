import { useMemo } from "react";

import { useSessionRequirement } from "@/src/features/session/hooks/useSessionRequirement";
import { resolveRoleAccess } from "@/src/features/session/lib/roleAccess";

export function useRoleAccess() {
    const session = useSessionRequirement();

    return useMemo(() => {
        const access = resolveRoleAccess({
            requirement: session.requirement,
            snapshot: {
                user: session.user,
                account: session.account,
                effectiveRole: session.effectiveRole,
            },
        });

        return {
            ...session,
            ...access,
        };
    }, [session]);
}
