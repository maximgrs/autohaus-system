import { useMemo } from "react";

import { useSessionSnapshot } from "@/src/features/session";
import type { TaskVisibilityScope } from "@/src/features/tasks/v3/types";

export function useTaskVisibilityScope(): TaskVisibilityScope {
    const { accountType, selectedEmployeeId } = useSessionSnapshot();

    return useMemo(
        () => ({
            accountType: accountType === "shared" ? "shared" : "individual",
            selectedEmployeeId: selectedEmployeeId ?? null,
        }),
        [accountType, selectedEmployeeId],
    );
}
