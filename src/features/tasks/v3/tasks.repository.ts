import { supabase } from "../../../services/supabase/client";
import { toAppError } from "../../../services/supabase/errors";
import { filterTasksForScope } from "@/src/features/tasks/lib/taskVisibility";

import type {
    ListDetailerQueueArgs,
    ListMechanicTasksArgs,
    MechanicFilter,
    TaskListItem,
    TaskStatus,
    VehicleLite,
} from "./types";

type TaskRow = {
    id: string;
    vehicle_id: string;
    type: string;
    status: string;
    title: string | null;
    assigned_employee_id: string | null;
    created_at: string;
    updated_at: string;
};

type VehicleRow = VehicleLite;

function uniq<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
}

function mechanicStatusFilter(filter: MechanicFilter): TaskStatus[] | null {
    if (filter === "all") return null;
    if (filter === "open") return ["open", "blocked", "overdue"];
    if (filter === "in_progress") return ["in_progress"];
    return ["done"];
}

/**
 * V3 Repository: All DB query logic lives here.
 *
 * Detailer queue mirrors legacy behavior:
 * - assigned_role = 'detailer'
 * - type in ['detail_intake','detail_final'] unless overridden
 *
 * Visibility layer:
 * - shared accounts see all
 * - individual accounts:
 *   - open/blocked/overdue visible to all
 *   - in_progress/done only if assigned to selected employee
 */
export async function listDetailerQueueV3(
    args: ListDetailerQueueArgs,
): Promise<TaskListItem[]> {
    const defaultTypes = ["detail_intake", "detail_final"];
    const types = args.types?.length ? args.types : defaultTypes;

    try {
        const { data: taskData, error: taskErr } = await supabase
            .from("tasks")
            .select(
                "id, vehicle_id, type, status, title, assigned_employee_id, created_at, updated_at",
            )
            .eq("assigned_role", "detailer")
            .in("type", types)
            .order("created_at", { ascending: false });

        if (taskErr) throw taskErr;

        const tasks = (taskData ?? []) as TaskRow[];
        if (tasks.length === 0) return [];

        const vehicleIds = uniq(tasks.map((t) => t.vehicle_id).filter(Boolean));

        const { data: vehicleData, error: vehErr } = await supabase
            .from("vehicles")
            .select("id, vin, carx_data, draft_model")
            .in("id", vehicleIds);

        if (vehErr) throw vehErr;

        const vehicleMap = new Map<string, VehicleRow>();
        for (const v of (vehicleData ?? []) as VehicleRow[]) {
            vehicleMap.set(v.id, v);
        }

        const merged: TaskListItem[] = tasks.map((t) => ({
            id: t.id,
            vehicle_id: t.vehicle_id,
            type: t.type,
            status: t.status as TaskStatus,
            title: t.title,
            assigned_employee_id: t.assigned_employee_id,
            created_at: t.created_at,
            updated_at: t.updated_at,
            vehicle: vehicleMap.get(t.vehicle_id) ?? null,
        }));

        return filterTasksForScope(merged, args.scope);
    } catch (e) {
        throw toAppError(e, "Detailer-Queue konnte nicht geladen werden", {
            fn: "listDetailerQueueV3",
            types,
            scope: args.scope,
        });
    }
}

/**
 * Mechanic PREP queue mirrors legacy fetchMechanicPrepTasks():
 * - type = 'mechanic_prep'
 * - assigned_role = 'mechanic'
 * - status filter by chip
 * - embed vehicle
 *
 * Visibility layer:
 * - shared accounts see all
 * - individual accounts:
 *   - open/blocked/overdue visible to all
 *   - in_progress/done only if assigned to selected employee
 */
export async function listMechanicPrepTasksV3(
    args: ListMechanicTasksArgs,
): Promise<TaskListItem[]> {
    const statuses = mechanicStatusFilter(args.filter);

    try {
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
        vehicle:vehicles(
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

        if (statuses) q = q.in("status", statuses as any);

        const { data, error } = await q;
        if (error) throw error;

        const rows = (data ?? []) as any[];

        const normalized: TaskListItem[] = rows.map((r) => ({
            id: String(r.id),
            vehicle_id: String(r.vehicle_id),
            type: String(r.type),
            status: r.status as TaskStatus,
            title: r.title ?? null,
            assigned_employee_id: r.assigned_employee_id ?? null,
            created_at: String(r.created_at),
            updated_at: String(r.updated_at),
            vehicle: r.vehicle ?? null,
        }));

        return filterTasksForScope(normalized, args.scope);
    } catch (e) {
        throw toAppError(e, "Werkstatt-Aufgaben konnten nicht geladen werden", {
            fn: "listMechanicPrepTasksV3",
            filter: args.filter,
            scope: args.scope,
        });
    }
}

/**
 * Generic list (kept for future use; not used by dashboards yet)
 */
export async function listMechanicTasksV3(
    args: ListMechanicTasksArgs,
): Promise<TaskListItem[]> {
    const statuses = mechanicStatusFilter(args.filter);

    try {
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
        vehicle:vehicles(
          id,
          vin,
          carx_data,
          draft_model
        )
      `,
            )
            .order("created_at", { ascending: false });

        if (statuses) q = q.in("status", statuses as any);

        const { data, error } = await q;
        if (error) throw error;

        const rows = (data ?? []) as any[];

        const normalized: TaskListItem[] = rows.map((r) => ({
            id: String(r.id),
            vehicle_id: String(r.vehicle_id),
            type: String(r.type),
            status: r.status as TaskStatus,
            title: r.title ?? null,
            assigned_employee_id: r.assigned_employee_id ?? null,
            created_at: String(r.created_at),
            updated_at: String(r.updated_at),
            vehicle: r.vehicle ?? null,
        }));

        return filterTasksForScope(normalized, args.scope);
    } catch (e) {
        throw toAppError(
            e,
            "Mechaniker-Aufgaben konnten nicht geladen werden",
            {
                fn: "listMechanicTasksV3",
                filter: args.filter,
                scope: args.scope,
            },
        );
    }
}
