import type { SessionSnapshot } from "@/src/features/session/types";

export type SessionRequirement =
    | "loading"
    | "login"
    | "select-employee"
    | "ready";

type ResolveResult = {
    requirement: SessionRequirement;
    href: "/(auth)/login" | "/(auth)/select-employee" | "/(tabs)/home" | null;
};

export function resolveSessionRequirement(
    snapshot: Pick<
        SessionSnapshot,
        "loading" | "user" | "account" | "accountType" | "selectedEmployeeId"
    >,
): ResolveResult {
    const { loading, user, account, accountType, selectedEmployeeId } =
        snapshot;

    if (loading) {
        return {
            requirement: "loading",
            href: null,
        };
    }

    if (!user) {
        return {
            requirement: "login",
            href: "/(auth)/login",
        };
    }

    if (!account || account.active === false) {
        return {
            requirement: "select-employee",
            href: "/(auth)/select-employee",
        };
    }

    if (accountType === "shared") {
        if (!selectedEmployeeId) {
            return {
                requirement: "select-employee",
                href: "/(auth)/select-employee",
            };
        }

        return {
            requirement: "ready",
            href: "/(tabs)/home",
        };
    }

    if (!selectedEmployeeId) {
        return {
            requirement: "select-employee",
            href: "/(auth)/select-employee",
        };
    }

    return {
        requirement: "ready",
        href: "/(tabs)/home",
    };
}
