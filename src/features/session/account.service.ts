import { supabase } from "@/src/lib/supabase";

export type AppAccountRow = {
    user_id: string;
    is_shared: boolean;
    default_employee_id: string | null;
};

export type EmployeeLite = {
    id: string;
    display_name: string;
    role: string | null;
    active: boolean;
};

function isConflictError(err: any): boolean {
    const msg = String(err?.message ?? "").toLowerCase();
    const code = String(err?.code ?? "").toLowerCase();

    // Postgres unique violation
    if (code === "23505") return true;
    // Supabase sometimes returns only message text
    if (msg.includes("duplicate key") || msg.includes("already exists")) {
        return true;
    }

    return false;
}

export async function fetchAppAccount(
    userId: string,
): Promise<AppAccountRow | null> {
    const uid = String(userId ?? "").trim();
    if (!uid) return null;

    const { data, error } = await supabase
        .from("app_accounts")
        .select("user_id, is_shared, default_employee_id")
        .eq("user_id", uid)
        .maybeSingle();

    if (error) throw error;
    return (data ?? null) as AppAccountRow | null;
}

/**
 * Fallback für alte User/Setups.
 * NICHT upsert, weil upsert bei Conflict UPDATE macht (und wir UPDATE gesperrt haben).
 */
export async function ensureAppAccountRow(userId: string): Promise<void> {
    const uid = String(userId ?? "").trim();
    if (!uid) return;

    const { error } = await supabase.from("app_accounts").insert({
        user_id: uid,
    });

    if (error && !isConflictError(error)) {
        throw error;
    }
}

export async function fetchSharedAllowedEmployees(
    userId: string,
): Promise<EmployeeLite[]> {
    const uid = String(userId ?? "").trim();
    if (!uid) return [];

    const { data, error } = await supabase
        .from("app_account_employees")
        .select("employee:employees(id, display_name, role, active)")
        .eq("user_id", uid);

    if (error) throw error;

    const out: EmployeeLite[] = [];
    for (const row of (data ?? []) as any[]) {
        const e = row?.employee;
        if (e?.id) out.push(e as EmployeeLite);
    }
    return out;
}

export async function setDefaultEmployee(
    userId: string,
    employeeId: string,
): Promise<void> {
    const uid = String(userId ?? "").trim();
    const eid = String(employeeId ?? "").trim();
    if (!uid || !eid) return;

    const { error } = await supabase
        .from("app_accounts")
        .update({ default_employee_id: eid })
        .eq("user_id", uid);

    if (error) throw error;
}
