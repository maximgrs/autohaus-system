import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(status: number, body: Record<string, unknown>) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

type Payload = {
    invite_type?: "employee" | "role";
    employee_id?: string;
    role?: string; // employee_role enum value
    expires_days?: number; // default 30
};

function randomCodeHex(bytes = 6) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

serve(async (req) => {
    try {
        if (req.method !== "POST") {
            return json(405, { error: "Method not allowed" });
        }

        const authHeader = req.headers.get("Authorization") ?? "";
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : "";
        if (!token) return json(401, { error: "Missing bearer token" });

        const url = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        if (!url || !serviceKey || !anonKey) {
            return json(500, { error: "Missing env" });
        }

        // Client with anon key + bearer -> resolves caller identity
        const userClient = createClient(url, anonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: userData, error: userErr } = await userClient.auth
            .getUser();
        if (userErr) return json(401, { error: "Invalid token" });
        const user = userData.user;
        if (!user?.id) return json(401, { error: "Invalid user" });

        // Service client for DB writes
        const admin = createClient(url, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        // Check admin via public.accounts (enum employee_role)
        const { data: acc, error: accErr } = await admin
            .from("accounts")
            .select("user_id, role, account_type, active")
            .eq("user_id", user.id)
            .maybeSingle();

        if (accErr) throw accErr;
        if (!acc?.user_id || acc.active !== true) {
            return json(403, { error: "Account inactive" });
        }
        if (String(acc.role) !== "admin") {
            return json(403, { error: "Admin only" });
        }

        const body = (await req.json()) as Payload;
        const inviteType = body.invite_type ?? "employee";
        const expiresDays = Number.isFinite(body.expires_days)
            ? Number(body.expires_days)
            : 30;
        const expiresAt = new Date(
            Date.now() + Math.max(1, expiresDays) * 24 * 60 * 60 * 1000,
        ).toISOString();

        const code = randomCodeHex(6); // 12 hex chars

        if (inviteType === "employee") {
            const employeeId = String(body.employee_id ?? "").trim();
            if (!employeeId) return json(400, { error: "Missing employee_id" });

            // employee must exist and be active
            const { data: emp, error: empErr } = await admin
                .from("employees")
                .select("id, role, active, account_user_id")
                .eq("id", employeeId)
                .maybeSingle();
            if (empErr) throw empErr;
            if (!emp?.id) return json(400, { error: "Employee not found" });
            if (emp.active !== true) {
                return json(400, { error: "Employee inactive" });
            }

            // Optional guard: if already bound, don’t issue invite
            if (emp.account_user_id) {
                return json(400, { error: "Employee already has an account" });
            }

            const { data: row, error } = await admin
                .from("app_employee_invites")
                .insert({
                    id: crypto.randomUUID(),
                    code,
                    invite_type: "employee",
                    employee_id: employeeId,
                    role: null,
                    created_at: new Date().toISOString(),
                    expires_at: expiresAt,
                    used_at: null,
                    used_by: null,
                    created_by_user_id: user.id,
                })
                .select("code, invite_type, employee_id, role, expires_at")
                .maybeSingle();

            if (error) throw error;
            return json(200, { ok: true, invite: row });
        }

        // role invite
        const role = String(body.role ?? "").trim();
        if (!role) return json(400, { error: "Missing role" });

        // Must be one of enum values in DB (we rely on DB constraint)
        const { data: row, error } = await admin
            .from("app_employee_invites")
            .insert({
                id: crypto.randomUUID(),
                code,
                invite_type: "role",
                employee_id: null,
                role,
                created_at: new Date().toISOString(),
                expires_at: expiresAt,
                used_at: null,
                used_by: null,
                created_by_user_id: user.id,
            })
            .select("code, invite_type, employee_id, role, expires_at")
            .maybeSingle();

        if (error) throw error;
        return json(200, { ok: true, invite: row });
    } catch (e: any) {
        console.error("admin-create-invite error:", e);
        return json(500, { error: e?.message ?? String(e) });
    }
});
