// src/screens/tasks/DetailerDashboard.tsx
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

import Screen from "@/src/components/ui/Screen";
import FilterChips, { type ChipOption } from "@/src/components/ui/FilterChips";
import DashboardCard from "@/src/components/ui/DashboardCard";

import { useRealtimeRefetchOnTables } from "@/src/services/realtime/useRealtimeRefetchOnTables";

import {
  useDetailerQueueQuery,
  type DetailerQueueItem,
} from "@/src/features/tasks/v3/tasks.queries";

type Props = {
  adminPicker?: { onPress: () => void };
};

type Filter = "all" | "open" | "in_progress" | "done";

const FILTERS: ChipOption<Filter>[] = [
  { key: "all", label: "alle" },
  { key: "open", label: "offen" },
  { key: "in_progress", label: "in Arbeit" },
  { key: "done", label: "erledigt" },
];

function statusLabel(status: string): string {
  switch (status) {
    case "open":
    case "overdue":
      return "offen";
    case "in_progress":
    case "blocked":
      return "in Arbeit";
    case "done":
      return "erledigt";
    default:
      return status;
  }
}

function badgeTone(status: string): "pending" | "done" {
  return status === "done" ? "done" : "pending";
}

function subtitleFromType(type: string) {
  if (type === "detail_intake") return "Status: Neu eingetroffen";
  if (type === "detail_final") return "Status: Übergabe";
  return "Status: Aufbereitung";
}

function matchesFilter(status: string, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "open") return status === "open" || status === "overdue";
  if (filter === "in_progress")
    return status === "in_progress" || status === "blocked";
  return status === "done";
}

const EMPTY: DetailerQueueItem[] = [];

export default function DetailerDashboard({ adminPicker }: Props) {
  const [filter, setFilter] = useState<Filter>("open");

  const q = useDetailerQueueQuery();

  useRealtimeRefetchOnTables({
    tables: ["tasks", "vehicles"],
    debounceMs: 350,
    onChange: () => q.refetch(),
  });

  const [pullRefreshing, setPullRefreshing] = useState(false);
  const onPullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await q.refetch();
    } finally {
      setPullRefreshing(false);
    }
  }, [q]);

  const data = useMemo(() => {
    const items = (q.data ?? EMPTY) as DetailerQueueItem[];
    return items.filter((x) =>
      matchesFilter(String((x as any).status), filter),
    );
  }, [q.data, filter]);

  return (
    <Screen>
      <FlatList
        data={data}
        keyExtractor={(item: any) => String(item.id)}
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
              <Text style={styles.title}>Aufbereiter Dashboard</Text>

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
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
        renderItem={({ item }: { item: any }) => {
          const vehicle = item.vehicle ?? null;
          const title =
            String(vehicle?.draft_model ?? "").trim() ||
            String(vehicle?.vin ?? "").trim() ||
            "Fahrzeug";

          const vin = String(vehicle?.vin ?? "-");
          const subtitle = subtitleFromType(String(item.type));
          const label = statusLabel(String(item.status));
          const tone = badgeTone(String(item.status));

          return (
            <DashboardCard
              title={title}
              subtitle={subtitle}
              meta={`VIN: ${vin}`}
              badgeLabel={label}
              badgeTone={tone}
              onPress={() => router.push(`/task/detailer/${String(item.id)}`)}
            />
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 12, marginBottom: 22 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  chevBtn: { width: 40, alignItems: "flex-end", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#000", flex: 1 },
  syncText: { fontSize: 12, fontWeight: "700", color: "rgba(0,0,0,0.45)" },
  listContent: { paddingHorizontal: 20, paddingBottom: 160 },
  emptyText: { fontSize: 13, fontWeight: "700", color: "rgba(0,0,0,0.55)" },
});
