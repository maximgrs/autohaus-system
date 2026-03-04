import { supabase } from "@/src/lib/supabase";

async function readErrorMessage(error: any): Promise<string> {
    // supabase-js hängt häufig den echten Response an error.context
    try {
        const res = error?.context;
        if (res && typeof res.text === "function") {
            const txt = await res.text();
            try {
                const j = JSON.parse(txt);
                return String(j?.error ?? j?.message ?? txt);
            } catch {
                return String(txt);
            }
        }
    } catch {
        // ignore
    }
    return String(error?.message ?? "Edge Function error");
}

function isInvalidSession(msg: string) {
    const m = msg.toLowerCase();
    return (
        m.includes("session_id") ||
        m.includes("session does not exist") ||
        m.includes("invalid token")
    );
}

export async function invokeEdge<T>(
    fnName: string,
    body: Record<string, unknown>,
): Promise<T> {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session?.access_token) throw new Error("Nicht angemeldet.");

    // best effort refresh (hilft bei kaputten Sessions in dev)
    let token = sess.session.access_token;
    try {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed.session?.access_token) {
            token = refreshed.session.access_token;
        }
    } catch {
        // ignore
    }

    const { data, error } = await supabase.functions.invoke(fnName, {
        body,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (error) {
        const msg = await readErrorMessage(error);
        if (isInvalidSession(msg)) {
            await supabase.auth.signOut();
            throw new Error("Session ungültig. Bitte neu anmelden.");
        }
        throw new Error(msg);
    }

    return data as T;
}
