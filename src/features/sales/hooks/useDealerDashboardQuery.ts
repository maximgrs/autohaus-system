import { type QueryKey, useQuery } from "@tanstack/react-query";
import {
    type DealerDashboardItem,
    fetchDealerDashboardAdminV2,
    fetchDealerDashboardV2,
} from "@/src/features/sales/dealerDashboard.service";

export type DealerDashboardQueryMode = "admin" | "dealer";

export type DealerDashboardQueryParams =
    | { mode: "admin" }
    | { mode: "dealer"; dealerEmployeeId: string };

export const dealerDashboardQueryKeyPrefix = ["dealerDashboard"] as const;

export function dealerDashboardQueryKey(
    params: DealerDashboardQueryParams,
): QueryKey {
    return params.mode === "admin"
        ? [...dealerDashboardQueryKeyPrefix, "admin"]
        : [...dealerDashboardQueryKeyPrefix, "dealer", params.dealerEmployeeId];
}

export function useDealerDashboardQuery(params: DealerDashboardQueryParams) {
    return useQuery<DealerDashboardItem[], Error>({
        queryKey: dealerDashboardQueryKey(params),
        queryFn: async () => {
            if (params.mode === "admin") {
                return fetchDealerDashboardAdminV2();
            }
            return fetchDealerDashboardV2({
                dealerEmployeeId: params.dealerEmployeeId,
            });
        },
        // We want “always correct” over “stale but fast” for dashboards
        staleTime: 0,
        gcTime: 1000 * 60 * 10,
        retry: 1,
    });
}
