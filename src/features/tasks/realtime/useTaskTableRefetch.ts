import { useRealtimeRefetchOnTables } from "@/src/services/realtime/useRealtimeRefetchOnTables";

type Options = {
    enabled?: boolean;
    debounceMs?: number;
    onChange: () => void | Promise<void>;
};

const TASK_DOMAIN_TABLES = [
    "tasks",
    "vehicles",
    "sales",
    "vehicle_sale_prep",
] as const;

export function useTaskTableRefetch({
    enabled = true,
    debounceMs = 700,
    onChange,
}: Options) {
    useRealtimeRefetchOnTables({
        enabled,
        schema: "public",
        tables: [...TASK_DOMAIN_TABLES],
        debounceMs,
        onChange,
    });
}
