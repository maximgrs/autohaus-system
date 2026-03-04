import { supabase } from "@/src/lib/supabase";

export type TaskStatus =
    | "open"
    | "in_progress"
    | "done"
    | "blocked"
    | "overdue"
    | string;

export type TaskType =
    | "sale_prep"
    | "mechanic_prep"
    | "detail_final"
    | "handover"
    | string;

export type SaleStatus =
    | "draft"
    | "contract_generated"
    | "handover_done"
    | "archived"
    | string;

export type VehicleStatus =
    | "draft"
    | "active"
    | "sold"
    | "handover_ready"
    | "archived"
    | string;

export type DealerStage = "draft" | "contract" | "ready" | "sold";

export type DealerDashboardItem = {
    sale_id: string;
    sale_status: SaleStatus;
    contract_url: string | null;
    created_at: string;

    vehicle_id: string;
    vin: string | null;
    vehicle_status: VehicleStatus;
    draft_model: string | null;
    carx_vehicle_id: string | null;
    carx_data: any;

    stage: DealerStage;

    // task snapshots
    sale_prep_task: { id: string; status: TaskStatus } | null;
    mechanic_task: {
        id: string;
        status: TaskStatus;
        assigned_employee_id: string | null;
    } | null;
    detail_task: {
        id: string;
        status: TaskStatus;
        assigned_employee_id: string | null;
    } | null;
    handover_task: { id: string; status: TaskStatus } | null;

    has_prep: boolean;
};

type SaleRow = {
    id: string;
    status: SaleStatus;
    contract_url: string | null;
    vehicle_id: string;
    created_at: string;
};

type VehicleRow = {
    id: string;
    vin: string | null;
    status: VehicleStatus;
    draft_model: string | null;
    carx_vehicle_id: string | null;
    carx_data: any;
};

type TaskRow = {
    id: string;
    vehicle_id: string;
    type: TaskType;
    status: TaskStatus;
    assigned_employee_id: string | null;
    created_at: string;
};

type PrepRow = { vehicle_id: string };

function uniq<T>(arr: T[]) {
    return Array.from(new Set(arr));
}

function latestTask(
    tasks: TaskRow[],
    vehicleId: string,
    type: string,
): TaskRow | null {
    const list = tasks
        .filter((t) => t.vehicle_id === vehicleId && String(t.type) === type)
        .sort((a, b) =>
            String(b.created_at).localeCompare(String(a.created_at))
        );
    return list[0] ?? null;
}

function isActiveTask(status: string) {
    return ["open", "in_progress", "blocked", "overdue"].includes(
        String(status),
    );
}

function stageFrom(args: {
    saleStatus: SaleStatus;
    vehicleStatus: VehicleStatus;
    handoverTask: TaskRow | null;
}): DealerStage {
    const saleStatus = String(args.saleStatus);
    const vStatus = String(args.vehicleStatus);

    if (
        saleStatus === "handover_done" ||
        saleStatus === "archived" ||
        vStatus === "archived"
    ) {
        return "sold";
    }

    if (vStatus === "handover_ready") return "ready";

    if (args.handoverTask && isActiveTask(String(args.handoverTask.status))) {
        return "ready";
    }

    if (saleStatus === "draft") return "draft";
    return "contract";
}

/**
 * Core loader (optional dealer filter)
 */
