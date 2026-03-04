import { supabase } from "@/src/lib/supabase";

export type SaleStatus =
    | "draft"
    | "contract_generated"
    | "handover_done"
    | "archived"
    | string;

export type DealerSaleVehicle = {
    id: string;
    vin: string | null;
    draft_model: string | null;
    carx_vehicle_id: string | null;
    created_at: string;
};

export type DealerSaleItem = {
    id: string;
    status: SaleStatus;
    contract_url: string | null;
    vehicle_id: string;
    created_at: string;
    vehicle: DealerSaleVehicle | null;
};

type SaleRow = {
    id: string;
    status: SaleStatus;
    contract_url: string | null;
    vehicle_id: string;
    created_at: string;
};

function uniq<T>(arr: T[]) {
    return Array.from(new Set(arr));
}

export async function fetchDealerSales(args: {
    dealerEmployeeId: string;
    statuses?: SaleStatus[];
}): Promise<DealerSaleItem[]> {
    const dealerId = String(args.dealerEmployeeId ?? "").trim();
    if (!dealerId) return [];

    const wanted = args.statuses?.length
        ? args.statuses
        : (["draft", "contract_generated"] as SaleStatus[]);

    // 1) Sales
    const { data: salesData, error: sErr } = await supabase
        .from("sales")
        .select("id, status, contract_url, vehicle_id, created_at")
        .eq("dealer_employee_id", dealerId)
        .in("status", wanted as string[])
        .order("created_at", { ascending: false });

    if (sErr) throw sErr;

    const sales = (salesData ?? []) as SaleRow[];
    if (!sales.length) return [];

    // 2) Vehicles (safe, no join dependency)
    const vehicleIds = uniq(sales.map((s) => s.vehicle_id).filter(Boolean));
    const { data: vehData, error: vErr } = await supabase
        .from("vehicles")
        .select("id, vin, draft_model, carx_vehicle_id, created_at")
        .in("id", vehicleIds);

    if (vErr) throw vErr;

    const map = new Map<string, DealerSaleVehicle>();
    for (const v of (vehData ?? []) as DealerSaleVehicle[]) map.set(v.id, v);

    // 3) Merge
    return sales.map((s) => ({
        id: s.id,
        status: s.status,
        contract_url: s.contract_url,
        vehicle_id: s.vehicle_id,
        created_at: s.created_at,
        vehicle: map.get(s.vehicle_id) ?? null,
    }));
}
