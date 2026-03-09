import type {
    TaskListItem,
    TaskStatus,
    TaskVisibilityScope,
} from "@/src/features/tasks/v3/types";

function isOpenLike(status: TaskStatus) {
    return status === "open" || status === "blocked" || status === "overdue";
}

function isOwnedLike(status: TaskStatus) {
    return status === "in_progress" || status === "done";
}

export function canSeeTaskForScope(
    task: Pick<TaskListItem, "status" | "assigned_employee_id">,
    scope: TaskVisibilityScope,
): boolean {
    if (scope.accountType === "shared") {
        return true;
    }

    const selectedEmployeeId = scope.selectedEmployeeId ?? null;

    if (!selectedEmployeeId) {
        return isOpenLike(task.status);
    }

    if (isOpenLike(task.status)) {
        return true;
    }

    if (isOwnedLike(task.status)) {
        return task.assigned_employee_id === selectedEmployeeId;
    }

    return true;
}

export function filterTasksForScope<T extends TaskListItem>(
    tasks: T[],
    scope: TaskVisibilityScope,
): T[] {
    return tasks.filter((task) => canSeeTaskForScope(task, scope));
}
