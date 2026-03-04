import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";

export function useAuthSession(): {
    loading: boolean;
    session: Session | null;
    user: User | null;
    signOut: () => Promise<void>;
} {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        let alive = true;

        (async () => {
            const { data } = await supabase.auth.getSession();
            if (!alive) return;
            setSession(data.session ?? null);
            setLoading(false);
        })();

        const { data } = supabase.auth.onAuthStateChange((_evt, next) => {
            if (!alive) return;
            setSession(next ?? null);
            setLoading(false);
        });

        return () => {
            alive = false;
            data.subscription.unsubscribe();
        };
    }, []);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
    }, []);

    return { loading, session, user: session?.user ?? null, signOut };
}
