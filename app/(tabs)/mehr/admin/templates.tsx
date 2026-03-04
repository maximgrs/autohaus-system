import React from "react";
import { Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Screen from "@/src/components/ui/Screen";

export default function AdminTemplatesScreen() {
  return (
    <Screen variant="scroll" bottomSpace={140}>
      <Stack.Screen options={{ title: "Kaufvertrag Vorlagen" }} />
      <View style={styles.wrap}>
        <Text style={styles.title}>Kaufvertrag Vorlagen</Text>
        <Text style={styles.muted}>
          Nächster Schritt: Upload nach Supabase Storage + Liste + Aktiv/Archiv.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  title: { fontSize: 18, fontWeight: "900", color: "#000" },
  muted: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
    lineHeight: 18,
  },
});
