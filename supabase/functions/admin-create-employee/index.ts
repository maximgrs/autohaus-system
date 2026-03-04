import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { makeJson, requireAdmin } from "../_shared/adminGuard.ts";

type Payload = {
    display_name?: string;
    role?: string; // employee_role enum value
};

serve(async (req) => {
    try {
        if (req.method !== "POST") {
            return makeJson(405, { error: "Method not allowed" });
        }

        const guard = await requireAdmin(req);
        if (!guard.ok) return makeJson(guard.status, { error: guard.error });

        const body = (await req.json()) as Payload;
        const name = String(body.display_name ?? "").trim();
        const role = String(body.role ?? "").trim(); // must match enum value

        if (!name) return makeJson(400, { error: "Missing display_name" });
        if (!role) return makeJson(400, { error: "Missing role" });

        const id = crypto.randomUUID();

        const { data, error } = await guard.admin
            .from("employees")
            .insert({
                id,
                account_user_id: null,
                display_name: name,
                role,
                active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select("id, display_name, role, active, account_user_id")
            .maybeSingle();

        if (error) throw error;

        return makeJson(200, { ok: true, employee: data });
    } catch (e: any) {
        console.error("admin-create-employee error:", e);
        return makeJson(500, { error: e?.message ?? String(e) });
    }
});
