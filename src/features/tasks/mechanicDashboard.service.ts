import { supabase } from "@/src/lib/supabase";

export type TaskStatus =
    | "open"
    | "in_progress"
    | "done"
    | "blocked"
    | "overdue"
    | string;

export type VehicleMini = {
    id: string;
    vin: string | null;
    carx_data: any;
    draft_model: string | null;
};

export type MechanicTaskListItem = {
    id: string;
    vehicle_id: string;
    type: string;
    status: TaskStatus;
    title: string | null;
    assigned_employee_id: string | null;
    created_at: string;
    updated_at: string;
    vehicle: VehicleMini | null;
};

export type MechanicFilter = "all" | "open" | "in_progress" | "done";

function statusFilter(filter: MechanicFilter): string[] | null {
    if (filter === "all") return null;
    if (filter === "open") return ["open", "blocked", "overdue"];
    if (filter === "in_progress") return ["in_progress"];
    return ["done"];
}

// Raw from supabase: many-to-one embed comes as object
type RawRow = Omit<MechanicTaskListItem, "vehicle"> & {
    vehicle: VehicleMini | null;
};

export async function fetchMechanicPrepTasks(args: {
    filter: MechanicFilter;
}): Promise<MechanicTaskListItem[]> {
    const list = statusFilter(args.filter);

    let q = supabase
        .from("tasks")
        .select(
            `
        id,
        vehicle_id,
        type,
        status,
        title,
        assigned_employee_id,
        created_at,
        updated_at,
        vehicle:vehicles (
          id,
          vin,
          carx_data,
          draft_model
        )
      `,
        )
        .eq("type", "mechanic_prep")
        .eq("assigned_role", "mechanic")
        .order("created_at", { ascending: false });

    if (list) q = q.in("status", list);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as unknown as RawRow[];

    return rows.map((r) => ({
        id: String(r.id),
        vehicle_id: String(r.vehicle_id),
        type: String(r.type),
        status: r.status,
        title: r.title ?? null,
        assigned_employee_id: r.assigned_employee_id ?? null,
        created_at: String(r.created_at),
        updated_at: String(r.updated_at),
        vehicle: r.vehicle ?? null, // <-- FIX (kein [0])
    }));
}
