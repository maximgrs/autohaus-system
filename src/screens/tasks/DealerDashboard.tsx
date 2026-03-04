import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";

import Screen from "@/src/components/ui/Screen";
import FilterChips, { type ChipOption } from "@/src/components/ui/FilterChips";
import DashboardCard from "@/src/components/ui/DashboardCard";

import { useDevEmployee } from "@/src/features/session/devSession";
import {
  fetchDealerDashboardV2,
  fetchDealerDashboardAdminV2,
  type DealerDashboardItem,
} from "@/src/features/sales/dealerDashboard.service";

type EmployeeRole = "admin" | "dealer" | "mechanic" | "detailer" | "listing";

type ViewerAccount = {
  user_id: string;
  role: EmployeeRole;
  account_type: "shared" | "individual";
  active: boolean;
};

type Props = {
  adminPicker?: { onPress: () => void };
  viewerAccount: ViewerAccount;
};

type Filter = "all" | "open" | "ready" | "sold";

const FILTERS: ChipOption<Filter>[] = [
  { key: "all", label: "alle" },
  { key: "open", label: "offen" },
  { key: "ready", label: "bereit" },
  { key: "sold", label: "verkauft" },
];

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
  if (String(item.sale_status) === "draft")
    return { label: "Entwurf", tone: "pending" };
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
  const isAdminView = viewerAccount.role === "admin";

  const dealerId = useMemo(() => {
    if (isAdminView) return "";
    const r = String(employee?.role ?? "").toLowerCase();
    if (!employee?.id || r !== "dealer") return "";
    return employee.id;
  }, [employee?.id, employee?.role, isAdminView]);

  const [filter, setFilter] = useState<Filter>("open");
  const [items, setItems] = useState<DealerDashboardItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = isAdminView
        ? await fetchDealerDashboardAdminV2()
        : await fetchDealerDashboardV2({ dealerEmployeeId: dealerId });

      setItems(res);
    } catch (e: any) {
      console.log("dealer dashboard load error", e?.message ?? e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [dealerId, isAdminView]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const data = useMemo(
    () => items.filter((x) => matches(x, filter)),
    [items, filter],
  );

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

  // Nur für Nicht-Admin weiterhin prüfen
  if (!isAdminView && !dealerId) {
    return (
      <Screen variant="scroll" bottomSpace={120}>
        <View style={styles.center}>
          <Text style={styles.centerTitle}>Kein Händler aktiv</Text>
          <Text style={styles.centerSub}>
            Für dieses Dashboard muss ein Mitarbeiter mit Rolle{" "}
            <Text style={{ fontWeight: "900" }}>dealer</Text> zugeordnet sein.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen variant="list">
      <FlatList
        data={data}
        keyExtractor={(i) => i.sale_id}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
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
                  <Feather name="chevron-down" size={26} color="#000" />
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.sub}>
              {isAdminView
                ? "Alle Händler"
                : `Angemeldet als ${employee?.display_name ?? "—"}`}
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
              meta={`VIN: ${item.vin ?? "-"}`}
              onPress={() => nav(item)}
            />
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 15, marginBottom: 30 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  chevBtn: { width: 40, alignItems: "flex-end", justifyContent: "center" },

  title: { fontSize: 22, fontWeight: "700", color: "#000", flex: 1 },
  sub: { fontSize: 13, fontWeight: "600", color: "rgba(0,0,0,0.55)" },

  listContent: { paddingHorizontal: 20, paddingBottom: 160 },

  center: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
  centerTitle: { fontSize: 18, fontWeight: "900", color: "#000" },
  centerSub: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
    lineHeight: 18,
  },
});
