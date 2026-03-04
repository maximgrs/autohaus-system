// src/features/session/appAccount.service.ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

export type AppAccount = {
    id: string;
    user_id: string;
    email: string | null;
    is_shared: boolean;
    created_at: string;
};

export type AllowedEmployee = {
    id: string;
    display_name: string;
    role: string;
};

export async function fetchAppAccountByUserId(
    userId: string,
): Promise<AppAccount | null> {
    const uid = String(userId ?? "").trim();
    if (!uid) return null;

    const { data, error } = await supabase
        .from("app_accounts")
        .select("id, user_id, email, is_shared, created_at")
        .eq("user_id", uid)
        .maybeSingle();

    if (error) throw error;
    return (data as AppAccount) ?? null;
}

export async function fetchAllowedEmployees(
    accountId: string,
): Promise<AllowedEmployee[]> {
    const aid = String(accountId ?? "").trim();
    if (!aid) return [];

    // app_account_employees.account_id -> employees.id
    const { data, error } = await supabase
        .from("app_account_employees")
        .select(
            `
      employee:employees (
        id,
        display_name,
        role
      )
    `,
        )
        .eq("account_id", aid);

    if (error) throw error;

    const rows = (data ?? []) as any[];
    return rows
        .map((r) => r?.employee ?? null)
        .filter(Boolean)
        .map((e) => ({
            id: String(e.id),
            display_name: String(e.display_name ?? "").trim() || "—",
            role: String(e.role ?? "").trim() || "",
        }));
}

export function roleFromAllowedEmployees(list: AllowedEmployee[]): string {
    const roles = Array.from(
        new Set(
            list.map((e) => String(e.role ?? "").toLowerCase()).filter(Boolean),
        ),
    );
    // bei dir ist es typischerweise genau 1 rolle pro shared account (mechanic/detailer/dealer)
    return roles[0] ?? "";
}

export function useMyAppAccount(userId?: string | null) {
    const [loading, setLoading] = useState(false);
    const [account, setAccount] = useState<AppAccount | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        const uid = String(userId ?? "").trim();
        if (!uid) {
            setAccount(null);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const acc = await fetchAppAccountByUserId(uid);
            setAccount(acc);
        } catch (e: any) {
            setAccount(null);
            setError(e?.message ?? "Konnte Account nicht laden.");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        load();
    }, [load]);

    return { loading, account, error, reload: load };
}

export function useAllowedEmployees(accountId?: string | null) {
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<AllowedEmployee[]>([]);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        const aid = String(accountId ?? "").trim();
        if (!aid) {
            setEmployees([]);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const list = await fetchAllowedEmployees(aid);
            setEmployees(list);
        } catch (e: any) {
            setEmployees([]);
            setError(e?.message ?? "Konnte Mitarbeiter-Liste nicht laden.");
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => {
        load();
    }, [load]);

    return { loading, employees, error, reload: load };
}
