import { useCallback, useMemo, useRef } from "react";
import { useFocusEffect } from "expo-router";

import { type QueryKey, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/src/lib/supabase";

type PostgresEvent = "*" | "INSERT" | "UPDATE" | "DELETE";

export type SupabaseTableInvalidationOptions = {
    schema?: string;

    /** Use either `table` or `tables` */
    table?: string;
    tables?: string[];

    event?: PostgresEvent;

    /** If false, hook does nothing */
    enabled?: boolean;

    /** Debounce multiple realtime events into one invalidation */
    debounceMs?: number;

    /** If provided, invalidates these query keys */
    invalidateQueryKeys?: QueryKey[];

    /** Optional custom handler instead of invalidation */
    onChange?: () => void;

    /** Optional explicit channel name */
    channelName?: string;

    /**
     * Backwards-compatible alias (some dashboards already use `channel`)
     * Prefer `channelName` going forward.
     */
    channel?: string;
};

function normalizeTables(opts: SupabaseTableInvalidationOptions): string[] {
    const fromSingle = String(opts.table ?? "").trim();
    const fromMany = (opts.tables ?? [])
        .map((t) => String(t).trim())
        .filter(Boolean);

    const list = fromSingle ? [fromSingle, ...fromMany] : fromMany;

    // de-dupe while preserving order
    const seen = new Set<string>();
    return list.filter((t) => (seen.has(t) ? false : (seen.add(t), true)));
}

export function useSupabaseTableInvalidation(
    opts: SupabaseTableInvalidationOptions,
) {
    const queryClient = useQueryClient();

    const schema = String(opts.schema ?? "public");
    const event: PostgresEvent = (opts.event ?? "*") as PostgresEvent;
    const enabled = opts.enabled ?? true;
    const debounceMs = Math.max(0, Number(opts.debounceMs ?? 600));

    // Important: do NOT depend on opts.tables by reference (array literals would resubscribe every render)
    const tablesInputKey = (opts.tables ?? []).join("|");
    const tables = useMemo(() => normalizeTables(opts), [
        opts.table,
        tablesInputKey,
    ]);

    const tablesKey = useMemo(() => tables.slice().sort().join("|"), [tables]);

    // Keep latest callbacks/keys without causing resubscribe loops
    const onChangeRef = useRef<SupabaseTableInvalidationOptions["onChange"]>(
        opts.onChange,
    );
    onChangeRef.current = opts.onChange;

    const invalidateKeysRef = useRef<
        SupabaseTableInvalidationOptions["invalidateQueryKeys"]
    >(
        opts.invalidateQueryKeys,
    );
    invalidateKeysRef.current = opts.invalidateQueryKeys;

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingRef = useRef(false);

    const flush = useCallback(() => {
        pendingRef.current = false;

        const onChange = onChangeRef.current;
        if (onChange) {
            onChange();
            return;
        }

        const keys = invalidateKeysRef.current ?? [];
        for (const key of keys) {
            // works for react-query v4/v5
            queryClient.invalidateQueries({ queryKey: key });
        }
    }, [queryClient]);

    const schedule = useCallback(() => {
        if (pendingRef.current) return;

        pendingRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(flush, debounceMs);
    }, [debounceMs, flush]);

    useFocusEffect(
        useCallback(() => {
            if (!enabled) return;
            if (!tables.length) return;

            const explicitName = String(opts.channelName ?? opts.channel ?? "")
                .trim();
            const name = explicitName ||
                `invalidate:${schema}:${tablesKey}:${event}`;

            const channel = supabase.channel(name);

            for (const table of tables) {
                channel.on("postgres_changes", { event, schema, table }, () => {
                    schedule();
                });
            }

            channel.subscribe();

            return () => {
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = null;
                pendingRef.current = false;

                supabase.removeChannel(channel);
            };
        }, [
            enabled,
            event,
            schema,
            schedule,
            tablesKey,
            tablesInputKey,
            opts.channelName,
            opts.channel,
        ]),
    );
}

export default useSupabaseTableInvalidation;
