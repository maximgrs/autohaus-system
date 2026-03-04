import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
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
import { supabase } from "@/src/lib/supabase";
import {
  fetchDetailerQueue,
  type DetailerQueueItem,
} from "@/src/features/tasks/detailerQueue.service";

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

export default function DetailerDashboard({ adminPicker }: Props) {
  const [filter, setFilter] = useState<Filter>("open");
  const [items, setItems] = useState<DetailerQueueItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDetailerQueue();
      setItems(res);
    } catch (e: any) {
      console.log("fetchDetailerQueue error", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("detailer-tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const data = useMemo(
    () => items.filter((x) => matchesFilter(String(x.status), filter)),
    [filter, items],
  );

  return (
    <Screen variant="list">
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
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
                  <Feather name="chevron-down" size={26} color="#000" />
                </Pressable>
              ) : null}
            </View>

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
          ) : null
        }
        renderItem={({ item }) => {
          const vehicle = item.vehicle;
          const title = vehicle?.draft_model?.trim()
            ? vehicle.draft_model
            : (vehicle?.vin ?? "Fahrzeug");
          const vin = vehicle?.vin ?? "-";
          const subtitle = subtitleFromType(String(item.type));
          const label = statusLabel(String(item.status));
          const tone = badgeTone(String(item.status));

          return (
            <DashboardCard
              title={title}
              badgeLabel={label}
              badgeTone={tone}
              subtitle={subtitle}
              meta={`VIN: ${vin}`}
              onPress={() => router.push(`/task/detailer/${item.id}`)}
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
  listContent: { paddingHorizontal: 20, paddingBottom: 160 },
});
