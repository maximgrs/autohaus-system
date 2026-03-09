import type {
    EffectiveRole,
    SessionSnapshot,
} from "@/src/features/session/types";
import type { SessionRequirement } from "@/src/features/session/lib/resolveSessionRequirement";

export type RoleAccess = {
    isLoggedIn: boolean;
    isReady: boolean;
    isAdmin: boolean;
    effectiveRole: EffectiveRole | null;
    canOpenAdmin: boolean;
    canViewDealerDashboard: boolean;
    canViewMechanicDashboard: boolean;
    canViewDetailerDashboard: boolean;
    canViewListingDashboard: boolean;
};

export function resolveRoleAccess(params: {
    requirement: SessionRequirement;
    snapshot: Pick<SessionSnapshot, "user" | "account" | "effectiveRole">;
}): RoleAccess {
    const { requirement, snapshot } = params;

    const isLoggedIn = Boolean(snapshot.user);
    const isReady = requirement === "ready";
    const isAdmin =
        String(snapshot.account?.role ?? "").toLowerCase() === "admin";
    const effectiveRole = snapshot.effectiveRole;

    const baseReady = isLoggedIn && isReady;

    return {
        isLoggedIn,
        isReady,
        isAdmin,
        effectiveRole,
        canOpenAdmin: baseReady && isAdmin,
        canViewDealerDashboard: baseReady &&
            (isAdmin || effectiveRole === "dealer" ||
                effectiveRole === "listing"),
        canViewMechanicDashboard: baseReady &&
            (isAdmin || effectiveRole === "mechanic"),
        canViewDetailerDashboard: baseReady &&
            (isAdmin || effectiveRole === "detailer"),
        canViewListingDashboard: baseReady &&
            (isAdmin || effectiveRole === "listing"),
    };
}
