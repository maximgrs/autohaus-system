import { useSupabaseTableInvalidation } from "@/src/services/supabase/useSupabaseTableInvalidation";

type Options = {
    enabled?: boolean;
    invalidateQueryKeys?: readonly (readonly unknown[])[];
};

export function useDealerDashboardRealtime({
    enabled = true,
    invalidateQueryKeys = [],
}: Options) {
    useSupabaseTableInvalidation({
        enabled,
        schema: "public",
        tables: ["sales", "vehicles", "tasks", "vehicle_sale_prep"],
        debounceMs: 700,
        invalidateQueryKeys,
    });
}
