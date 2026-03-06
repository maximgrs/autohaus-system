// src/features/tasks/detailerQueue.service.ts
import { supabase } from "@/src/lib/supabase";
import { getActiveEmployeeContext } from "@/src/features/session/employeeContext";

export type DetailerQueueItem = {
    id: string;
    vehicle_id: string;
    type: string; // aliased from task_type
    status: string;
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

const DETAILER_TYPES = ["detail_intake", "detail_final"] as const;

function isSharedAccount(ctx: { accountType: string }) {
    return String(ctx.accountType ?? "").toLowerCase() === "shared";
}

function looksLikeMissingColumnError(errMsg: string, column: string) {
    const m = errMsg.toLowerCase();
    return m.includes(column.toLowerCase()) &&
        (m.includes("column") || m.includes("does not exist"));
}

export async function fetchDetailerQueue(): Promise<DetailerQueueItem[]> {
    const ctx = await getActiveEmployeeContext();
    const shared = isSharedAccount(ctx);
    const myId = String(ctx.employeeId ?? "").trim() || null;

    const baseOrFilter = !shared && myId
        // Personal account:
        // - show all open/overdue
        // - show only mine for in_progress/blocked/done
        ? `status.in.(open,overdue),and(status.in.(in_progress,blocked,done),taken_by_employee_id.eq.${myId})`
        : null;

    // Preferred: task_type exists, alias to `type` for UI compatibility
    const preferred = supabase
        .from("tasks")
        .select(
            "id,vehicle_id,type:task_type,status,title,assigned_employee_id,created_at,updated_at,taken_by_employee_id,taken_at,vehicle:vehicles(id,vin,carx_data,draft_model)",
        )
        .in("task_type", DETAILER_TYPES as any)
        .order("created_at", { ascending: false });

    const preferredQuery = baseOrFilter
        ? preferred.or(baseOrFilter)
        : preferred;

    const { data: data1, error: err1 } = await preferredQuery;
    if (!err1) return (data1 ?? []) as any;

    // Fallback: older schema might use `type` column directly
    if (!looksLikeMissingColumnError(err1.message ?? "", "task_type")) {
        throw err1;
    }

    const legacy = supabase
        .from("tasks")
        .select(
            "id,vehicle_id,type,status,title,assigned_employee_id,created_at,updated_at,taken_by_employee_id,taken_at,vehicle:vehicles(id,vin,carx_data,draft_model)",
        )
        .in("type", DETAILER_TYPES as any)
        .order("created_at", { ascending: false });

    const legacyQuery = baseOrFilter ? legacy.or(baseOrFilter) : legacy;

    const { data: data2, error: err2 } = await legacyQuery;
    if (err2) throw err2;

    return (data2 ?? []) as any;
}
