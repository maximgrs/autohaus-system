import { supabase } from "@/src/lib/supabase";

export type SaleDraftRow = {
    id: string;
    vehicle_id: string;
    status: "draft" | "contract_generated" | "handover_done" | "archived";
    created_at: string;
};

export async function createOrGetDraftSale(
    vehicleId: string,
): Promise<SaleDraftRow> {
    const { data: existing, error: exErr } = await supabase
        .from("sales")
        .select("id, vehicle_id, status, created_at")
        .eq("vehicle_id", vehicleId)
        .eq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (exErr) throw exErr;
    if (existing?.id) return existing as SaleDraftRow;

    const { data, error } = await supabase
        .from("sales")
        .insert({ vehicle_id: vehicleId, status: "draft" })
        .select("id, vehicle_id, status, created_at")
        .single();

    if (error) throw error;
    return data as SaleDraftRow;
}
