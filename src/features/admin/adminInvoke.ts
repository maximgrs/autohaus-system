import { supabase } from "@/src/lib/supabase";

async function parseFunctionError(error: any): Promise<string> {
    try {
        const res = error?.context;
        if (res && typeof res.text === "function") {
            const txt = await res.text();
            try {
                const j = JSON.parse(txt);
                return String(j?.error ?? txt);
            } catch {
                return String(txt);
            }
        }
    } catch {
        // ignore
    }
    return String(error?.message ?? "Edge Function error");
}

export async function invokeAdmin<T>(
    fnName: string,
    body: Record<string, unknown>,
): Promise<T> {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token ?? "";

    if (!token) {
        throw new Error("Nicht angemeldet (kein Access Token gefunden).");
    }

    const { data, error } = await supabase.functions.invoke(fnName, {
        body,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (error) throw new Error(await parseFunctionError(error));
    return data as T;
}
