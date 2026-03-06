// src/hooks/useListController.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

export type ListLoadMode = "initial" | "refresh" | "background";

type Options<T> = {
    enabled?: boolean;
    /**
     * Dependencies that define the query scope (e.g. filter, dealerId, etc).
     * When they change while the screen is focused, we refetch.
     */
    deps?: any[];
    fetcher: () => Promise<T[]>;
    initialData?: T[];
    /**
     * Automatically fetch on focus (and when deps change while focused).
     */
    auto?: boolean;
};

export function useListController<T>({
    enabled = true,
    deps = [],
    fetcher,
    initialData = [],
    auto = true,
}: Options<T>) {
    const [data, setData] = useState<T[]>(initialData);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const mountedRef = useRef(true);
    const requestIdRef = useRef(0);
    const dataRef = useRef<T[]>(initialData);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // If the query becomes disabled (e.g. missing dealerId), ensure spinners are cleared.
    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            setRefreshing(false);
        }
    }, [enabled]);

    const refetch = useCallback(
        async (mode: ListLoadMode = "initial") => {
            if (!enabled) return;

            const myRequestId = ++requestIdRef.current;

            if (mode === "initial") setLoading(true);
            if (mode === "refresh") setRefreshing(true);

            try {
                const next = await fetcher();

                // Only the latest request may update state.
                if (
                    !mountedRef.current || myRequestId !== requestIdRef.current
                ) return;
                setData(next);
            } finally {
                if (
                    !mountedRef.current || myRequestId !== requestIdRef.current
                ) return;
                setLoading(false);
                setRefreshing(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [enabled, fetcher, ...deps],
    );

    const refresh = useCallback(async () => {
        await refetch("refresh");
    }, [refetch]);

    // Auto load on focus (and when deps change while focused).
    useFocusEffect(
        useCallback(() => {
            if (!auto || !enabled) return;

            // If we already have data, refetch silently in the background.
            const mode: ListLoadMode = dataRef.current.length > 0
                ? "background"
                : "initial";
            void refetch(mode);
        }, [auto, enabled, refetch]),
    );

    const isEmpty = useMemo(() => !loading && data.length === 0, [
        data.length,
        loading,
    ]);

    return {
        data,
        setData,
        loading,
        refreshing,
        refetch,
        refresh,
        isEmpty,
    };
}
