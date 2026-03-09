import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";

import Screen from "@/src/components/ui/Screen";

export default function MehrHelpScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Hilfe" }} />

      <Screen contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Hilfe</Text>
          <Text style={styles.title}>Support & Hinweise</Text>
          <Text style={styles.subtitle}>
            Erste Orientierung für Login, Rollen, Mitarbeiterauswahl und
            Admin-Bereiche.
          </Text>
        </View>

        <Card
          title="Login"
          text="Nach dem Login entscheidet die App automatisch, ob du direkt in die Tabs kommst oder zuerst einen Mitarbeiter auswählen musst."
        />

        <Card
          title="Mitarbeiterauswahl"
          text="Persönliche Konten können einen Standard-Mitarbeiter speichern. Geteilte Konten müssen den Mitarbeiter manuell auswählen."
        />

        <Card
          title="Rollen"
          text="Die sichtbaren Dashboards und Admin-Bereiche hängen von deiner effektiven Rolle ab. Admins können zusätzliche Verwaltungsbereiche öffnen."
        />

        <Card
          title="Nächster Ausbau"
          text="Später können hier FAQ, Support-Kontakt, Fehlerdiagnose und kurze Bedienanleitungen ergänzt werden."
        />
      </Screen>
    </>
  );
}

function Card({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{text}</Text>
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
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000",
  },
  cardText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
    lineHeight: 18,
  },
});
