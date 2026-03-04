import { supabase } from "@/src/lib/supabase";

export type AccountType = "shared" | "individual";
export type EmployeeRole =
    | "admin"
    | "dealer"
    | "mechanic"
    | "detailer"
    | "listing";

export type PublicAccountRow = {
    user_id: string;
    role: EmployeeRole;
    account_type: AccountType;
    active: boolean;
};

export type AppAccountRow = {
    user_id: string;
    default_employee_id: string | null;
};

export async function fetchMyPublicAccount(
    userId: string,
): Promise<PublicAccountRow | null> {
    const uid = String(userId ?? "").trim();
    if (!uid) return null;

    const { data, error } = await supabase
        .from("accounts")
        .select("user_id, role, account_type, active")
        .eq("user_id", uid)
        .maybeSingle();

    if (error) throw error;
    return (data ?? null) as PublicAccountRow | null;
}

export async function fetchMyAppAccount(
    userId: string,
): Promise<AppAccountRow | null> {
    const uid = String(userId ?? "").trim();
    if (!uid) return null;

    const { data, error } = await supabase
        .from("app_accounts")
        .select("user_id, default_employee_id")
        .eq("user_id", uid)
        .maybeSingle();

    if (error) throw error;
    return (data ?? null) as AppAccountRow | null;
}
