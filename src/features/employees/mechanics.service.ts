import { supabase } from "@/src/lib/supabase";

export type MechanicEmployee = {
    id: string;
    display_name: string;
    role: string;
    active: boolean;
};

export async function fetchMechanics(): Promise<MechanicEmployee[]> {
    const { data, error } = await supabase
        .from("employees")
        .select("id, display_name, role, active")
        .eq("role", "mechanic")
        .eq("active", true)
        .order("display_name", { ascending: true });

    if (error) throw error;
    return (data ?? []) as MechanicEmployee[];
}
