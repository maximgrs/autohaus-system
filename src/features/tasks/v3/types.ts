// src/features/tasks/v3/types.ts

export type TaskStatus =
    | "open"
    | "in_progress"
    | "done"
    | "blocked"
    | "overdue"
    | (string & {});

export type VehicleLite = {
    id: string;
    vin: string | null;
    carx_data: any;
    draft_model: string | null;
};

export type TaskListItem = {
    id: string;
    vehicle_id: string;
    type: string;
    status: TaskStatus;
    title: string | null;
    assigned_employee_id: string | null;
    created_at: string;
    updated_at: string;
    vehicle: VehicleLite | null;
};

export type MechanicFilter = "all" | "open" | "in_progress" | "done";

export type ListMechanicTasksArgs = {
    filter: MechanicFilter;
};

export type ListDetailerQueueArgs = {
    /**
     * If omitted, we use the “current app defaults”.
     * This will be adjusted when we migrate the old service in Step 4.
     */
    types?: string[];
};
