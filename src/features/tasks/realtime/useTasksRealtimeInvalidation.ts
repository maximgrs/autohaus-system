import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { tasksRealtime } from "@/src/services/realtime/tasksRealtime";
import {
    detailerQueueQueryKey,
    mechanicQueueQueryKeyBase,
} from "@/src/features/tasks/v3/tasks.queries";
import { dealerDashboardQueryKeyPrefix } from "@/src/features/tasks/screens/DealerDashboard";

export function useTasksRealtimeInvalidation() {
    const queryClient = useQueryClient();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        tasksRealtime.start();

        const unsub = tasksRealtime.on((evt) => {
            if (evt.type !== "change") return;

            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(() => {
                void queryClient.invalidateQueries({
                    queryKey: detailerQueueQueryKey,
                });

                void queryClient.invalidateQueries({
                    queryKey: mechanicQueueQueryKeyBase,
                });

                void queryClient.invalidateQueries({
                    queryKey: dealerDashboardQueryKeyPrefix,
                });
            }, 400);
        });

        return () => {
            unsub();

            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = null;
        };
    }, [queryClient]);
}
