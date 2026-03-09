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

const EMPTY: DetailerQueueItem[] = [];

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
  const q = useDetailerQueueQuery();
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const onPullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await q.refetch();
    } finally {
      setPullRefreshing(false);
    }
  }, [q]);

  const items = q.data ?? EMPTY;

  const data = useMemo(() => {
    return items.filter((x) =>
      matchesFilter(String((x as any).status), filter),
    );
  }, [items, filter]);

  if (q.isError) {
    return (
      <Screen contentContainerStyle={styles.center}>
        <Text style={styles.centerTitle}>Fehler</Text>
        <Text style={styles.centerSub}>
          {(q.error as any)?.message ?? "Unbekannter Fehler"}
        </Text>
      </Screen>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => String(item.id)}
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
            <Text style={styles.title}>Aufbereiter Dashboard</Text>

            {adminPicker ? (
              <Pressable onPress={adminPicker.onPress} style={styles.chevBtn}>
                <Feather name="chevron-down" size={18} color="#000" />
              </Pressable>
            ) : null}
          </View>

          {q.isFetching ? (
            <Text style={styles.syncText}>Aktualisiere…</Text>
          ) : null}

          <FilterChips
            value={filter}
            onChange={(next) => setFilter(next as Filter)}
            options={FILTERS}
          />
        </View>
      }
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListEmptyComponent={
        q.isLoading ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.emptyText}>Keine Einträge vorhanden.</Text>
        )
      }
      renderItem={({ item }: { item: DetailerQueueItem }) => {
        const vehicle = (item as any).vehicle ?? null;
        const title =
          String(vehicle?.draft_model ?? "").trim() ||
          String(vehicle?.vin ?? "").trim() ||
          "Fahrzeug";
        const vin = String(vehicle?.vin ?? "-");
        const subtitle = `${subtitleFromType(String((item as any).type))} • VIN ${vin}`;
        const label = statusLabel(String((item as any).status));
        const tone = badgeTone(String((item as any).status));

        return (
          <DashboardCard
            title={title}
            subtitle={subtitle}
            badgeLabel={label}
            badgeTone={tone}
            onPress={() =>
              router.push(`/task/detailer/${String((item as any).id)}`)
            }
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
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
  syncText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.45)",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 160,
  },
  emptyText: {
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
});
