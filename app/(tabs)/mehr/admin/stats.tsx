import React from "react";
import { Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AdminOnlyScreen } from "@/src/features/admin";

export default function AdminStatsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Statistik" }} />

      <AdminOnlyScreen
        title="Verkaufsstatistik"
        subtitle="Platzhalter für aggregierte Kennzahlen."
      >
        <View style={styles.card}>
          <Text style={styles.head}>Statistik</Text>
          <Text style={styles.text}>
            Nächster Schritt: KPIs aus `sales` und `vehicles` aggregieren,
            Zeitraumfilter ergänzen und Admin-Auswertungen visualisieren.
          </Text>
        </View>
      </AdminOnlyScreen>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.04)",
    gap: 8,
  },
  head: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000",
  },
  text: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
    lineHeight: 18,
  },
});
