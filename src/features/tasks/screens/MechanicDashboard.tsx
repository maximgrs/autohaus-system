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
  type MechanicTaskListItem,
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

const EMPTY: MechanicTaskListItem[] = [];

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

export default function MechanicDashboard({ adminPicker }: Props) {
  const { employee } = useEmployeeSelection();
  const [filter, setFilter] = useState<Filter>("open");
  const q = useMechanicPrepTasksQuery(filter);
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

  const data = useMemo(() => items, [items]);

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
            <Text style={styles.title}>Werkstatt Dashboard</Text>

            {adminPicker ? (
              <Pressable onPress={adminPicker.onPress} style={styles.chevBtn}>
                <Feather name="chevron-down" size={18} color="#000" />
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.sub}>
            Angemeldet als {employee?.display_name ?? "—"}
          </Text>

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
          <Text style={styles.emptyText}>Keine Aufgaben vorhanden.</Text>
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
            subtitle={`Vorbereitung • VIN ${vin}`}
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
