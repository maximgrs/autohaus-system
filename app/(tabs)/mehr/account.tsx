import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";

import Screen from "@/src/components/ui/Screen";
import { useSessionRequirement } from "@/src/features/session";

function labelRole(role: string | null | undefined) {
  const value = String(role ?? "").toLowerCase();

  if (value === "admin") return "Admin";
  if (value === "dealer") return "Händler";
  if (value === "mechanic") return "Mechaniker";
  if (value === "detailer") return "Aufbereiter";
  if (value === "listing") return "Inserat";

  return value || "—";
}

function labelAccountType(accountType: string | null | undefined) {
  const value = String(accountType ?? "").toLowerCase();

  if (value === "shared") return "Geteiltes Konto";
  if (value === "individual") return "Persönliches Konto";

  return value || "—";
}

export default function MehrAccountScreen() {
  const { user, account, selectedEmployee, effectiveRole, accountType } =
    useSessionRequirement();

  return (
    <>
      <Stack.Screen options={{ title: "Konto" }} />

      <Screen contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Konto</Text>
          <Text style={styles.title}>Aktuelle Sitzung</Text>
          <Text style={styles.subtitle}>
            Übersicht über Login, Kontotyp, aktive Rolle und gewählten
            Mitarbeiter.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Benutzer</Text>

          <Row label="E-Mail" value={user?.email ?? "—"} />
          <Row label="User ID" value={user?.id ?? "—"} mono />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Konto</Text>

          <Row label="Kontotyp" value={labelAccountType(accountType)} />
          <Row label="Account Rolle" value={labelRole(account?.role)} />
          <Row label="Effektive Rolle" value={labelRole(effectiveRole)} />
          <Row
            label="Status"
            value={account?.active === false ? "Inaktiv" : "Aktiv"}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mitarbeiter</Text>

          <Row
            label="Ausgewählt"
            value={selectedEmployee?.display_name ?? "Kein Mitarbeiter gewählt"}
          />
          <Row
            label="Mitarbeiter Rolle"
            value={labelRole(selectedEmployee?.role)}
          />
          <Row
            label="Mitarbeiter ID"
            value={selectedEmployee?.id ?? "—"}
            mono
          />
        </View>
      </Screen>
    </>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, mono ? styles.valueMono : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 16,
    gap: 14,
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
  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    gap: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#000",
  },
  row: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(0,0,0,0.55)",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  value: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000",
    lineHeight: 18,
  },
  valueMono: {
    fontFamily: "Courier",
  },
});
