import { supabase } from "@/src/lib/supabase";

export type TaskStatus =
    | "open"
    | "in_progress"
    | "done"
    | "blocked"
    | "overdue";
export type TaskType =
    | "listing_create"
    | "detail_intake"
    | "listing_photos"
    | "sale_prep"
    | "mechanic_prep"
    | "detail_final"
    | "handover"
    | string;

export type DetailerVehicle = {
    id: string;
    vin: string | null;
    draft_model: string | null;
    carx_vehicle_id: string | null;
    created_at: string;
};

export type DetailerQueueItem = {
    id: string;
    vehicle_id: string;
    type: TaskType;
    status: TaskStatus | string;
    created_at: string;
    vehicle: DetailerVehicle | null;
};

type TaskRow = {
    id: string;
    vehicle_id: string;
    type: TaskType;
    status: TaskStatus | string;
    created_at: string;
};

function uniq<T>(arr: T[]) {
    return Array.from(new Set(arr));
}

export async function fetchDetailerQueue(): Promise<DetailerQueueItem[]> {
    // 1) Tasks laden (ohne join)
    const { data: taskData, error: taskErr } = await supabase
        .from("tasks")
        .select("id, vehicle_id, type, status, created_at")
        .eq("assigned_role", "detailer")
        .in("type", ["detail_intake", "detail_final"])
        .order("created_at", { ascending: false });

    if (taskErr) throw taskErr;

    const tasks = (taskData ?? []) as TaskRow[];

    if (tasks.length === 0) return [];

    // 2) Vehicles laden (in einem call)
    const vehicleIds = uniq(tasks.map((t) => t.vehicle_id).filter(Boolean));

    const { data: vehicleData, error: vehErr } = await supabase
        .from("vehicles")
        .select("id, vin, draft_model, carx_vehicle_id, created_at")
        .in("id", vehicleIds);

    if (vehErr) throw vehErr;

    const vehicleMap = new Map<string, DetailerVehicle>();
    for (const v of (vehicleData ?? []) as DetailerVehicle[]) {
        vehicleMap.set(v.id, v);
    }

    // 3) Merge
    return tasks.map((t) => ({
        id: t.id,
        vehicle_id: t.vehicle_id,
        type: t.type,
        status: t.status,
        created_at: t.created_at,
        vehicle: vehicleMap.get(t.vehicle_id) ?? null,
    }));
}
