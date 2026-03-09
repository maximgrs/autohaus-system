import type { QueryKey } from "@tanstack/react-query";

import { useSupabaseTableInvalidation } from "@/src/services/supabase/useSupabaseTableInvalidation";

type Options = {
    enabled?: boolean;
    debounceMs?: number;
    invalidateQueryKeys?: readonly QueryKey[];
};

const TASK_DOMAIN_TABLES = [
    "tasks",
    "vehicles",
    "sales",
    "vehicle_sale_prep",
] as const;

export function useTaskTableInvalidation({
    enabled = true,
    debounceMs = 700,
    invalidateQueryKeys = [],
}: Options) {
    useSupabaseTableInvalidation({
        enabled,
        schema: "public",
        tables: [...TASK_DOMAIN_TABLES],
        debounceMs,
        invalidateQueryKeys,
    });
}
