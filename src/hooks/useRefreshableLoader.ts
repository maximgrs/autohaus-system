import { useCallback, useRef, useState } from "react";

export type LoadMode = "initial" | "refresh" | "silent";

type Options<T> = {
    initialData: T;
};

/**
 * A small, safe loader helper for screens that need:
 * - initial load
 * - pull-to-refresh
 * - background refresh (e.g. realtime)
 *
 * Guarantees:
 * - Only the latest in-flight request is allowed to update state
 * - You can cancel all in-flight work on blur to avoid stuck spinners
 */
export function useRefreshableLoader<T>(
    fetcher: () => Promise<T>,
    options: Options<T>,
) {
    const [data, setData] = useState<T>(options.initialData);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Monotonic request id to ignore stale responses
    const requestIdRef = useRef(0);

    const run = useCallback(
        async (mode: LoadMode = "silent") => {
            const requestId = ++requestIdRef.current;

            if (mode === "initial") setIsLoading(true);
            if (mode === "refresh") setIsRefreshing(true);

            try {
                const next = await fetcher();

                // Ignore stale results
                if (requestId !== requestIdRef.current) return next;

                setData(next);
                return next;
            } finally {
                // Ignore stale completions
                if (requestId !== requestIdRef.current) return;

                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [fetcher],
    );

    /**
     * Cancel all in-flight work and reset spinners.
     * Use on screen blur (tab change / navigation away).
     */
    const cancel = useCallback(() => {
        requestIdRef.current += 1;
        setIsLoading(false);
        setIsRefreshing(false);
    }, []);

    return {
        data,
        setData,
        isLoading,
        isRefreshing,
        run,
        cancel,
    };
}
