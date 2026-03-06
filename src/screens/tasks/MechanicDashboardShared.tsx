// src/screens/tasks/MechanicDashboardShared.tsx
import React, { useCallback, useMemo, useState } from "react";
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

import {
  useMechanicPrepTasksQuery,
  type MechanicFilter,
  type MechanicTaskListItem,
} from "@/src/features/tasks/v3/tasks.queries";

const FILTERS: ChipOption<MechanicFilter>[] = [
  { key: "all", label: "alle" },
  { key: "open", label: "offen" },
  { key: "in_progress", label: "in Arbeit" },
  { key: "done", label: "erledigt" },
];

function titleFromCarx(carx: any, fallback?: string | null) {
  const brand = String(carx?.brand_txt ?? carx?.brand_name ?? "").trim();
  const model = String(carx?.model_name ?? carx?.model_txt ?? "").trim();
  const out = [brand, model].filter(Boolean).join(" ").trim();
  return out || (fallback?.trim() ? fallback : "Fahrzeug");
}

function badgeLabel(status: string) {
  if (status === "in_progress") return "In Arbeit";
  if (status === "done") return "Erledigt";
  return "Offen";
}

function badgeTone(status: string): "pending" | "done" {
  return status === "done" ? "done" : "pending";
}

const EMPTY: MechanicTaskListItem[] = [];

export default function MechanicDashboardShared() {
  const [filter, setFilter] = useState<MechanicFilter>("open");

  const q = useMechanicPrepTasksQuery(filter);

  // Pull-to-refresh should only show spinner when user triggers it
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const onPullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await q.refetch();
    } finally {
      setPullRefreshing(false);
    }
  }, [q]);

  const items = (q.data ?? EMPTY) as MechanicTaskListItem[];
  const data = useMemo(() => items, [items]);

  return (
    <Screen>
      <FlatList
        data={data}
        keyExtractor={(i) => String(i.id)}
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
            <Text style={styles.title}>Mechaniker Dashboard</Text>
            <Text style={styles.sub}>
              Shared Konto (Mitarbeiter wird pro Aufgabe gewählt)
            </Text>

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
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          q.isLoading ? (
            <View style={{ paddingTop: 14 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={{ paddingTop: 14 }}>
              <Text style={styles.emptyText}>Keine Aufgaben vorhanden.</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const carx = item.vehicle?.carx_data ?? null;
          const vehicleTitle = titleFromCarx(
            carx,
            item.vehicle?.draft_model ?? null,
          );
          const vin = item.vehicle?.vin ?? "—";

          return (
            <DashboardCard
              title={vehicleTitle}
              subtitle={item.title ?? "Mechaniker Vorbereitung"}
              meta={`VIN: ${vin}`}
              badgeLabel={badgeLabel(String(item.status))}
              badgeTone={badgeTone(String(item.status))}
              onPress={() =>
                router.push({
                  pathname: "/task/mechanic/[id]",
                  params: { id: String(item.id) },
                })
              }
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
  syncText: { fontSize: 12, fontWeight: "700", color: "rgba(0,0,0,0.45)" },
  listContent: { paddingHorizontal: 20, paddingBottom: 160 },
  emptyText: { fontSize: 13, fontWeight: "700", color: "rgba(0,0,0,0.55)" },
});
