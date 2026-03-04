import { supabase } from "@/src/lib/supabase";

export type EmployeeRole =
    | "detailer"
    | "mechanic"
    | "dealer"
    | "listing"
    | "admin"
    | string;

export type EmployeeRow = {
    id: string;
    display_name: string;
    role: EmployeeRole;
    active: boolean;
};

export async function fetchActiveEmployees(args?: {
    role?: EmployeeRole;
}): Promise<EmployeeRow[]> {
    let q = supabase
        .from("employees")
        .select("id, display_name, role, active")
        .eq("active", true)
        .order("display_name", { ascending: true });

    if (args?.role) q = q.eq("role", args.role);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as EmployeeRow[];
}

export async function fetchEmployeeById(
    employeeId: string,
): Promise<EmployeeRow | null> {
    const id = String(employeeId ?? "").trim();
    if (!id) return null;

    const { data, error } = await supabase
        .from("employees")
        .select("id, display_name, role, active")
        .eq("id", id)
        .maybeSingle();

    if (error) throw error;
    return (data as EmployeeRow) ?? null;
}
