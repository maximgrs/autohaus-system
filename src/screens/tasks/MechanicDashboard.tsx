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
  fetchMechanicPrepTasks,
  type MechanicFilter,
  type MechanicTaskListItem,
} from "@/src/features/tasks/mechanicDashboard.service";

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

export default function MechanicDashboard({ adminPicker }: Props) {
  const { employee } = useDevEmployee();

  const [filter, setFilter] = useState<MechanicFilter>("open");
  const [items, setItems] = useState<MechanicTaskListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMechanicPrepTasks({ filter });
      setItems(res);
    } catch (e: any) {
      console.log("fetchMechanicPrepTasks error", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const data = useMemo(() => items, [items]);

  return (
    <Screen variant="list">
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
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
                  <Feather name="chevron-down" size={26} color="#000" />
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
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 17 }} />}
        ListEmptyComponent={
          !loading ? (
            <View style={{ paddingTop: 14 }}>
              <Text style={{ color: "rgba(0,0,0,0.55)", fontWeight: "600" }}>
                Keine Aufgaben vorhanden.
              </Text>
            </View>
          ) : (
            <View style={{ paddingTop: 14 }}>
              <ActivityIndicator />
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
              badgeLabel={badgeLabel(String(item.status))}
              badgeTone={badgeTone(String(item.status))}
              subtitle={item.title ?? "Mechaniker Vorbereitung"}
              meta={`VIN: ${vin}`}
              onPress={() =>
                router.push({
                  pathname: "/task/mechanic/[id]",
                  params: { id: item.id },
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
});
