// src/services/tasks/taskLocking.ts
import { supabase } from "@/src/lib/supabase";

export type TaskLockingError =
    | "TASK_NOT_FOUND"
    | "TASK_ALREADY_TAKEN"
    | "TASK_LOCKED"
    | "TASK_CONFLICT"
    | "UNKNOWN";

function parseRpcError(message?: string | null): TaskLockingError {
    const m = String(message ?? "");
    if (m.includes("TASK_NOT_FOUND")) return "TASK_NOT_FOUND";
    if (m.includes("TASK_ALREADY_TAKEN")) return "TASK_ALREADY_TAKEN";
    if (m.includes("TASK_LOCKED")) return "TASK_LOCKED";
    if (m.includes("TASK_CONFLICT")) return "TASK_CONFLICT";
    return "UNKNOWN";
}

export type TakeTaskInput = { taskId: string; employeeId: string };
export type ReleaseTaskInput = { taskId: string; employeeId: string };
export type SetTaskStatusLockedInput = {
    taskId: string;
    employeeId: string;
    newStatus: string;
    expectedLockVersion?: number | null;
};

export async function takeTask(input: TakeTaskInput) {
    const { data, error } = await supabase.rpc("take_task", {
        p_task_id: input.taskId,
        p_employee_id: input.employeeId,
    });

    if (error) {
        const code = parseRpcError(error.message);
        const err = new Error(code);
        (err as any).code = code;
        throw err;
    }

    return data as any;
}

export async function releaseTask(input: ReleaseTaskInput) {
    const { data, error } = await supabase.rpc("release_task", {
        p_task_id: input.taskId,
        p_employee_id: input.employeeId,
    });

    if (error) {
        const code = parseRpcError(error.message);
        const err = new Error(code);
        (err as any).code = code;
        throw err;
    }

    return data as any;
}

export async function setTaskStatusLocked(input: SetTaskStatusLockedInput) {
    const { data, error } = await supabase.rpc("set_task_status_locked", {
        p_task_id: input.taskId,
        p_employee_id: input.employeeId,
        p_new_status: input.newStatus,
        p_expected_lock_version: input.expectedLockVersion === undefined
            ? null
            : input.expectedLockVersion,
    });

    if (error) {
        const code = parseRpcError(error.message);
        const err = new Error(code);
        (err as any).code = code;
        throw err;
    }

    return data as any;
}
