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

export type TaskRow = {
    id: string;
    vehicle_id: string;
    type: TaskType;
    status: TaskStatus | string;
    assigned_role: string;
    assigned_employee_id: string | null;
    title: string | null;
    payload: any;
    created_at: string;
    updated_at: string;
};

export type VehicleRow = {
    id: string;
    vin: string;
    status: string;
    draft_model: string | null;
    draft_year: number | null;

    key_count: number;
    tire_count: number;
    has_rims: boolean;

    purchase_price: number | null;
    target_selling_price: number | null;

    draft_notes: string | null;

    internal_image_urls: string[];
    registration_doc_urls: string[];

    carx_vehicle_id: string | null;
    created_at: string;
};

export type TaskDetail = {
    task: TaskRow;
    vehicle: VehicleRow | null;
};

export async function fetchTaskDetail(taskId: string): Promise<TaskDetail> {
    const { data: t, error: tErr } = await supabase
        .from("tasks")
        .select(
            "id, vehicle_id, type, status, assigned_role, assigned_employee_id, title, payload, created_at, updated_at",
        )
        .eq("id", taskId)
        .maybeSingle();

    if (tErr) throw tErr;
    if (!t) throw new Error("Task not found");

    const task = t as TaskRow;

    const { data: v, error: vErr } = await supabase
        .from("vehicles")
        .select(
            `
      id,
      vin,
      status,
      draft_model,
      draft_year,
      key_count,
      tire_count,
      has_rims,
      purchase_price,
      target_selling_price,
      draft_notes,
      internal_image_urls,
      registration_doc_urls,
      carx_vehicle_id,
      created_at
    `,
        )
        .eq("id", task.vehicle_id)
        .maybeSingle();

    if (vErr) throw vErr;

    return { task, vehicle: (v as VehicleRow) ?? null };
}
