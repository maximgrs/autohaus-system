// src/features/sales/saleStep2.service.ts
import { supabase } from "@/src/lib/supabase";

export type PaymentType = "cash" | "credit" | "transfer" | "leasing";

export type SalePaymentData = {
    id: string;
    payment_type: PaymentType | null;
    bank_name: string | null;
    sale_price: number | null;
    down_payment: number | null;
};

export type ContractDetailsData = {
    cond_a: number | null;
    cond_b: number | null;
    cond_c: number | null;
    cond_d: number | null;
    cond_e: number | null;

    // NEW
    cond_overall: number | null;

    contract_date: string | null; // YYYY-MM-DD
    handover_date: string | null; // YYYY-MM-DD
    other_agreements: string | null;
};

export async function fetchStep2Data(saleId: string): Promise<{
    sale: SalePaymentData;
    contract: ContractDetailsData | null;
}> {
    const { data, error } = await supabase
        .from("sales")
        .select(
            `
      id, payment_type, bank_name, sale_price, down_payment,
      contract:sale_contract_details (
        cond_a, cond_b, cond_c, cond_d, cond_e, cond_overall,
        contract_date, handover_date, other_agreements
      )
    `,
        )
        .eq("id", saleId)
        .single();

    if (error) throw error;

    return {
        sale: {
            id: data.id,
            payment_type: (data.payment_type ?? null) as any,
            bank_name: data.bank_name ?? null,
            sale_price: data.sale_price ?? null,
            down_payment: data.down_payment ?? null,
        },
        contract: (data as any).contract ?? null,
    };
}

export async function updateSalePayment(args: {
    saleId: string;
    payment_type: PaymentType;
    bank_name: string | null;
    sale_price: number | null;
    down_payment: number | null;
}) {
    const { error } = await supabase
        .from("sales")
        .update({
            payment_type: args.payment_type,
            bank_name: args.bank_name,
            sale_price: args.sale_price,
            down_payment: args.down_payment,
        })
        .eq("id", args.saleId);

    if (error) throw error;
}

export async function upsertContractDetails(args: {
    saleId: string;
    details: ContractDetailsData;
}) {
    const payload = { sale_id: args.saleId, ...args.details };

    const { error } = await supabase
        .from("sale_contract_details")
        .upsert(payload, { onConflict: "sale_id" });

    if (error) throw error;
}
