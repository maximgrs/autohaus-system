import { useCallback, useEffect, useRef, useState } from "react";

export function useRefresh(onRefreshAsync: () => Promise<void>) {
    const [refreshing, setRefreshing] = useState(false);
    const aliveRef = useRef(true);

    useEffect(() => {
        aliveRef.current = true;
        return () => {
            aliveRef.current = false;
        };
    }, []);

    const refresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await onRefreshAsync();
        } finally {
            // prevents stuck spinner when screen unmounts mid-refresh
            if (aliveRef.current) setRefreshing(false);
        }
    }, [onRefreshAsync]);

    return { refreshing, refresh };
}
