import { supabase } from "@/src/lib/supabase";

export type TaskMutationResult = {
    task_id: string;
    status: string;
    assigned_employee_id: string | null;
    updated_at: string;
};

function normalizeRpcRow(row: any): TaskMutationResult {
    return {
        task_id: String(row.task_id),
        status: String(row.status),
        assigned_employee_id: row.assigned_employee_id ?? null,
        updated_at: String(row.updated_at),
    };
}

export async function claimTask(params: {
    taskId: string;
    employeeId: string;
}): Promise<TaskMutationResult> {
    const { data, error } = await supabase.rpc("claim_task", {
        p_task_id: params.taskId,
        p_employee_id: params.employeeId,
    });

    if (error) {
        throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
        throw new Error("Task konnte nicht übernommen werden.");
    }

    return normalizeRpcRow(row);
}

export async function releaseTask(params: {
    taskId: string;
    employeeId: string;
}): Promise<TaskMutationResult> {
    const { data, error } = await supabase.rpc("release_task", {
        p_task_id: params.taskId,
        p_employee_id: params.employeeId,
    });

    if (error) {
        throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
        throw new Error("Task konnte nicht freigegeben werden.");
    }

    return normalizeRpcRow(row);
}

export async function completeTask(params: {
    taskId: string;
    employeeId: string;
}): Promise<TaskMutationResult> {
    const { data, error } = await supabase.rpc("complete_task", {
        p_task_id: params.taskId,
        p_employee_id: params.employeeId,
    });

    if (error) {
        throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
        throw new Error("Task konnte nicht abgeschlossen werden.");
    }

    return normalizeRpcRow(row);
}
