import { supabase } from "@/src/lib/supabase";

export type DealerEmployee = {
    id: string;
    display_name: string;
};

export async function fetchDealerEmployees(): Promise<DealerEmployee[]> {
    const { data, error } = await supabase
        .from("employees")
        .select("id, display_name")
        .eq("role", "dealer")
        .eq("active", true)
        .order("display_name", { ascending: true });

    if (error) throw error;
    return (data ?? []) as DealerEmployee[];
}
