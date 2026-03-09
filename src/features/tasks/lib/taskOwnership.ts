export type TaskActionStatus =
    | "open"
    | "in_progress"
    | "done"
    | "blocked"
    | "overdue"
    | (string & {});

export function isTaskOwnedByEmployee(params: {
    assignedEmployeeId?: string | null;
    selectedEmployeeId?: string | null;
}) {
    const assigned = params.assignedEmployeeId ?? null;
    const selected = params.selectedEmployeeId ?? null;

    return Boolean(assigned && selected && assigned === selected);
}

export function canClaimTask(params: {
    status: TaskActionStatus;
    assignedEmployeeId?: string | null;
    selectedEmployeeId?: string | null;
}) {
    const ownedByMe = isTaskOwnedByEmployee(params);

    if (ownedByMe) return false;
    if (params.assignedEmployeeId) return false;

    return (
        params.status === "open" ||
        params.status === "blocked" ||
        params.status === "overdue"
    );
}

export function canReleaseTask(params: {
    status: TaskActionStatus;
    assignedEmployeeId?: string | null;
    selectedEmployeeId?: string | null;
}) {
    const ownedByMe = isTaskOwnedByEmployee(params);

    if (!ownedByMe) return false;

    return (
        params.status === "in_progress" ||
        params.status === "blocked" ||
        params.status === "overdue"
    );
}

export function canCompleteTask(params: {
    status: TaskActionStatus;
    assignedEmployeeId?: string | null;
    selectedEmployeeId?: string | null;
}) {
    const ownedByMe = isTaskOwnedByEmployee(params);

    if (!ownedByMe) return false;

    return (
        params.status === "in_progress" ||
        params.status === "blocked" ||
        params.status === "overdue"
    );
}
