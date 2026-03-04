import { supabase } from "@/src/lib/supabase";

export type BuyerInsert = {
    full_name: string;
    address: string | null;
    email: string | null;
    phone: string | null;
    birthdate: string | null; // YYYY-MM-DD
};

export type BuyerRow = { id: string };

export async function createBuyer(input: BuyerInsert): Promise<BuyerRow> {
    const { data, error } = await supabase
        .from("buyers")
        .insert(input)
        .select("id")
        .single();

    if (error) throw error;
    return data as BuyerRow;
}
