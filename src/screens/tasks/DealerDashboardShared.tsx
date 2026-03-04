// src/screens/tasks/DealerDashboardShared.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import Screen from "@/src/components/ui/Screen";
import FilterChips, { type ChipOption } from "@/src/components/ui/FilterChips";
import DashboardCard from "@/src/components/ui/DashboardCard";

import { useAllowedEmployees } from "@/src/features/session/appAccount.service";
import {
  fetchDealerDashboardV2,
  type DealerDashboardItem,
} from "@/src/features/sales/dealerDashboard.service";

type Filter = "all" | "open" | "ready" | "sold";

const FILTERS: ChipOption<Filter>[] = [
  { key: "all", label: "alle" },
  { key: "open", label: "offen" },
  { key: "ready", label: "bereit" },
  { key: "sold", label: "verkauft" },
];

function titleFrom(item: DealerDashboardItem): string {
  const carx = (item as any).carx_data ?? {};
  const brand = String(carx?.brand_txt ?? carx?.brand_name ?? "").trim();
  const model = String(carx?.model_name ?? carx?.model_txt ?? "").trim();
  const compact = [brand, model].filter(Boolean).join(" ").trim();
  if (compact) return compact;
  return (item as any).draft_model?.trim()
    ? (item as any).draft_model
    : ((item as any).vin ?? "Fahrzeug");
}

function badgeFrom(item: DealerDashboardItem): {
  label: string;
  tone: "pending" | "done";
} {
  if ((item as any).stage === "sold")
    return { label: "Verkauft", tone: "done" };
  if ((item as any).stage === "ready")
    return { label: "Übergabe bereit", tone: "done" };
  if (String((item as any).sale_status) === "draft")
    return { label: "Entwurf", tone: "pending" };
  return { label: "Vertrag", tone: "pending" };
}

function subtitleFrom(item: DealerDashboardItem): string {
  if ((item as any).stage === "draft") return "Entwurf: Kaufvertrag erstellen";
  if ((item as any).stage === "ready") return "Übergabe: bestätigen";
  const sp = String((item as any).sale_prep_task?.status ?? "");
  if (sp && sp !== "done") return "Top Verkäufer: ausfüllen";
  const ms = String((item as any).mechanic_task?.status ?? "");
  if (!ms) return "Mechaniker: ausstehend";
  if (ms === "open" || ms === "blocked" || ms === "overdue")
    return "Mechaniker: offen";
  if (ms === "in_progress") return "Mechaniker: in Arbeit";
  if (ms === "done") {
    const ds = String((item as any).detail_task?.status ?? "");
    if (!ds) return "Aufbereiter: ausstehend";
    if (ds === "open" || ds === "blocked" || ds === "overdue")
      return "Aufbereiter: offen";
    if (ds === "in_progress") return "Aufbereiter: in Arbeit";
    if (ds === "done") return "Aufbereiter: fertig";
  }
  return "Vertrag";
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

function uniqBySaleId(items: DealerDashboardItem[]) {
  const map = new Map<string, DealerDashboardItem>();
  for (const it of items) {
    const id = String((it as any).sale_id ?? "");
    if (!id) continue;
    if (!map.has(id)) map.set(id, it);
  }
  return Array.from(map.values());
}

export default function DealerDashboardShared({
  accountId,
}: {
  accountId: string;
}) {
  const { employees: allowed, loading: allowedLoading } =
    useAllowedEmployees(accountId);
  const dealerEmployees = useMemo(() => {
    return allowed.filter((e) => String(e.role).toLowerCase() === "dealer");
  }, [allowed]);

  const [filter, setFilter] = useState<Filter>("open");
  const [items, setItems] = useState<DealerDashboardItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (allowedLoading) return;
    if (dealerEmployees.length === 0) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const all = await Promise.all(
        dealerEmployees.map((d) =>
          fetchDealerDashboardV2({ dealerEmployeeId: d.id }).catch(
            () => [] as DealerDashboardItem[],
          ),
        ),
      );
      setItems(uniqBySaleId(all.flat()));
    } finally {
      setLoading(false);
    }
  }, [allowedLoading, dealerEmployees]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const data = useMemo(
    () => items.filter((x) => matches(x, filter)),
    [items, filter],
  );

  return (
    <Screen variant="list">
      <FlatList
        data={data}
        keyExtractor={(i) => String((i as any).sale_id)}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Händler Dashboard</Text>
            <Text style={styles.sub}>
              Shared Konto ({dealerEmployees.length} Händler) – Mitarbeiter wird
              in den Screens/Tasks gewählt
            </Text>
            <FilterChips
              options={FILTERS}
              value={filter}
              onChange={setFilter}
            />
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 17 }} />}
        ListEmptyComponent={
          !loading ? (
            <View style={{ paddingTop: 14 }}>
              <Text style={{ color: "rgba(0,0,0,0.55)", fontWeight: "600" }}>
                Keine Einträge vorhanden.
              </Text>
            </View>
          ) : (
            <View style={{ paddingTop: 14 }}>
              <ActivityIndicator />
            </View>
          )
        }
        renderItem={({ item }) => {
          const badge = badgeFrom(item);
          return (
            <DashboardCard
              title={titleFrom(item)}
              badgeLabel={badge.label}
              badgeTone={badge.tone}
              subtitle={subtitleFrom(item)}
              meta={`VIN: ${(item as any).vin ?? "-"}`}
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
