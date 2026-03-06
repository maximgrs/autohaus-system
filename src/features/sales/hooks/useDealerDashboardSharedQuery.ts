import { useQuery } from "@tanstack/react-query";

import {
    type DealerDashboardItem,
    fetchDealerDashboardV2,
} from "@/src/features/sales/dealerDashboard.service";
import { dealerDashboardQueryKeyPrefix } from "@/src/features/sales/hooks/useDealerDashboardQuery";

function uniqBySaleId(items: DealerDashboardItem[]) {
    const map = new Map<string, DealerDashboardItem>();
    for (const it of items) {
        const id = String((it as any)?.sale_id ?? "");
        if (!id) continue;
        if (!map.has(id)) map.set(id, it);
    }
    return Array.from(map.values());
}

export function dealerDashboardSharedQueryKey(args: {
    accountId: string;
    dealerEmployeeIds: string[];
}) {
    const idsKey = [...args.dealerEmployeeIds].sort().join("|");
    return [
        ...dealerDashboardQueryKeyPrefix,
        "shared",
        args.accountId,
        idsKey,
    ] as const;
}

export function useDealerDashboardSharedQuery(args: {
    accountId: string;
    dealerEmployeeIds: string[];
    enabled?: boolean;
}) {
    const enabled = (args.enabled ?? true) &&
        Array.isArray(args.dealerEmployeeIds) &&
        args.dealerEmployeeIds.length > 0;

    return useQuery<DealerDashboardItem[]>({
        queryKey: dealerDashboardSharedQueryKey({
            accountId: args.accountId,
            dealerEmployeeIds: args.dealerEmployeeIds,
        }),
        enabled,
        queryFn: async () => {
            const ids = [...args.dealerEmployeeIds].map((x) => String(x).trim())
                .filter(Boolean);
            if (ids.length === 0) return [];

            const settled = await Promise.allSettled(
                ids.map((dealerEmployeeId) =>
                    fetchDealerDashboardV2({ dealerEmployeeId })
                ),
            );

            const all: DealerDashboardItem[] = [];
            for (const r of settled) {
                if (r.status === "fulfilled") all.push(...(r.value ?? []));
            }

            return uniqBySaleId(all);
        },
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
    });
}
