import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import Screen from "@/src/components/ui/Screen";
import FilterChips, { type ChipOption } from "@/src/components/ui/FilterChips";
import DashboardCard from "@/src/components/ui/DashboardCard";
import { useDevEmployee } from "@/src/features/session/devSession";
import {
  fetchDealerDashboardAdminV2,
  fetchDealerDashboardV2,
  type DealerDashboardItem,
} from "@/src/features/sales/dealerDashboard.service";
import { useTaskTableInvalidation } from "@/src/features/tasks/realtime/useTaskTableInvalidation";

type AdminPicker = {
  onPress: () => void;
};

type EmployeeRole =
  | "admin"
  | "dealer"
  | "mechanic"
  | "detailer"
  | "listing"
  | string;

type ViewerAccount = {
  user_id: string;
  role: EmployeeRole;
  account_type: "shared" | "individual" | string;
  active: boolean;
};

type Props = {
  adminPicker?: AdminPicker;
  viewerAccount?: ViewerAccount;
};

type Filter = "all" | "open" | "ready" | "sold";

const FILTERS: ChipOption<Filter>[] = [
  { key: "all", label: "alle" },
  { key: "open", label: "offen" },
  { key: "ready", label: "bereit" },
  { key: "sold", label: "verkauft" },
];

const EMPTY_ITEMS: DealerDashboardItem[] = [];

export const dealerDashboardQueryKeyPrefix = ["dealerDashboardV2"] as const;

function titleFrom(item: DealerDashboardItem): string {
  const carx = item.carx_data ?? {};
  const brand = String(
    (carx as any)?.brand_txt ?? (carx as any)?.brand_name ?? "",
  ).trim();
  const model = String(
    (carx as any)?.model_name ?? (carx as any)?.model_txt ?? "",
  ).trim();

  const compact = [brand, model].filter(Boolean).join(" ").trim();
  if (compact) return compact;

  return item.draft_model?.trim() ? item.draft_model : (item.vin ?? "Fahrzeug");
}

function badgeFrom(item: DealerDashboardItem): {
  label: string;
  tone: "pending" | "done";
} {
  if (item.stage === "sold") return { label: "Verkauft", tone: "done" };
  if (item.stage === "ready") return { label: "Bereit", tone: "done" };
  if (String(item.sale_status) === "draft") {
    return { label: "Entwurf", tone: "pending" };
  }
  return { label: "Vertrag", tone: "pending" };
}

function subtitleFrom(item: DealerDashboardItem): string {
  if (item.stage === "draft") return "Entwurf: Kaufvertrag erstellen";
  if (item.stage === "ready") return "Übergabe: bestätigen";
  return "Verkaufsprozess";
}

function matches(item: DealerDashboardItem, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "open")
    return item.stage === "draft" || item.stage === "contract";
  if (filter === "ready") return item.stage === "ready";
  return item.stage === "sold";
}

export default function DealerDashboard({ adminPicker, viewerAccount }: Props) {
  const { employee } = useDevEmployee();

  const isAdminView =
    String(viewerAccount?.role ?? "").toLowerCase() === "admin" ||
    !!adminPicker;

  const dealerId = useMemo(() => {
    if (isAdminView) return "";

    const role = String(employee?.role ?? "").toLowerCase();
    if (!employee?.id || role !== "dealer") return "";

    return employee.id;
  }, [employee?.id, employee?.role, isAdminView]);

  const [filter, setFilter] = useState<Filter>("open");
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const queryKey = useMemo(
    () =>
      [
        ...dealerDashboardQueryKeyPrefix,
        isAdminView ? "admin" : dealerId,
      ] as const,
    [dealerId, isAdminView],
  );

  const enabled = isAdminView || !!dealerId;

  const q = useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      if (isAdminView) {
        return fetchDealerDashboardAdminV2();
      }
      return fetchDealerDashboardV2({ dealerEmployeeId: dealerId });
    },
    staleTime: 30_000,
  });

  useTaskTableInvalidation({
    enabled,
    debounceMs: 700,
    invalidateQueryKeys: [queryKey],
  });

  const onPullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await q.refetch();
    } finally {
      setPullRefreshing(false);
    }
  }, [q]);

  const data = useMemo(() => {
    return (q.data ?? EMPTY_ITEMS).filter((item) => matches(item, filter));
  }, [q.data, filter]);

  const nav = useCallback((item: DealerDashboardItem) => {
    if (String(item.sale_status) === "draft") {
      router.push({
        pathname: "/sale/contract/[saleId]/step1",
        params: { saleId: item.sale_id },
      });
      return;
    }

    router.push({
      pathname: "/sale/prep/[saleId]",
      params: { saleId: item.sale_id },
    });
  }, []);

  if (!enabled) {
    return (
      <Screen contentContainerStyle={styles.center}>
        <Text style={styles.centerTitle}>Kein Händler aktiv</Text>
        <Text style={styles.centerSub}>
          Für dieses Dashboard muss ein Mitarbeiter mit Rolle dealer zugeordnet
          sein.
        </Text>
      </Screen>
    );
  }

  if (q.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Lade Händler Dashboard…</Text>
      </View>
    );
  }

  if (q.isError) {
    return (
      <Screen contentContainerStyle={styles.center}>
        <Text style={styles.centerTitle}>Fehler</Text>
        <Text style={styles.centerSub}>
          {(q.error as any)?.message ?? "Unbekannter Fehler"}
        </Text>

        <Pressable
          onPress={() => {
            void q.refetch();
          }}
          style={({ pressed }) => [
            styles.retryBtn,
            pressed ? { opacity: 0.9 } : null,
          ]}
        >
          <Text style={styles.retryText}>Neu laden</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.sale_id}
      removeClippedSubviews={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={pullRefreshing}
          onRefresh={() => {
            void onPullRefresh();
          }}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Händler Dashboard</Text>

            {adminPicker ? (
              <Pressable onPress={adminPicker.onPress} style={styles.chevBtn}>
                <Feather name="chevron-down" size={18} color="#000" />
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.sub}>
            {isAdminView
              ? "Alle Händler"
              : `Angemeldet als ${employee?.display_name ?? "—"}`}
          </Text>

          {q.isFetching ? (
            <Text style={styles.syncText}>Aktualisiere…</Text>
          ) : null}

          <FilterChips value={filter} onChange={setFilter} options={FILTERS} />
        </View>
      }
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListEmptyComponent={
        q.isLoading ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.empty}>Keine Einträge vorhanden.</Text>
        )
      }
      renderItem={({ item }) => {
        const badge = badgeFrom(item);

        return (
          <DashboardCard
            title={titleFrom(item)}
            subtitle={subtitleFrom(item)}
            badgeLabel={badge.label}
            badgeTone={badge.tone}
            onPress={() => nav(item)}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fff",
  },
  loadingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
  },
  header: {
    gap: 12,
    marginBottom: 22,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  chevBtn: {
    width: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    flex: 1,
  },
  sub: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(0,0,0,0.55)",
  },
  syncText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.45)",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 160,
  },
  empty: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
  },
  center: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
  },
  centerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000",
  },
  centerSub: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
    lineHeight: 18,
  },
  retryBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  retryText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#000",
  },
});
