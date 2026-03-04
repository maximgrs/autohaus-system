import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { makeJson, requireAdmin } from "../_shared/adminGuard.ts";

type Payload = {
    employee_id?: string;
    active?: boolean;
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
        const active = Boolean(body.active);

        if (!employeeId) return makeJson(400, { error: "Missing employee_id" });

        const { data, error } = await guard.admin
            .from("employees")
            .update({ active, updated_at: new Date().toISOString() })
            .eq("id", employeeId)
            .select("id, display_name, role, active, account_user_id")
            .maybeSingle();

        if (error) throw error;

        return makeJson(200, { ok: true, employee: data });
    } catch (e: any) {
        console.error("admin-set-employee-active error:", e);
        return makeJson(500, { error: e?.message ?? String(e) });
    }
});
