import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { makeJson, randomHex, requireAdmin } from "../_shared/adminGuard.ts";

type Payload = {
    employee_id?: string;
    expires_days?: number; // default 30
};

serve(async (req) => {
    try {
        if (req.method !== "POST") {
            return makeJson(405, { error: "Method not allowed" });
        }

        const guard = await requireAdmin(req);
        if (!guard.ok) return makeJson(guard.status, { error: guard.error });

        const body = (await req.json()) as Payload;
        const employeeId = String(body.employee_id ?? "").trim();
        const expiresDays =
            Number.isFinite(body.expires_days) && Number(body.expires_days) > 0
                ? Math.min(Math.max(Number(body.expires_days), 1), 365)
                : 30;

        if (!employeeId) return makeJson(400, { error: "Missing employee_id" });

        // employee must exist and should NOT be bound yet (personal invite)
        const { data: emp, error: empErr } = await guard.admin
            .from("employees")
            .select("id, active, account_user_id")
            .eq("id", employeeId)
            .maybeSingle();

        if (empErr) throw empErr;
        if (!emp?.id) return makeJson(400, { error: "Employee not found" });
        if (emp.active !== true) {
            return makeJson(400, { error: "Employee inactive" });
        }
        if (emp.account_user_id) {
            return makeJson(400, { error: "Employee already has an account" });
        }

        const code = randomHex(6);
        const expiresAt = new Date(
            Date.now() + expiresDays * 24 * 60 * 60 * 1000,
        ).toISOString();

        const { data, error } = await guard.admin
            .from("app_employee_invites")
            .insert({
                id: crypto.randomUUID(),
                code,
                employee_id: employeeId,
                created_at: new Date().toISOString(),
                expires_at: expiresAt,
                used_at: null,
                used_by: null,
            })
            .select("code, employee_id, expires_at")
            .maybeSingle();

        if (error) throw error;

        return makeJson(200, { ok: true, invite: data });
    } catch (e: any) {
        console.error("admin-create-employee-invite error:", e);
        return makeJson(500, { error: e?.message ?? String(e) });
    }
});
