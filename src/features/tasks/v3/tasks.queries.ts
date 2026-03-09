import { useQuery } from "@tanstack/react-query";

import { useTaskVisibilityScope } from "@/src/features/tasks/hooks/useTaskVisibilityScope";
import {
    listDetailerQueueV3,
    listMechanicPrepTasksV3,
} from "@/src/features/tasks/v3/tasks.repository";
import type {
    MechanicFilter,
    TaskListItem,
    TaskVisibilityScope,
} from "@/src/features/tasks/v3/types";

export type DetailerQueueItem = TaskListItem;
export type MechanicTaskListItem = TaskListItem;

export const detailerQueueQueryKey = ["tasks", "detailerQueue"] as const;
export const mechanicQueueQueryKeyBase = ["tasks", "mechanicQueue"] as const;

function scopeKey(scope: TaskVisibilityScope) {
    return [
        scope.accountType,
        scope.selectedEmployeeId ?? "none",
    ] as const;
}

export function mechanicQueueQueryKey(
    filter: MechanicFilter,
    scope: TaskVisibilityScope,
) {
    return [...mechanicQueueQueryKeyBase, filter, ...scopeKey(scope)] as const;
}

export function useDetailerQueueQuery() {
    const scope = useTaskVisibilityScope();

    return useQuery({
        queryKey: [...detailerQueueQueryKey, ...scopeKey(scope)],
        queryFn: () => listDetailerQueueV3({ scope }),
        staleTime: 30_000,
        gcTime: 5 * 60 * 1000,
    });
}

export function useMechanicPrepTasksQuery(filter: MechanicFilter) {
    const scope = useTaskVisibilityScope();

    return useQuery({
        queryKey: mechanicQueueQueryKey(filter, scope),
        queryFn: () => listMechanicPrepTasksV3({ filter, scope }),
        staleTime: 30_000,
        gcTime: 5 * 60 * 1000,
    });
}

export type { MechanicFilter, TaskVisibilityScope };
