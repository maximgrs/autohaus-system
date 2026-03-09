import type {
    AccountRole,
    EffectiveRole,
    SelectedEmployeeRow,
} from "@/src/features/session/types";

function normalizeRole(
    role: AccountRole | null | undefined,
): EffectiveRole | null {
    const value = String(role ?? "").toLowerCase();

    if (
        value === "admin" ||
        value === "dealer" ||
        value === "mechanic" ||
        value === "detailer" ||
        value === "listing"
    ) {
        return value;
    }

    return null;
}

export function resolveEffectiveRole(params: {
    accountRole?: AccountRole | null;
    selectedEmployee?: SelectedEmployeeRow | null;
}): EffectiveRole | null {
    const employeeRole = normalizeRole(params.selectedEmployee?.role);
    if (employeeRole) return employeeRole;

    return normalizeRole(params.accountRole ?? null);
}
