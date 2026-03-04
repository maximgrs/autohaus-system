import { supabase } from "@/src/lib/supabase";

export type TaskStatus =
    | "open"
    | "in_progress"
    | "done"
    | "blocked"
    | "overdue";
export type TaskType =
    | "listing_create"
    | "listing_photos"
    | "detail_intake"
    | "detail_final"
    | "sale_prep"
    | "mechanic_prep"
    | "handover"
    | string;

export type ListingQueueVehicle = {
    id: string;
    vin: string;
    draft_model: string | null;
    carx_vehicle_id: string | null;
    created_at: string; // Eingetroffen
};

export type ListingStage = "create" | "photos";

export type ListingQueueItem = {
    task_id: string;
    vehicle_id: string;
    type: TaskType;
    stage: ListingStage; // <-- neu: für UI
    status: TaskStatus | string;
    created_at: string; // Task created_at
    vehicle: ListingQueueVehicle | null;
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

function stageFromType(type: TaskType): ListingStage {
    return type === "listing_photos" ? "photos" : "create";
}

export async function fetchListingQueue(): Promise<ListingQueueItem[]> {
    // 1) Tasks für Listing holen (Create + Photos)
    const { data: taskData, error: taskErr } = await supabase
        .from("tasks")
        .select("id, vehicle_id, type, status, created_at")
        .eq("assigned_role", "listing")
        .in("type", ["listing_create", "listing_photos"])
        // optional: wenn du nur offene willst, uncomment:
        // .neq("status", "done")
        .order("created_at", { ascending: false });

    if (taskErr) throw taskErr;

    const tasks = (taskData ?? []) as TaskRow[];
    if (!tasks.length) return [];

    // 2) Vehicles laden
    const vehicleIds = uniq(tasks.map((t) => t.vehicle_id).filter(Boolean));

    const { data: vehicleData, error: vehErr } = await supabase
        .from("vehicles")
        .select("id, vin, draft_model, carx_vehicle_id, created_at")
        .in("id", vehicleIds);

    if (vehErr) throw vehErr;

    const vehicleMap = new Map<string, ListingQueueVehicle>();
    for (const v of (vehicleData ?? []) as ListingQueueVehicle[]) {
        vehicleMap.set(v.id, v);
    }

    // 3) Merge + stage
    return tasks.map((t) => ({
        task_id: t.id,
        vehicle_id: t.vehicle_id,
        type: t.type,
        stage: stageFromType(t.type),
        status: t.status,
        created_at: t.created_at,
        vehicle: vehicleMap.get(t.vehicle_id) ?? null,
    }));
}
