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

import { useRealtimeRefetchOnTables } from "@/src/services/realtime/useRealtimeRefetchOnTables";

import { useDevEmployee } from "@/src/features/session/devSession";
import {
  fetchDealerDashboardAdminV2,
  fetchDealerDashboardV2,
  type DealerDashboardItem,
} from "@/src/features/sales/dealerDashboard.service";

type AdminPicker = { onPress: () => void };

// keep stable (avoids FilterChips being re-created)
type Filter = "all" | "open" | "ready" | "sold";

const FILTERS: ChipOption<Filter>[] = [
  { key: "all", label: "alle" },
  { key: "open", label: "offen" },
  { key: "ready", label: "bereit" },
  { key: "sold", label: "verkauft" },
];

function titleFrom(item: DealerDashboardItem) {
  const carx = (item as any).carx_data ?? null;
  const brand = String(carx?.brand_txt ?? carx?.brand_name ?? "").trim();
  const model = String(carx?.model_name ?? carx?.model_txt ?? "").trim();
  const out = [brand, model].filter(Boolean).join(" ").trim();
  return out || String((item as any).vin ?? "Fahrzeug");
}

function subtitleFrom(item: DealerDashboardItem) {
  const stage = String((item as any).stage ?? "");
  if (stage === "ready") return "Fertig für Verkauf";
  if (stage === "sold") return "Verkauft";
  const ss = String((item as any).sale_status ?? "");
  if (ss === "draft") return "Vertrag erstellen";
  if (ss === "contract_generated") return "Vertrag erstellt";
  return "Verkauf";
}

function badgeFrom(item: DealerDashboardItem): {
  label: string;
  tone: "pending" | "done";
} {
  const stage = String((item as any).stage ?? "");
  if (stage === "sold") return { label: "Verkauft", tone: "done" };
  if (stage === "ready") return { label: "Bereit", tone: "pending" };

  const saleStatus = String((item as any).sale_status ?? "");
  if (saleStatus === "draft") return { label: "Vertrag", tone: "pending" };

  // prep states (mechanic/detailer/handover)
  const ms = String((item as any)?.mechanic_task?.status ?? "");
  const ds = String((item as any)?.detail_task?.status ?? "");
  const hs = String((item as any)?.handover_task?.status ?? "");

  if (hs) {
    if (hs === "open") return { label: "Übergabe: offen", tone: "pending" };
    if (hs === "in_progress")
      return { label: "Übergabe: in Arbeit", tone: "pending" };
    if (hs === "done") return { label: "Übergabe: fertig", tone: "done" };
  }

  if (ds) {
    if (ds === "open") return { label: "Aufbereiter: offen", tone: "pending" };
    if (ds === "in_progress")
      return { label: "Aufbereiter: in Arbeit", tone: "pending" };
    if (ds === "done") return { label: "Aufbereiter: fertig", tone: "done" };
  }

  if (ms) {
    if (ms === "open") return { label: "Mechaniker: offen", tone: "pending" };
    if (ms === "in_progress")
      return { label: "Mechaniker: in Arbeit", tone: "pending" };
    if (ms === "done") return { label: "Mechaniker: fertig", tone: "done" };
  }

  return { label: "Vertrag", tone: "pending" };
}

function matches(item: DealerDashboardItem, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "ready") return (item as any).stage === "ready";
  if (filter === "sold") return (item as any).stage === "sold";
  return (item as any).stage !== "ready" && (item as any).stage !== "sold";
}

function nav(item: DealerDashboardItem) {
  if (String((item as any).sale_status) === "draft") {
    router.push({
      pathname: "/sale/contract/[saleId]/step3",
      params: { saleId: String((item as any).sale_id) },
    });
    return;
  }

  router.push({
    pathname: "/sale/prep/[saleId]",
    params: { saleId: String((item as any).sale_id) },
  });
}

export default function DealerDashboard({
  adminPicker,
}: {
  adminPicker?: AdminPicker;
}) {
  const { employeeId } = useDevEmployee();
  const enabled = Boolean(employeeId);

  const [filter, setFilter] = useState<Filter>("open");

  const queryKey = useMemo(
    () => ["dealer-dashboard", employeeId],
    [employeeId],
  );

  const q = useQuery({
    enabled,
    queryKey,
    queryFn: async () => {
      if (!employeeId) return [];
      if (String(employeeId).toLowerCase() === "admin") {
        return fetchDealerDashboardAdminV2();
      }
      return fetchDealerDashboardV2({ dealerEmployeeId: employeeId });
    },
    // dashboard: prefer correctness; but do not refetch aggressively; realtime invalidation drives freshness
    staleTime: 30_000,
  });

  // Realtime-driven refetch while this screen is focused
  useRealtimeRefetchOnTables({
    enabled,
    tables: [
      "vehicle_sales",
      "vehicle_sale_prep",
      "vehicle_handover_task",
      "vehicles",
      "tasks",
    ],
    debounceMs: 500,
    onChange: () => q.refetch(),
  });

  // Pull-to-refresh should ONLY show spinner when user triggers it
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const onPullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await q.refetch();
    } finally {
      setPullRefreshing(false);
    }
  }, [q]);

  const items = q.data ?? [];
  const data = useMemo(
    () => items.filter((x) => matches(x, filter)),
    [items, filter],
  );

  return (
    <Screen>
      <FlatList
        data={data}
        keyExtractor={(i: any) => String((i as any).sale_id)}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={onPullRefresh}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Händler Dashboard</Text>

              {adminPicker ? (
                <Pressable
                  onPress={adminPicker.onPress}
                  hitSlop={10}
                  style={styles.chevBtn}
                >
                  <Feather name="chevron-down" size={18} color="#000" />
                </Pressable>
              ) : null}
            </View>

            <FilterChips
              options={FILTERS}
              value={filter}
              onChange={setFilter}
            />

            {q.isFetching ? (
              <Text style={styles.syncText}>Aktualisiere…</Text>
            ) : null}
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 17 }} />}
        ListEmptyComponent={
          q.isLoading ? (
            <View style={{ paddingTop: 14 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={{ paddingTop: 14 }}>
              <Text style={styles.emptyText}>Keine Einträge vorhanden.</Text>
            </View>
          )
        }
        renderItem={({ item }: { item: DealerDashboardItem }) => {
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 10, marginBottom: 18 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  chevBtn: { width: 40, alignItems: "flex-end", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: "#000", flex: 1 },
  syncText: { fontSize: 12, fontWeight: "700", color: "rgba(0,0,0,0.45)" },
  listContent: { paddingHorizontal: 20, paddingBottom: 160 },
  emptyText: { fontSize: 13, fontWeight: "700", color: "rgba(0,0,0,0.55)" },
});