async function fetchDealerDashboardCore(
    args: { dealerEmployeeId?: string | null },
): Promise<DealerDashboardItem[]> {
    const dealerId = String(args.dealerEmployeeId ?? "").trim();

    // 1) sales (optional dealer filter)
    let q = supabase
        .from("sales")
        .select("id, status, contract_url, vehicle_id, created_at")
        .in("status", [
            "draft",
            "contract_generated",
            "handover_done",
            "archived",
        ])
        .order("created_at", { ascending: false });

    if (dealerId) q = q.eq("dealer_employee_id", dealerId);

    const { data: salesData, error: sErr } = await q;
    if (sErr) throw sErr;

    const sales = (salesData ?? []) as SaleRow[];
    if (!sales.length) return [];

    const vehicleIds = uniq(sales.map((s) => s.vehicle_id).filter(Boolean));

    // 2) vehicles
    const { data: vehData, error: vErr } = await supabase
        .from("vehicles")
        .select("id, vin, status, draft_model, carx_vehicle_id, carx_data")
        .in("id", vehicleIds);

    if (vErr) throw vErr;

    const vMap = new Map<string, VehicleRow>();
    for (const v of (vehData ?? []) as VehicleRow[]) vMap.set(v.id, v);

    // 3) prep exists (vehicle_sale_prep)
    const { data: prepData, error: pErr } = await supabase
        .from("vehicle_sale_prep")
        .select("vehicle_id")
        .in("vehicle_id", vehicleIds);

    if (pErr) throw pErr;

    const prepSet = new Set<string>(
        ((prepData ?? []) as PrepRow[]).map((p) => String(p.vehicle_id)).filter(
            Boolean,
        ),
    );

    // 4) tasks snapshots
    const { data: taskData, error: tErr } = await supabase
        .from("tasks")
        .select(
            "id, vehicle_id, type, status, assigned_employee_id, created_at",
        )
        .in("vehicle_id", vehicleIds)
        .in("type", ["sale_prep", "mechanic_prep", "detail_final", "handover"])
        .order("created_at", { ascending: false });

    if (tErr) throw tErr;

    const tasks = (taskData ?? []) as TaskRow[];

    // 5) merge
    return sales.map((s) => {
        const v = vMap.get(s.vehicle_id) ?? null;

        const salePrep = latestTask(tasks, s.vehicle_id, "sale_prep");
        const mech = latestTask(tasks, s.vehicle_id, "mechanic_prep");
        const det = latestTask(tasks, s.vehicle_id, "detail_final");
        const handover = latestTask(tasks, s.vehicle_id, "handover");

        const stage = stageFrom({
            saleStatus: s.status,
            vehicleStatus: (v?.status ?? "draft") as VehicleStatus,
            handoverTask: handover,
        });

        return {
            sale_id: s.id,
            sale_status: s.status,
            contract_url: s.contract_url ?? null,
            created_at: s.created_at,

            vehicle_id: s.vehicle_id,
            vin: v?.vin ?? null,
            vehicle_status: (v?.status ?? "draft") as VehicleStatus,
            draft_model: v?.draft_model ?? null,
            carx_vehicle_id: v?.carx_vehicle_id ?? null,
            carx_data: v?.carx_data ?? null,

            stage,

            sale_prep_task: salePrep
                ? { id: salePrep.id, status: salePrep.status }
                : null,
            mechanic_task: mech
                ? {
                    id: mech.id,
                    status: mech.status,
                    assigned_employee_id: mech.assigned_employee_id,
                }
                : null,
            detail_task: det
                ? {
                    id: det.id,
                    status: det.status,
                    assigned_employee_id: det.assigned_employee_id,
                }
                : null,
            handover_task: handover
                ? { id: handover.id, status: handover.status }
                : null,

            has_prep: prepSet.has(s.vehicle_id),
        };
    });
}

/**
 * Dealer view (filter by dealer employee)
 */
export async function fetchDealerDashboardV2(args: {
    dealerEmployeeId: string;
}): Promise<DealerDashboardItem[]> {
    const dealerId = String(args.dealerEmployeeId ?? "").trim();
    if (!dealerId) return [];
    return fetchDealerDashboardCore({ dealerEmployeeId: dealerId });
}

/**
 * Admin view (no dealer filter => all)
 */
export async function fetchDealerDashboardAdminV2(): Promise<
    DealerDashboardItem[]
> {
    return fetchDealerDashboardCore({ dealerEmployeeId: null });
}
