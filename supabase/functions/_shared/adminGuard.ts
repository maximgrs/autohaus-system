import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function makeJson(status: number, body: Record<string, unknown>) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

async function fetchUserFromToken(url: string, apikey: string, token: string) {
    const res = await fetch(`${url}/auth/v1/user`, {
        method: "GET",
        headers: {
            apikey,
            Authorization: `Bearer ${token}`,
        },
    });

    const txt = await res.text();
    if (!res.ok) {
        // Auth returns json usually, but keep it safe
        let msg = txt;
        try {
            const j = JSON.parse(txt);
            msg = String(j?.msg ?? j?.error_description ?? j?.error ?? txt);
        } catch {}
        return { ok: false as const, status: res.status, error: msg };
    }

    try {
        const j = JSON.parse(txt);
        const id = String(j?.id ?? "");
        const email = j?.email ? String(j.email) : null;
        if (!id) {
            return {
                ok: false as const,
                status: 401,
                error: "Invalid token (no user id)",
            };
        }
        return { ok: true as const, userId: id, email };
    } catch {
        return {
            ok: false as const,
            status: 401,
            error: "Invalid token (bad auth response)",
        };
    }
}

export async function requireAdmin(req: Request) {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!url || !serviceKey) {
        throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const tokenRaw = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : "";
    const token = tokenRaw.trim();

    if (!token) {
        return {
            ok: false as const,
            status: 401,
            error: "Missing bearer token",
        };
    }

    // quick sanity check (JWT has 2 dots)
    if (token.split(".").length !== 3) {
        return {
            ok: false as const,
            status: 401,
            error: "Bearer token is not a JWT",
        };
    }

    // ✅ Validate token via Auth HTTP endpoint
    const u = await fetchUserFromToken(url, serviceKey, token);
    if (!u.ok) {
        return {
            ok: false as const,
            status: 401,
            error: `Invalid token: ${u.error}`,
        };
    }

    const admin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // Admin check via public.accounts
    const { data: acc, error: accErr } = await admin
        .from("accounts")
        .select("user_id, role, active, account_type")
        .eq("user_id", u.userId)
        .maybeSingle();

    if (accErr) throw accErr;

    if (!acc?.user_id || acc.active !== true) {
        return { ok: false as const, status: 403, error: "Account inactive" };
    }
    if (String(acc.role) !== "admin") {
        return { ok: false as const, status: 403, error: "Admin only" };
    }

    return { ok: true as const, admin, userId: u.userId, email: u.email };
}

export function randomHex(bytes = 6) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}
