// src/features/session/useSupabaseSession.ts
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";

export function useSupabaseSession() {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        let mounted = true;

        (async () => {
            const { data, error } = await supabase.auth.getSession();
            if (!mounted) return;
            if (error) {
                setSession(null);
                setLoading(false);
                return;
            }
            setSession(data.session ?? null);
            setLoading(false);
        })();

        const { data: sub } = supabase.auth.onAuthStateChange(
            (_event, next) => {
                setSession(next);
            },
        );

        return () => {
            mounted = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    return { loading, session, user: session?.user ?? null };
}
