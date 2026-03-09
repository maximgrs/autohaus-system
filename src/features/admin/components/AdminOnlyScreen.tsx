import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import Screen from "@/src/components/ui/Screen";
import { useRoleAccess } from "@/src/features/session";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function AdminOnlyScreen({ title, subtitle, children }: Props) {
  const { loading, canOpenAdmin } = useRoleAccess();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Lade Admin-Bereich…</Text>
      </View>
    );
  }

  if (!canOpenAdmin) {
    return (
      <Screen contentContainerStyle={styles.wrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        <View style={styles.deniedCard}>
          <Text style={styles.deniedTitle}>Kein Zugriff</Text>
          <Text style={styles.deniedText}>
            Dieser Bereich ist nur für Admin-Konten verfügbar.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fff",
  },
  wrap: {
    paddingTop: 16,
    gap: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#000",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
    lineHeight: 18,
  },
  muted: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
  },
  deniedCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(180,35,24,0.06)",
    borderWidth: 1,
    borderColor: "rgba(180,35,24,0.16)",
    gap: 8,
  },
  deniedTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#B42318",
  },
  deniedText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(0,0,0,0.65)",
    lineHeight: 18,
  },
});
