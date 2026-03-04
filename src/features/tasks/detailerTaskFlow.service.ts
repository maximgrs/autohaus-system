import { supabase } from "@/src/lib/supabase";
import type { TaskType } from "@/src/features/tasks/taskDetail.service";

export type EmployeeRow = {
    id: string;
    display_name: string;
    role: string;
    active: boolean;
};

export type InspectionType = "intake" | "final";

export type InspectionRow = {
    id: string;
    vehicle_id: string;
    type: InspectionType;
    notes: string | null;
    actor_employee_id: string | null;
    created_at: string;
    updated_at: string;
};

export type IssueCategory = "scratch" | "dent" | "rust" | "other";
export type IssueSeverity = "low" | "mid" | "high";

export type InspectionItemInsert = {
    inspection_id: string;
    category: IssueCategory;
    severity: IssueSeverity;
    position: any; // jsonb
    comment?: string | null;
    photo_urls?: string[];
};

export type InspectionItemRow = {
    id: string;
    inspection_id: string;
    category: "scratch" | "dent" | "rust" | "other";
    severity: "low" | "mid" | "high";
    position: any; // jsonb
    comment: string | null;
    photo_urls: string[] | null;
    created_at: string;
};

export async function fetchInspectionItems(inspectionId: string) {
    const { data, error } = await supabase
        .from("inspection_items")
        .select(
            "id, inspection_id, category, severity, position, comment, photo_urls, created_at",
        )
        .eq("inspection_id", inspectionId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as InspectionItemRow[];
}

export function inspectionTypeFromTaskType(
    taskType: TaskType | string,
): InspectionType {
    if (taskType === "detail_final") return "final";
    return "intake"; // default: detail_intake
}

export async function fetchEmployeesByRole(
    role: "detailer" | "mechanic" | "dealer" | "listing" | "admin",
) {
    const { data, error } = await supabase
        .from("employees")
        .select("id, display_name, role, active")
        .eq("role", role)
        .eq("active", true)
        .order("display_name", { ascending: true });

    if (error) throw error;
    return (data ?? []) as EmployeeRow[];
}

export async function fetchLatestInspection(
    vehicleId: string,
    type: InspectionType,
) {
    const { data, error } = await supabase
        .from("inspections")
        .select(
            "id, vehicle_id, type, notes, actor_employee_id, created_at, updated_at",
        )
        .eq("vehicle_id", vehicleId)
        .eq("type", type)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return (data as InspectionRow) ?? null;
}

export async function takeOverDetailerTask(args: {
    taskId: string;
    vehicleId: string;
    employeeId: string;
    taskType: TaskType | string;
}) {
    const inspectionType = inspectionTypeFromTaskType(args.taskType);

    // 1) existing inspection? (avoid duplicates)
    let inspection = await fetchLatestInspection(
        args.vehicleId,
        inspectionType,
    );

    // 2) create if missing
    if (!inspection) {
        const { data: created, error: insErr } = await supabase
            .from("inspections")
            .insert({
                vehicle_id: args.vehicleId,
                type: inspectionType,
                actor_employee_id: args.employeeId,
                notes: null,
            })
            .select(
                "id, vehicle_id, type, notes, actor_employee_id, created_at, updated_at",
            )
            .single();

        if (insErr) throw insErr;
        inspection = created as InspectionRow;
    }

    // 3) update task -> in_progress + assigned_employee_id
    const { error: tErr } = await supabase
        .from("tasks")
        .update({
            status: "in_progress",
            assigned_employee_id: args.employeeId,
            actor_employee_id: args.employeeId,
        })
        .eq("id", args.taskId);

    if (tErr) throw tErr;

    return inspection;
}

export async function completeDetailerTask(args: {
    taskId: string;
    employeeId: string;
    inspectionId: string;

    // items to write
    items: InspectionItemInsert[];

    // optional inspection notes
    notes?: string | null;
}) {
    // 1) insert inspection_items (if any)
    if (args.items.length > 0) {
        const { error: itemsErr } = await supabase.from("inspection_items")
            .insert(args.items);
        if (itemsErr) throw itemsErr;
    }

    // 2) update inspection header
    const { error: insErr } = await supabase
        .from("inspections")
        .update({
            actor_employee_id: args.employeeId,
            notes: args.notes ?? null,
        })
        .eq("id", args.inspectionId);

    if (insErr) throw insErr;

    // 3) finish task
    const { error: tErr } = await supabase
        .from("tasks")
        .update({
            status: "done",
            done_at: new Date().toISOString(),
            actor_employee_id: args.employeeId,
        })
        .eq("id", args.taskId);

    if (tErr) throw tErr;
}
