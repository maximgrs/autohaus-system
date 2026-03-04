import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { makeJson, requireAdmin } from "../_shared/adminGuard.ts";

type SharedAccountOut = {
    user_id: string;
    email: string;
    role: string;
    active: boolean;
    created_at: string | null;
    employees: Array<{
        id: string;
        display_name: string;
        role: string;
        active: boolean;
    }>;
};

serve(async (req) => {
    try {
        if (req.method !== "POST") {
            return makeJson(405, { error: "Method not allowed" });
        }

        const guard = await requireAdmin(req);
        if (!guard.ok) return makeJson(guard.status, { error: guard.error });

        // 1) Shared Accounts aus public.accounts
        const { data: shared, error: sErr } = await guard.admin
            .from("accounts")
            .select("user_id, role, account_type, active, created_at")
            .eq("account_type", "shared")
            .order("created_at", { ascending: false });

        if (sErr) throw sErr;

        const rows = (shared ?? []) as any[];
        const userIds = rows.map((r) => String(r.user_id)).filter(Boolean);

        // 2) Email via Auth Admin API (kein auth schema query!)
        const emailById = new Map<string, string>();

        await Promise.all(
            userIds.map(async (uid) => {
                try {
                    const { data, error } = await guard.admin.auth.admin
                        .getUserById(uid);
                    if (error) {
                        emailById.set(uid, "");
                        return;
                    }
                    emailById.set(uid, String(data.user?.email ?? ""));
                } catch {
                    emailById.set(uid, "");
                }
            }),
        );

        // 3) Employees, die an Shared Login gebunden sind
        let employeesByAccount = new Map<string, any[]>();
        if (userIds.length > 0) {
            const { data: emps, error: eErr } = await guard.admin
                .from("employees")
                .select("id, display_name, role, active, account_user_id")
                .in("account_user_id", userIds);

            if (eErr) throw eErr;

            for (const e of (emps ?? []) as any[]) {
                const k = String(e.account_user_id ?? "");
                if (!k) continue;
                if (!employeesByAccount.has(k)) employeesByAccount.set(k, []);
                employeesByAccount.get(k)!.push({
                    id: e.id,
                    display_name: e.display_name,
                    role: e.role,
                    active: e.active,
                });
            }
        }

        const out: SharedAccountOut[] = rows.map((r) => {
            const uid = String(r.user_id);
            return {
                user_id: uid,
                email: emailById.get(uid) ?? "",
                role: String(r.role ?? ""),
                active: Boolean(r.active),
                created_at: r.created_at ? String(r.created_at) : null,
                employees: employeesByAccount.get(uid) ?? [],
            };
        });

        return makeJson(200, { ok: true, shared_accounts: out });
    } catch (e: any) {
        console.error("admin-list-shared-accounts error:", e);
        return makeJson(500, { error: e?.message ?? String(e) });
    }
});
