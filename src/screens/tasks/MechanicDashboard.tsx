// src/screens/tasks/MechanicDashboard.tsx
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

import { useEmployeeSelection } from "@/src/features/employees/useEmployeeSelection";

import {
  useMechanicPrepTasksQuery,
  type MechanicFilter,
  type MechanicTaskListItem,
} from "@/src/features/tasks/v3/tasks.queries";

type Props = {
  adminPicker?: { onPress: () => void };
};

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

export default function MechanicDashboard({ adminPicker }: Props) {
  const { employee } = useEmployeeSelection();
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
            <View style={styles.titleRow}>
              <Text style={styles.title}>Werkstatt Dashboard</Text>

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

            <Text style={styles.sub}>
              Angemeldet als {employee?.display_name ?? "—"}
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
  header: { gap: 12, marginBottom: 22 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  chevBtn: { width: 40, alignItems: "flex-end", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#000", flex: 1 },
  sub: { fontSize: 13, fontWeight: "600", color: "rgba(0,0,0,0.55)" },
  syncText: { fontSize: 12, fontWeight: "700", color: "rgba(0,0,0,0.45)" },
  listContent: { paddingHorizontal: 20, paddingBottom: 160 },
  emptyText: { fontSize: 13, fontWeight: "700", color: "rgba(0,0,0,0.55)" },
});
