import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSessionSnapshot } from "@/src/features/session";
import {
    claimTask,
    completeTask,
    releaseTask,
    type TaskMutationResult,
} from "@/src/features/tasks/services/taskMutations";
import {
    detailerQueueQueryKey,
    mechanicQueueQueryKeyBase,
} from "@/src/features/tasks/v3/tasks.queries";
import { dealerDashboardQueryKeyPrefix } from "@/src/features/tasks/screens/DealerDashboard";

function invalidateTaskQueries(queryClient: ReturnType<typeof useQueryClient>) {
    void queryClient.invalidateQueries({
        queryKey: detailerQueueQueryKey,
    });

    void queryClient.invalidateQueries({
        queryKey: mechanicQueueQueryKeyBase,
    });

    void queryClient.invalidateQueries({
        queryKey: dealerDashboardQueryKeyPrefix,
    });

    void queryClient.invalidateQueries({
        queryKey: ["tasks"],
    });
}

export function useTaskMutations() {
    const queryClient = useQueryClient();
    const { selectedEmployeeId } = useSessionSnapshot();

    const claim = useMutation<TaskMutationResult, Error, { taskId: string }>({
        mutationFn: async ({ taskId }) => {
            if (!selectedEmployeeId) {
                throw new Error("Kein Mitarbeiter ausgewählt.");
            }

            return claimTask({
                taskId,
                employeeId: selectedEmployeeId,
            });
        },
        onSuccess: () => {
            invalidateTaskQueries(queryClient);
        },
    });

    const release = useMutation<TaskMutationResult, Error, { taskId: string }>({
        mutationFn: async ({ taskId }) => {
            if (!selectedEmployeeId) {
                throw new Error("Kein Mitarbeiter ausgewählt.");
            }

            return releaseTask({
                taskId,
                employeeId: selectedEmployeeId,
            });
        },
        onSuccess: () => {
            invalidateTaskQueries(queryClient);
        },
    });

    const complete = useMutation<TaskMutationResult, Error, { taskId: string }>(
        {
            mutationFn: async ({ taskId }) => {
                if (!selectedEmployeeId) {
                    throw new Error("Kein Mitarbeiter ausgewählt.");
                }

                return completeTask({
                    taskId,
                    employeeId: selectedEmployeeId,
                });
            },
            onSuccess: () => {
                invalidateTaskQueries(queryClient);
            },
        },
    );

    return {
        claimTask: claim.mutateAsync,
        releaseTask: release.mutateAsync,
        completeTask: complete.mutateAsync,

        isClaiming: claim.isPending,
        isReleasing: release.isPending,
        isCompleting: complete.isPending,
    };
}
