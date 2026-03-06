// src/features/session/employeeContext.ts
import { useEmployeeSession } from "@/src/features/session/employeeSession";

export type ActiveEmployeeContext = {
    employeeId: string | null;
    accountId: string | null;
    accountType: "shared" | "individual" | string;
    role: string | null;
};

function readFromZustandSnapshot(): ActiveEmployeeContext | null {
    const store: any = useEmployeeSession as any;

    // Zustand stores expose getState()
    const state = typeof store?.getState === "function"
        ? store.getState()
        : null;
    if (!state) return null;

    const employee = state.employee ??
        state.selectedEmployee ??
        state.activeEmployee ??
        null;

    const employeeId = (employee?.id ? String(employee.id) : null) ??
        (state.employeeId ? String(state.employeeId) : null) ??
        null;

    const accountType =
        (state.accountType ? String(state.accountType) : null) ??
            (state.viewerAccount?.account_type
                ? String(state.viewerAccount.account_type)
                : null) ??
            (state.account?.account_type
                ? String(state.account.account_type)
                : null) ??
            "individual";

    const accountId = (state.accountId ? String(state.accountId) : null) ??
        (state.appAccountId ? String(state.appAccountId) : null) ??
        (state.account?.id ? String(state.account.id) : null) ??
        null;

    const role = (employee?.role ? String(employee.role) : null) ??
        (state.role ? String(state.role) : null) ??
        null;

    return { employeeId, accountId, accountType, role };
}

/**
 * Async API so data-fetching services can call it without hooks.
 * Reads the current session snapshot from the employee session store.
 */
export async function getActiveEmployeeContext(): Promise<
    ActiveEmployeeContext
> {
    const snap = readFromZustandSnapshot();
    return (
        snap ?? {
            employeeId: null,
            accountId: null,
            accountType: "individual",
            role: null,
        }
    );
}
