// src/services/realtime/useTasksRealtimeInvalidation.ts
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { tasksRealtime } from "@/src/services/realtime/tasksRealtime";

import {
    detailerQueueQueryKey,
    mechanicQueueQueryKeyBase,
} from "@/src/features/tasks/v3/tasks.queries";

import { dealerDashboardQueryKeyPrefix } from "@/src/features/sales/hooks/useDealerDashboardQuery";

export function useTasksRealtimeInvalidation() {
    const queryClient = useQueryClient();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        tasksRealtime.start();

        const unsub = tasksRealtime.on((evt) => {
            if (evt.type !== "change") return;

            // Debounce bursts of DB updates into one invalidate pass
            if (timerRef.current) clearTimeout(timerRef.current);

            timerRef.current = setTimeout(() => {
                // Task dashboards
                queryClient.invalidateQueries({
                    queryKey: detailerQueueQueryKey,
                });
                queryClient.invalidateQueries({
                    queryKey: mechanicQueueQueryKeyBase,
                });

                // Dealer dashboards (admin + dealer scoped + shared)
                queryClient.invalidateQueries({
                    queryKey: dealerDashboardQueryKeyPrefix,
                });
            }, 400);
        });

        return () => {
            unsub();
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = null;
        };
    }, [queryClient]);
}
