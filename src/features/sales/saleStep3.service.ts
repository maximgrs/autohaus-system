import { supabase } from "@/src/lib/supabase";
import { invokeEdge } from "@/src/lib/edgeInvoke";

export type PaymentType = "cash" | "credit" | "transfer" | "leasing";

export type SaleRow = {
    id: string;
    vehicle_id: string;
    buyer_id: string | null;
    dealer_employee_id: string | null;
    sale_price: number | null;
    down_payment: number | null;
    payment_type: PaymentType | null;
    bank_name: string | null;
    contract_url: string | null;
};

export type BuyerRow = {
    id: string;
    full_name: string;
    address: string | null;
    email: string | null;
    phone: string | null;
    birthdate: string | null; // date
};

export type DealerRow = {
    id: string;
    display_name: string;
};

export type VehicleRow = {
    id: string;
    vin: string | null;
    carx_vehicle_id: string | null;
    carx_data: any | null;
};

export type ContractDetails = {
    cond_a: number | null;
    cond_b: number | null;
    cond_c: number | null;
    cond_d: number | null;
    cond_e: number | null;
    contract_date: string | null;
    handover_date: string | null;
    other_agreements: string | null;
};

export type SaleSummary = {
    sale: SaleRow;
    buyer: BuyerRow | null;
    dealer: DealerRow | null;
    vehicle: VehicleRow | null;
    details: ContractDetails | null;
};

export async function fetchSaleSummary(saleId: string): Promise<SaleSummary> {
    const id = String(saleId ?? "").trim();
    if (!id) throw new Error("Missing saleId");

    // sale
    const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .select(
            "id, vehicle_id, buyer_id, dealer_employee_id, sale_price, down_payment, payment_type, bank_name, contract_url",
        )
        .eq("id", id)
        .single();

    if (saleErr) throw saleErr;

    // buyer
    let buyer: BuyerRow | null = null;
    if (sale.buyer_id) {
        const { data, error } = await supabase
            .from("buyers")
            .select("id, full_name, address, email, phone, birthdate")
            .eq("id", sale.buyer_id)
            .single();
        if (error) throw error;
        buyer = data as BuyerRow;
    }

    // dealer
    let dealer: DealerRow | null = null;
    if (sale.dealer_employee_id) {
        const { data, error } = await supabase
            .from("employees")
            .select("id, display_name")
            .eq("id", sale.dealer_employee_id)
            .single();
        if (error) throw error;
        dealer = data as DealerRow;
    }

    // vehicle
    let vehicle: VehicleRow | null = null;
    if (sale.vehicle_id) {
        const { data, error } = await supabase
            .from("vehicles")
            .select("id, vin, carx_vehicle_id, carx_data")
            .eq("id", sale.vehicle_id)
            .single();
        if (error) throw error;
        vehicle = data as VehicleRow;
    }

    // details
    const { data: details, error: detErr } = await supabase
        .from("sale_contract_details")
        .select(
            "cond_a, cond_b, cond_c, cond_d, cond_e, contract_date, handover_date, other_agreements",
        )
        .eq("sale_id", id)
        .maybeSingle();

    if (detErr) throw detErr;

    return {
        sale: {
            id: sale.id,
            vehicle_id: sale.vehicle_id,
            buyer_id: sale.buyer_id ?? null,
            dealer_employee_id: sale.dealer_employee_id ?? null,
            sale_price: sale.sale_price ?? null,
            down_payment: sale.down_payment ?? null,
            payment_type: (sale.payment_type ?? null) as any,
            bank_name: sale.bank_name ?? null,
            contract_url: sale.contract_url ?? null,
        },
        buyer: buyer ?? null,
        dealer: dealer ?? null,
        vehicle: vehicle ?? null,
        details: (details as ContractDetails) ?? null,
    };
}

export async function openExistingContractSignedUrl(path: string) {
    const p = String(path ?? "").trim();
    if (!p) throw new Error("Missing contract path");

    const { data, error } = await supabase.storage
        .from("contracts")
        .createSignedUrl(p, 60 * 60 * 24); // 24h

    if (error) throw error;
    return data.signedUrl;
}

export async function generateContract(saleId: string) {
    const id = String(saleId ?? "").trim();
    if (!id) throw new Error("Missing saleId");

    // ✅ zeigt jetzt echte Fehlermeldungen aus der Function
    return invokeEdge<{ path: string; signedUrl: string }>(
        "generate-sale-contract",
        {
            saleId: id,
        },
    );
}
