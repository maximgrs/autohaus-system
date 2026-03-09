import { useEffect, useMemo, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/src/lib/supabase";

type Options = {
    schema?: string;
    tables: string[];
    enabled?: boolean;
    debounceMs?: number;
    onChange: () => void | Promise<void>;
};

export function useRealtimeRefetchOnTables({
    schema = "public",
    tables,
    enabled = true,
    debounceMs = 400,
    onChange,
}: Options) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const normalizedTables = useMemo(() => {
        return [...tables].sort();
    }, [tables]);

    const channelName = useMemo(() => {
        return `rt:refetch:${schema}:${normalizedTables.join(",")}`;
    }, [schema, normalizedTables]);

    useEffect(() => {
        if (!enabled || normalizedTables.length === 0) {
            return;
        }

        let channel: RealtimeChannel | null = supabase.channel(channelName);

        normalizedTables.forEach((table) => {
            channel = channel!.on(
                "postgres_changes",
                {
                    event: "*",
                    schema,
                    table,
                },
                () => {
                    if (timerRef.current) {
                        clearTimeout(timerRef.current);
                    }

                    timerRef.current = setTimeout(() => {
                        void onChange();
                    }, debounceMs);
                },
            );
        });

        void channel.subscribe();

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            if (channel) {
                void supabase.removeChannel(channel);
            }
        };
    }, [channelName, debounceMs, enabled, normalizedTables, onChange, schema]);
}
