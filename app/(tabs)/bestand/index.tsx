import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SearchBar from "@/src/components/ui/SearchBar";
import InventoryVehicleCard from "@/src/components/inventory/InventoryVehicleCard";
import { useInventoryCars } from "@/src/features/inventory/useInventoryCars";
import { filterRows } from "@/src/features/inventory/inventory.mapper";
import type { InventoryRow } from "@/src/features/inventory/inventory.types";
import { router } from "expo-router";

const UI = {
  H_PADDING: 20,
  GUTTER: 12,
  BOTTOM_PAD: 160,
} as const;

export default function BestandScreen() {
  const [query, setQuery] = useState("");

  const { rows, totalHits, loadingMore, refreshing, refresh, loadMore } =
    useInventoryCars({ status: 1, pageSize: 250, imageSize: "xxxxl" });

  const filtered = useMemo(() => filterRows(rows, query), [rows, query]);

  const openVehicle = useCallback((item: InventoryRow) => {
    router.push(`/vehicle/${item.id}`);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: InventoryRow; index: number }) => {
      const cardWrapStyle = {
        flex: 1,
      } as const;

      return (
        <InventoryVehicleCard
          style={cardWrapStyle}
          imageUrl={item.imageUrl}
          title={item.title}
          vin={item.vin}
          priceLabel={item.priceLabel}
          onPress={() => openVehicle(item)}
        />
      );
    },
    [openVehicle],
  );

  const footer = useMemo(() => {
    if (!loadingMore) return <View style={{ height: 12 }} />;
    return (
      <View style={styles.footer}>
        <ActivityIndicator />
        <Text style={styles.footerText}>Lade weitere Fahrzeuge…</Text>
      </View>
    );
  }, [loadingMore]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Bestand</Text>
          {totalHits != null ? (
            <Text style={styles.hits}>
              {rows.length}/{totalHits}
            </Text>
          ) : null}
        </View>

        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Suchen..."
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListFooterComponent={footer}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  header: {
    paddingHorizontal: UI.H_PADDING,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 12,
    backgroundColor: "#fff",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#000",
  },

  hits: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.45)",
  },

  listContent: {
    paddingHorizontal: UI.H_PADDING,
    paddingBottom: UI.BOTTOM_PAD,
    rowGap: 15,
  },

  footer: {
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: "center",
    gap: 8,
  },

  footerText: {
    color: "rgba(0,0,0,0.55)",
    fontWeight: "600",
    fontSize: 12,
  },
});
