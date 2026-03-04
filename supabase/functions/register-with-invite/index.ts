import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(status: number, body: Record<string, unknown>) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

type Payload = {
    email?: string;
    password?: string;
    code?: string;
};

serve(async (req) => {
    try {
        if (req.method !== "POST") {
            return json(405, { error: "Method not allowed" });
        }

        const { email, password, code } = (await req.json()) as Payload;

        const e = String(email ?? "").trim().toLowerCase();
        const p = String(password ?? "").trim();
        const c = String(code ?? "").trim();

        if (!e || !p || !c) {
            return json(400, { error: "Missing email/password/code" });
        }
        if (p.length < 6) return json(400, { error: "Password too short" });

        const url = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        if (!url || !serviceKey) return json(500, { error: "Missing env" });

        const admin = createClient(url, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        // 1) Validate invite
        const { data: invite, error: invErr } = await admin
            .from("app_employee_invites")
            .select("id, code, employee_id, expires_at, used_at, used_by")
            .eq("code", c)
            .maybeSingle();

        if (invErr) throw invErr;
        if (!invite?.id) return json(400, { error: "Invalid invite code" });
        if (invite.used_at) return json(400, { error: "Invite already used" });

        if (invite.expires_at) {
            const ex = new Date(invite.expires_at);
            if (!Number.isNaN(ex.getTime()) && ex.getTime() < Date.now()) {
                return json(400, { error: "Invite expired" });
            }
        }

        const employeeId = String(invite.employee_id ?? "").trim();
        if (!employeeId) {
            return json(400, { error: "Invite missing employee_id" });
        }

        // 2) Load employee (role comes from employee_role enum)
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

        // prevent binding to an already bound employee (optional but recommended)
        if (emp.account_user_id) {
            return json(400, { error: "Employee already bound to an account" });
        }

        const role = emp.role; // employee_role enum value

        // 3) Create auth user
        const { data: created, error: cErr } = await admin.auth.admin
            .createUser({
                email: e,
                password: p,
                email_confirm: true,
            });
        if (cErr) throw cErr;

        const userId = created.user?.id;
        if (!userId) return json(500, { error: "User create failed" });

        // 4) Create/Update public.accounts (individual)
        const { error: accErr } = await admin
            .from("accounts")
            .upsert(
                {
                    user_id: userId,
                    role, // enum employee_role
                    account_type: "individual",
                    active: true,
                    created_at: new Date().toISOString(),
                },
                { onConflict: "user_id" },
            );
        if (accErr) throw accErr;

        // 5) Set default_employee_id in app_accounts
        const { error: appAccErr } = await admin
            .from("app_accounts")
            .upsert(
                {
                    user_id: userId,
                    default_employee_id: employeeId,
                },
                { onConflict: "user_id" },
            );
        if (appAccErr) throw appAccErr;

        // 6) Bind employee to this auth user (personal)
        const { error: bindErr } = await admin
            .from("employees")
            .update({ account_user_id: userId })
            .eq("id", employeeId);
        if (bindErr) throw bindErr;

        // 7) Mark invite used
        const { error: usedErr } = await admin
            .from("app_employee_invites")
            .update({ used_at: new Date().toISOString(), used_by: userId })
            .eq("id", invite.id);
        if (usedErr) throw usedErr;

        return json(200, { ok: true, userId });
    } catch (e: any) {
        console.error("register-with-invite error:", e);
        return json(500, { error: e?.message ?? String(e) });
    }
});
