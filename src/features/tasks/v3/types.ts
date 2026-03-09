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

export type TaskVisibilityScope = {
    accountType: "shared" | "individual";
    selectedEmployeeId: string | null;
};

export type ListMechanicTasksArgs = {
    filter: MechanicFilter;
    scope: TaskVisibilityScope;
};

export type ListDetailerQueueArgs = {
    /**
     * If omitted, detailer defaults are used.
     */
    types?: string[];

    /**
     * Visibility is driven by current session/account mode.
     */
    scope: TaskVisibilityScope;
};
