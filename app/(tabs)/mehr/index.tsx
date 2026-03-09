import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import Screen from "@/src/components/ui/Screen";
import { MoreSectionCard } from "@/src/features/more";
import { useRoleAccess } from "@/src/features/session";

export default function MehrIndexScreen() {
  const { canOpenAdmin, loading, account, effectiveRole } = useRoleAccess();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Mehr</Text>
          <Text style={styles.title}>Werkzeuge & Einstellungen</Text>
          <Text style={styles.subtitle}>
            Zusätzliche Bereiche für Konto, Verwaltung und Systemfunktionen.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allgemein</Text>

          <MoreSectionCard
            title="Konto"
            subtitle={
              loading
                ? "Lade Kontoinformationen…"
                : `Rolle: ${String(effectiveRole ?? account?.role ?? "—")}`
            }
            icon="user"
            onPress={() => router.push("/(tabs)/mehr/account")}
          />

          <MoreSectionCard
            title="Hilfe"
            subtitle="Infos, Nutzungshinweise und spätere Support-Funktionen."
            icon="help-circle"
            onPress={() => router.push("/(tabs)/mehr/help")}
          />
        </View>

        {canOpenAdmin ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin</Text>

            <MoreSectionCard
              title="Mitarbeiter"
              subtitle="Mitarbeiter anlegen, aktivieren und verwalten."
              icon="users"
              onPress={() => router.push("/(tabs)/mehr/admin/employees")}
            />

            <MoreSectionCard
              title="Einladungscodes"
              subtitle="Registrierungscodes für Mitarbeiter erstellen."
              icon="key"
              onPress={() => router.push("/(tabs)/mehr/admin/invites")}
            />

            <MoreSectionCard
              title="Shared Accounts"
              subtitle="Gemeinsame Logins und Zuordnungen verwalten."
              icon="link"
              onPress={() => router.push("/(tabs)/mehr/admin/shared-accounts")}
            />

            <MoreSectionCard
              title="Archiv"
              subtitle="Archivierte Fahrzeuge und Verkäufe."
              icon="archive"
              onPress={() => router.push("/(tabs)/mehr/admin/archive")}
            />

            <MoreSectionCard
              title="Statistik"
              subtitle="Admin-Auswertungen und Kennzahlen."
              icon="bar-chart-2"
              onPress={() => router.push("/(tabs)/mehr/admin/stats")}
            />

            <MoreSectionCard
              title="Vorlagen"
              subtitle="Kaufvertragsvorlagen verwalten."
              icon="file-text"
              onPress={() => router.push("/(tabs)/mehr/admin/templates")}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 16,
    paddingBottom: 140,
    gap: 24,
  },
  hero: {
    gap: 6,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: "#145437",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#000",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
    lineHeight: 18,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "rgba(0,0,0,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
