// src/features/tasks/locking/taskEditGuard.ts
export type TaskLockInfo = {
    takenByEmployeeId: string | null;
    takenAt: string | null;
};

export type TaskEditGuard = {
    canEdit: boolean;
    reason:
        | null
        | "LOCKED_BY_OTHER"
        | "LOCKED_DONE_BY_SHARED"
        | "NO_EMPLOYEE";
};

/**
 * Centralizes the "is this task editable" decision.
 *
 * Rules:
 * - If task is taken by another employee => view-only
 * - (Mechanic edge case is implemented later once shared/personal mapping is finalized)
 */
export function computeTaskEditGuard(args: {
    task: TaskLockInfo & { status: string };
    currentEmployeeId: string | null;
}): TaskEditGuard {
    const status = String(args.task.status ?? "");
    const takenBy = args.task.takenByEmployeeId;
    const me = args.currentEmployeeId;

    if (!me) return { canEdit: false, reason: "NO_EMPLOYEE" };

    if (takenBy && takenBy !== me) {
        return { canEdit: false, reason: "LOCKED_BY_OTHER" };
    }

    // If done and takenBy is set (means someone finished it) we keep editable for owner only
    if (status === "done" && takenBy && takenBy !== me) {
        return { canEdit: false, reason: "LOCKED_BY_OTHER" };
    }

    return { canEdit: true, reason: null };
}
