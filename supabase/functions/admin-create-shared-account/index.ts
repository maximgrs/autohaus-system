import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { makeJson, requireAdmin } from "../_shared/adminGuard.ts";

type Payload = {
    email?: string;
    password?: string;
    role?: string; // employee_role enum value: dealer/mechanic/detailer/listing
    employee_ids?: string[]; // optional: assign employees to this shared login
};

serve(async (req) => {
    try {
        if (req.method !== "POST") {
            return makeJson(405, { error: "Method not allowed" });
        }

        const guard = await requireAdmin(req);
        if (!guard.ok) return makeJson(guard.status, { error: guard.error });

        const body = (await req.json()) as Payload;
        const email = String(body.email ?? "").trim().toLowerCase();
        const password = String(body.password ?? "").trim();
        const role = String(body.role ?? "").trim();
        const employeeIds = Array.isArray(body.employee_ids)
            ? body.employee_ids.map(String)
            : [];

        if (!email) return makeJson(400, { error: "Missing email" });
        if (!password || password.length < 6) {
            return makeJson(400, { error: "Password too short" });
        }
        if (!role) return makeJson(400, { error: "Missing role" });

        // 1) create auth user
        const { data: created, error: cErr } = await guard.admin.auth.admin
            .createUser({
                email,
                password,
                email_confirm: true,
            });
        if (cErr) throw cErr;

        const userId = created.user?.id;
        if (!userId) return makeJson(500, { error: "User create failed" });

        // 2) set public.accounts -> shared + role
        const { error: accErr } = await guard.admin.from("accounts").upsert(
            {
                user_id: userId,
                role, // enum
                account_type: "shared",
                active: true,
                created_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
        );
        if (accErr) throw accErr;

        // 3) optional: assign employees to this shared login
        if (employeeIds.length > 0) {
            // validate employees: correct role, active, not bound
            const { data: emps, error: eErr } = await guard.admin
                .from("employees")
                .select("id, role, active, account_user_id")
                .in("id", employeeIds);

            if (eErr) throw eErr;

            const list = (emps ?? []) as any[];
            const missing = employeeIds.filter((id) =>
                !list.some((x) => String(x.id) === id)
            );
            if (missing.length) {
                return makeJson(400, {
                    error: `Employees not found: ${missing.join(", ")}`,
                });
            }

            for (const e of list) {
                if (e.active !== true) {
                    return makeJson(400, {
                        error: `Employee inactive: ${e.id}`,
                    });
                }
                if (String(e.role) !== role) {
                    return makeJson(400, {
                        error: `Role mismatch for employee ${e.id}`,
                    });
                }
                if (e.account_user_id) {
                    return makeJson(400, {
                        error: `Employee already bound: ${e.id}`,
                    });
                }
            }

            const { error: bindErr } = await guard.admin
                .from("employees")
                .update({
                    account_user_id: userId,
                    updated_at: new Date().toISOString(),
                })
                .in("id", employeeIds);

            if (bindErr) throw bindErr;
        }

        return makeJson(200, {
            ok: true,
            user_id: userId,
            email,
            role,
            assigned_count: employeeIds.length,
        });
    } catch (e: any) {
        console.error("admin-create-shared-account error:", e);
        return makeJson(500, { error: e?.message ?? String(e) });
    }
});
