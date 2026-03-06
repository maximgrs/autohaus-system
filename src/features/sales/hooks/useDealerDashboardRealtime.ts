import useSupabaseTableInvalidation from "@/src/services/supabase/useSupabaseTableInvalidation";

import { dealerDashboardQueryKeyPrefix } from "./useDealerDashboardQuery";

type Params =
    | { mode: "admin" }
    | { mode: "dealer"; dealerEmployeeId: string };

const TABLES_TO_WATCH = [
    "vehicle_sales",
    "vehicle_sale_prep",
    "vehicle_handover_task",
    "vehicles",
    "tasks",
] as const;

export function useDealerDashboardRealtime(params: Params) {
    const enabled = params.mode === "admin"
        ? true
        : Boolean(params.dealerEmployeeId);

    const channelName = params.mode === "admin"
        ? "rt:dealerDashboard:admin"
        : `rt:dealerDashboard:dealer:${params.dealerEmployeeId}`;

    useSupabaseTableInvalidation({
        enabled,
        schema: "public",
        tables: [...TABLES_TO_WATCH],
        event: "*",
        debounceMs: 700,
        channelName,
        invalidateQueryKeys: [dealerDashboardQueryKeyPrefix],
    });
}
