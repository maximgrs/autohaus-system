// src/features/tasks/locking/useTaskEditGuard.ts
import { useMemo } from "react";
import { computeTaskEditGuard, type TaskEditGuard } from "./taskEditGuard";

export function useTaskEditGuard(args: {
    task: {
        status: string;
        taken_by_employee_id?: string | null;
        taken_at?: string | null;
    } | null;
    currentEmployeeId: string | null;
}): TaskEditGuard {
    return useMemo(() => {
        if (!args.task) return { canEdit: false, reason: "NO_EMPLOYEE" };

        return computeTaskEditGuard({
            task: {
                status: String(args.task.status ?? ""),
                takenByEmployeeId: args.task.taken_by_employee_id ?? null,
                takenAt: args.task.taken_at ?? null,
            },
            currentEmployeeId: args.currentEmployeeId,
        });
    }, [args.task, args.currentEmployeeId]);
}
