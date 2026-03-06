// src/services/realtime/useRealtimeRefetchOnTables.ts
import { useEffect, useMemo, useRef } from "react";
import { useIsFocused } from "@react-navigation/native";

import {
    tasksRealtime,
    type TasksRealtimeEvent,
    type WatchedTable,
} from "@/src/services/realtime/tasksRealtime";

export type RealtimeRefetchOnTablesOptions = {
    /**
     * When false, the hook does nothing.
     * Note: focus gating is applied automatically (only refetch while screen is focused).
     */
    enabled?: boolean;

    /**
     * Which tables should trigger a refetch.
     * These names must match the Postgres table names used in Realtime.
     */
    tables: WatchedTable[];

    /**
     * Debounce in ms to avoid bursts (multiple writes) causing repeated refetches.
     */
    debounceMs?: number;

    /**
     * Called after debounce when a matching change event is received.
     * You normally pass a react-query `refetch()` function.
     *
     * We accept any return type because react-query's refetch returns QueryObserverResult.
     */
    onChange: () => unknown | Promise<unknown>;
};

function isChangeForTables(
    evt: TasksRealtimeEvent,
    tables: readonly WatchedTable[],
): boolean {
    return evt.type === "change" && tables.includes(evt.table);
}

/**
 * Lightweight bridge: Supabase Realtime (via tasksRealtime bus) -> "refetch the screen data".
 *
 * Why this exists:
 * - InvalidateQueries alone is sometimes too indirect (key mismatches, disabled queries, etc.)
 * - Dashboards should refresh only while visible (focused)
 * - Debounce to avoid rapid repeated refetches
 */
export function useRealtimeRefetchOnTables(
    opts: RealtimeRefetchOnTablesOptions,
) {
    const isFocused = useIsFocused();

    const enabled = (opts.enabled ?? true) && isFocused;
    const debounceMs = opts.debounceMs ?? 350;

    const tablesKey = useMemo(() => opts.tables.join("|"), [opts.tables]);
    const tables = useMemo(() => opts.tables, [tablesKey]);

    const onChangeRef = useRef(opts.onChange);
    onChangeRef.current = opts.onChange;

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!enabled) return;

        tasksRealtime.start();

        const unsub = tasksRealtime.on((evt) => {
            if (!isChangeForTables(evt, tables)) return;

            if (timerRef.current) clearTimeout(timerRef.current);

            timerRef.current = setTimeout(() => {
                try {
                    void onChangeRef.current();
                } catch {
                    // ignore
                }
            }, debounceMs);
        });

        return () => {
            unsub();
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = null;
        };
    }, [enabled, debounceMs, tablesKey]);
}
