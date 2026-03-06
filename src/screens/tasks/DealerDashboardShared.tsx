// src/screens/tasks/DealerDashboardShared.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import Screen from "@/src/components/ui/Screen";
import FilterChips, { type ChipOption } from "@/src/components/ui/FilterChips";
import DashboardCard from "@/src/components/ui/DashboardCard";

import { useAllowedEmployees } from "@/src/features/employees/useAllowedEmployees";
import { useDealerDashboardSharedQuery } from "@/src/features/sales/hooks/useDealerDashboardSharedQuery";
import { type DealerDashboardItem } from "@/src/features/sales/dealerDashboard.service";

type Filter = "all" | "open" | "ready" | "sold";

const FILTERS: ChipOption<Filter>[] = [
  { key: "all", label: "alle" },
  { key: "open", label: "offen" },
  { key: "ready", label: "bereit" },
  { key: "sold", label: "verkauft" },
];

// Stable empty array -> fixes `items ?? []` dependency warning
const EMPTY_ITEMS: DealerDashboardItem[] = [];

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

export default function DealerDashboardShared({
  accountId,
}: {
  accountId: string;
}) {
  const { employees: allowed, loading: allowedLoading } =
    useAllowedEmployees(accountId);

  const dealerEmployeeIds = useMemo(() => {
    return allowed
      .filter((e) => String((e as any).role).toLowerCase() === "dealer")
      .map((e) => String((e as any).id))
      .filter(Boolean);
  }, [allowed]);

  const [filter, setFilter] = useState<Filter>("open");

  const q = useDealerDashboardSharedQuery({
    accountId,
    dealerEmployeeIds,
    enabled: !allowedLoading,
  });

  // Pull-to-refresh state should not be tied to query.isFetching (prevents "stuck spinner")
  const mountedRef = useRef(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await q.refetch();
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, [q]);

  const items = (q.data ?? EMPTY_ITEMS) as DealerDashboardItem[];

  const data = useMemo(() => {
    return items.filter((x) => matches(x, filter));
  }, [items, filter]);

  return (
    <Screen variant="list">
      <FlatList
        data={data}
        keyExtractor={(i: any) => String((i as any).sale_id)}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Händler Dashboard</Text>
            <Text style={styles.sub}>
              Shared Konto ({dealerEmployeeIds.length} Händler) – Mitarbeiter
              wird in den Screens/Tasks gewählt
            </Text>
            <FilterChips
              options={FILTERS}
              value={filter}
              onChange={setFilter}
            />
            {q.isFetching ? (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "rgba(0,0,0,0.45)",
                }}
              >
                Aktualisiere…
              </Text>
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
              <Text style={{ color: "rgba(0,0,0,0.55)", fontWeight: "600" }}>
                Keine Einträge vorhanden.
              </Text>
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
  title: { fontSize: 22, fontWeight: "800", color: "#000" },
  sub: { fontSize: 12, fontWeight: "700", color: "rgba(0,0,0,0.55)" },
  listContent: { paddingHorizontal: 20, paddingBottom: 160 },
});
