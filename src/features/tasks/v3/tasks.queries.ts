// src/features/tasks/v3/tasks.queries.ts
import { useQuery } from "@tanstack/react-query";

import {
    type DetailerQueueItem,
    fetchDetailerQueue,
} from "@/src/features/tasks/detailerQueue.service";

import {
    fetchMechanicPrepTasks,
    type MechanicFilter,
    type MechanicTaskListItem,
} from "@/src/features/tasks/mechanicDashboard.service";

// ---- Query keys (exported) ----
export const detailerQueueQueryKey = ["tasks", "detailerQueue"] as const;

export const mechanicQueueQueryKeyBase = ["tasks", "mechanicQueue"] as const;

export function mechanicQueueQueryKey(filter: MechanicFilter) {
    return [...mechanicQueueQueryKeyBase, filter] as const;
}

// ---- Queries ----
export function useDetailerQueueQuery() {
    return useQuery<DetailerQueueItem[], Error>({
        queryKey: detailerQueueQueryKey,
        queryFn: fetchDetailerQueue,
        staleTime: 30_000,
        gcTime: 5 * 60 * 1000,
    });
}

export function useMechanicPrepTasksQuery(filter: MechanicFilter) {
    return useQuery<MechanicTaskListItem[], Error>({
        queryKey: mechanicQueueQueryKey(filter),
        queryFn: () => fetchMechanicPrepTasks({ filter }),
        staleTime: 30_000,
        gcTime: 5 * 60 * 1000,
    });
}

export type { DetailerQueueItem, MechanicFilter, MechanicTaskListItem };
