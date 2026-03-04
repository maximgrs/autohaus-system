import { useCallback, useEffect, useState } from "react";
import { type DealerEmployee, fetchDealerEmployees } from "./dealers.service";

export function useDealers() {
    const [loading, setLoading] = useState(false);
    const [dealers, setDealers] = useState<DealerEmployee[]>([]);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const rows = await fetchDealerEmployees();
            setDealers(rows);
        } catch (e: any) {
            setError(e?.message ?? "Failed to load dealers");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { loading, dealers, error, reload: load };
}
