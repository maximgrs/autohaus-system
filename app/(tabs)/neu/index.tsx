import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import Screen from "@/src/components/ui/Screen";
import FilterChips, { ChipOption } from "@/src/components/ui/FilterChips";
import DashboardCard from "@/src/components/ui/DashboardCard";
import { supabase } from "@/src/lib/supabase";
import {
  fetchListingQueue,
  type ListingQueueItem,
} from "@/src/features/tasks/listingQueue.service";

type Filter = "all" | "pending" | "done";

const FILTERS: ChipOption<Filter>[] = [
  { key: "all", label: "alle" },
  { key: "pending", label: "ausstehend" },
  { key: "done", label: "erledigt" },
];

function subtitleForType(type: string) {
  return type === "listing_photos" ? "Fotos hochladen" : "Inserat erstellen";
}

export default function ListingDashboard() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<ListingQueueItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchListingQueue();
      setItems(res);
    } catch (e: any) {
      console.log("fetchListingQueue error", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ch1 = supabase
      .channel("listing-tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => load(),
      )
      .subscribe();

    const ch2 = supabase
      .channel("listing-vehicles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const data = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "pending")
      return items.filter((x) => String(x.status) !== "done");
    return items.filter((x) => String(x.status) === "done");
  }, [filter, items]);

  return (
    <Screen variant="list">
      <FlatList
        data={data}
        keyExtractor={(item) => item.task_id}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Offene Inserate</Text>
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
          const v = item.vehicle;

          const title = v?.draft_model?.trim()
            ? v.draft_model
            : (v?.vin ?? "Fahrzeug");

          const done = String(item.status) === "done";

          return (
            <DashboardCard
              title={title}
              badgeLabel={done ? "erledigt" : "ausstehend"}
              badgeTone={done ? "done" : "pending"}
              subtitle={subtitleForType(String(item.type))}
              meta={`VIN: ${v?.vin ?? "-"}`}
              onPress={() =>
                router.push({
                  pathname: "/task/listing/[listingId]",
                  params: { listingId: item.task_id },
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
  title: { fontSize: 22, fontWeight: "700", color: "#000" },
  listContent: { paddingHorizontal: 20, paddingBottom: 160 },
});
