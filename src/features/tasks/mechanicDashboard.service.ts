// src/features/tasks/mechanicDashboard.service.ts
import { supabase } from "@/src/lib/supabase";
import { getActiveEmployeeContext } from "@/src/features/session/employeeContext";

export type TaskStatus =
    | "open"
    | "in_progress"
    | "done"
    | "blocked"
    | "overdue"
    | string;

export type MechanicTaskListItem = {
    id: string;
    vehicle_id: string;
    type: string; // aliased from task_type
    status: TaskStatus;
    title: string | null;
    assigned_employee_id: string | null;
    created_at: string;
    updated_at: string;

    taken_by_employee_id?: string | null;
    taken_at?: string | null;

    vehicle: {
        id: string;
        vin: string | null;
        carx_data: any;
        draft_model: string | null;
    } | null;
};

export type MechanicFilter = "all" | "open" | "in_progress" | "done";

const MECHANIC_TYPES = ["mechanic_prep"] as const;

function statusFilter(filter: MechanicFilter): string[] | null {
    if (filter === "all") return null;
    if (filter === "open") return ["open", "blocked", "overdue"];
    if (filter === "in_progress") return ["in_progress"];
    return ["done"];
}

function isSharedAccount(ctx: { accountType: string }) {
    return String(ctx.accountType ?? "").toLowerCase() === "shared";
}

function looksLikeMissingColumnError(errMsg: string, column: string) {
    const m = errMsg.toLowerCase();
    return m.includes(column.toLowerCase()) &&
        (m.includes("column") || m.includes("does not exist"));
}

export async function fetchMechanicPrepTasks(args: {
    filter: MechanicFilter;
}): Promise<MechanicTaskListItem[]> {
    const ctx = await getActiveEmployeeContext();
    const shared = isSharedAccount(ctx);
    const myId = String(ctx.employeeId ?? "").trim() || null;

    const statuses = statusFilter(args.filter);

    const baseOrFilter = !shared && myId
        // Personal account:
        // - show all open/blocked/overdue
        // - show only mine for in_progress/done
        ? `status.in.(open,blocked,overdue),and(status.in.(in_progress,done),taken_by_employee_id.eq.${myId})`
        : null;

    // Preferred: task_type exists, alias to `type`
    let preferred = supabase
        .from("tasks")
        .select(
            "id,vehicle_id,type:task_type,status,title,assigned_employee_id,created_at,updated_at,taken_by_employee_id,taken_at,vehicle:vehicles(id,vin,carx_data,draft_model)",
        )
        .in("task_type", MECHANIC_TYPES as any)
        .order("created_at", { ascending: false });

    if (statuses) preferred = preferred.in("status", statuses);

    preferred = baseOrFilter ? preferred.or(baseOrFilter) : preferred;

    const { data: data1, error: err1 } = await preferred;
    if (!err1) return (data1 ?? []) as any;

    // Fallback schema: `type` column exists
    if (!looksLikeMissingColumnError(err1.message ?? "", "task_type")) {
        throw err1;
    }

    let legacy = supabase
        .from("tasks")
        .select(
            "id,vehicle_id,type,status,title,assigned_employee_id,created_at,updated_at,taken_by_employee_id,taken_at,vehicle:vehicles(id,vin,carx_data,draft_model)",
        )
        .in("type", MECHANIC_TYPES as any)
        .order("created_at", { ascending: false });

    if (statuses) legacy = legacy.in("status", statuses);
    legacy = baseOrFilter ? legacy.or(baseOrFilter) : legacy;

    const { data: data2, error: err2 } = await legacy;
    if (err2) throw err2;

    return (data2 ?? []) as any;
}
