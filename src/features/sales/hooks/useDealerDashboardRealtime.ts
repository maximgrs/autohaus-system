import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import {
    dealerDashboardQueryKeyPrefix,
    type DealerDashboardQueryMode,
} from "./useDealerDashboardQuery";

type Params =
    | { mode: "admin" }
    | { mode: "dealer"; dealerEmployeeId: string };

const TABLES_TO_WATCH = [
    "vehicle_sales",
    "vehicle_sale_prep",
    "vehicle_handover_task",
    "vehicles",
] as const;

export function useDealerDashboardRealtime(params: Params) {
    const queryClient = useQueryClient();

    useEffect(() => {
        // safety: don't subscribe with an empty dealer id
        if (params.mode === "dealer" && !params.dealerEmployeeId) return;

        const channelName = params.mode === "admin"
            ? "rt:dealerDashboard:admin"
            : `rt:dealerDashboard:dealer:${params.dealerEmployeeId}`;

        const channel = supabase.channel(channelName);

        for (const table of TABLES_TO_WATCH) {
            channel.on(
                "postgres_changes",
                { event: "*", schema: "public", table },
                () => {
                    // invalidate all dealer dashboard queries (admin + dealer scoped)
                    queryClient.invalidateQueries({
                        queryKey: dealerDashboardQueryKeyPrefix,
                    });
                },
            );
        }

        channel.subscribe();

        return () => {
            try {
                supabase.removeChannel(channel);
            } catch {
                // fallback for older clients
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                (channel as any)?.unsubscribe?.();
            }
        };
    }, [
        queryClient,
        params.mode,
        params.mode === "dealer" ? params.dealerEmployeeId : "",
    ]);
}
