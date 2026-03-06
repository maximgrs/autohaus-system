import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/src/services/supabase/client";

type Options = {
    schema?: string;
    table: string;
    events?: ("INSERT" | "UPDATE" | "DELETE")[] | "*";
    /**
     * Queries to invalidate when the table changes.
     * Example: [qk.tasks.detailerQueue(), qk.tasks.byId(id)]
     */
    queryKeys: QueryKey[];
    enabled?: boolean;
    /**
     * Debounce invalidation to avoid spamming refetches during bursts of updates.
     */
    debounceMs?: number;
};

export function useSupabaseTableInvalidation(options: Options) {
    const {
        schema = "public",
        table,
        events = "*",
        queryKeys,
        enabled = true,
        debounceMs = 150,
    } = options;

    const queryClient = useQueryClient();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const invalidate = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            for (const key of queryKeys) {
                queryClient.invalidateQueries({ queryKey: key });
            }
        }, debounceMs);
    }, [debounceMs, queryClient, queryKeys]);

    useFocusEffect(
        useCallback(() => {
            if (!enabled) return;

            const channel = supabase
                .channel(`rt:${schema}:${table}:${Date.now()}`)
                .on(
                    "postgres_changes",
                    { event: events as any, schema, table },
                    () => invalidate(),
                )
                .subscribe();

            return () => {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
                void supabase.removeChannel(channel);
            };
        }, [enabled, events, invalidate, schema, table]),
    );
}
