import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

import {
    carxCarList,
    type CarxCarListResponse,
    type CarxImageSize,
    carxLastModified,
} from "@/src/features/carx/carx.service";

import type { InventoryRow } from "./inventory.types";
import { mapCarsToRows, mergeUniqueById } from "./inventory.mapper";

import {
    getCachedCarListFirstPage,
    getCachedLastModified,
    makeCarListCacheKey,
    setCachedCarListFirstPage,
    setCachedLastModified,
} from "@/src/features/carx/carx.cache";

type UseInventoryCarsArgs = {
    status?: number;
    pageSize?: number;
    imageSize?: CarxImageSize;
};

export function useInventoryCars(args?: UseInventoryCarsArgs) {
    const status = args?.status ?? 1;
    const pageSize = args?.pageSize ?? 250;
    const imageSize = args?.imageSize ?? "xxxxl";

    const cacheKey = useMemo(
        () => makeCarListCacheKey({ status, pageSize, imageSize }),
        [status, pageSize, imageSize],
    );

    const [rows, setRows] = useState<InventoryRow[]>([]);
    const [totalHits, setTotalHits] = useState<number | null>(null);

    const [pos, setPos] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const [loadingInitial, setLoadingInitial] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const hydratedRef = useRef(false);

    const applyFirstPage = useCallback((res: CarxCarListResponse) => {
        const mapped = mapCarsToRows(res.cars);

        setRows(mapped);
        setTotalHits(res.hits);

        const nextPos = mapped.length;
        setPos(nextPos);
        setHasMore(nextPos < res.hits);
    }, []);

    const loadFirstPage = useCallback(async () => {
        setLoadingInitial(true);
        setHasMore(true);
        setPos(0);

        try {
            const res = await carxCarList({
                status,
                pos: 0,
                show: pageSize,
                imageSize,
                sort: ["last_chg"],
                direction: "down",
            });

            applyFirstPage(res);

            // Cache: erste Seite speichern
            await setCachedCarListFirstPage(cacheKey, res);
        } catch (e: any) {
            console.log("inventory loadFirstPage error", e?.message ?? e);
        } finally {
            setLoadingInitial(false);
        }
    }, [applyFirstPage, cacheKey, imageSize, pageSize, status]);

    const hydrateFromCache = useCallback(async () => {
        if (hydratedRef.current) return;

        try {
            const cached = await getCachedCarListFirstPage<CarxCarListResponse>(
                cacheKey,
            );
            if (cached?.cars?.length) {
                applyFirstPage(cached);
            }
        } finally {
            hydratedRef.current = true;
        }
    }, [applyFirstPage, cacheKey]);

    const refreshIfChanged = useCallback(
        async (force = false) => {
            try {
                const lm = await carxLastModified();
                const cachedTs = await getCachedLastModified();

                const changed = !cachedTs ||
                    cachedTs !== lm.last_modified_timestamp;

                if (force || changed || rows.length === 0) {
                    await loadFirstPage();
                    await setCachedLastModified(lm.last_modified_timestamp);
                }
            } catch (e: any) {
                console.log(
                    "inventory refreshIfChanged error",
                    e?.message ?? e,
                );
                // fallback: wenn last_modified fehlschlägt, wenigstens laden wenn noch nichts da ist
                if (rows.length === 0) await loadFirstPage();
            }
        },
        [loadFirstPage, rows.length],
    );

    const loadMore = useCallback(async () => {
        if (loadingInitial || loadingMore) return;
        if (!hasMore) return;

        setLoadingMore(true);
        try {
            const res = await carxCarList({
                status,
                pos,
                show: pageSize,
                imageSize,
                sort: ["last_chg"],
                direction: "down",
            });

            const mapped = mapCarsToRows(res.cars);

            setRows((prev) => mergeUniqueById(prev, mapped));
            setTotalHits(res.hits);

            const newPos = pos + mapped.length;
            setPos(newPos);
            setHasMore(newPos < res.hits && mapped.length > 0);
        } catch (e: any) {
            console.log("inventory loadMore error", e?.message ?? e);
        } finally {
            setLoadingMore(false);
        }
    }, [
        hasMore,
        imageSize,
        loadingInitial,
        loadingMore,
        pageSize,
        pos,
        status,
    ]);

    const refresh = useCallback(async () => {
        setRefreshing(true);
        try {
            // Pull-to-refresh: nur neu laden wenn changed, sonst schnell fertig
            await refreshIfChanged(false);
        } finally {
            setRefreshing(false);
        }
    }, [refreshIfChanged]);

    // Focus: Cache zeigen + nur bei Änderung neu laden
    useFocusEffect(
        useCallback(() => {
            let cancelled = false;

            (async () => {
                await hydrateFromCache();
                if (!cancelled) await refreshIfChanged(false);
            })();

            return () => {
                cancelled = true;
            };
        }, [hydrateFromCache, refreshIfChanged]),
    );

    return {
        rows,
        totalHits,
        hasMore,
        pos,
        loadingInitial,
        loadingMore,
        refreshing,
        refresh,
        loadMore,
        reload: () => refreshIfChanged(true), // force reload
    };
}
