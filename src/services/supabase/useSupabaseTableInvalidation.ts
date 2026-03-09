import { useCallback, useEffect, useMemo, useRef } from "react";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/src/lib/supabase";

type UseSupabaseTableInvalidationOptions = {
    schema?: string;
    tables: string[];
    enabled?: boolean;
    debounceMs?: number;
    invalidateQueryKeys?: readonly QueryKey[];
};

export function useSupabaseTableInvalidation({
    schema = "public",
    tables,
    enabled = true,
    debounceMs = 400,
    invalidateQueryKeys = [],
}: UseSupabaseTableInvalidationOptions) {
    const queryClient = useQueryClient();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const normalizedTables = useMemo(() => {
        return [...tables].sort();
    }, [tables]);

    const channelName = useMemo(() => {
        return `rt:invalidate:${schema}:${normalizedTables.join(",")}`;
    }, [schema, normalizedTables]);

    const invalidate = useCallback(() => {
        if (invalidateQueryKeys.length > 0) {
            invalidateQueryKeys.forEach((queryKey) => {
                void queryClient.invalidateQueries({ queryKey });
            });
            return;
        }

        void queryClient.invalidateQueries();
    }, [invalidateQueryKeys, queryClient]);

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
                        invalidate();
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
    }, [
        channelName,
        debounceMs,
        enabled,
        invalidate,
        normalizedTables,
        schema,
    ]);
}
