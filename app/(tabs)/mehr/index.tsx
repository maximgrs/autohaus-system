import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import Screen from "@/src/components/ui/Screen";
import { supabase } from "@/src/lib/supabase";

type AccountRow = {
  user_id: string;
  role: "admin" | "dealer" | "mechanic" | "detailer" | "listing";
  account_type: "shared" | "individual";
  active: boolean;
};

function MenuRow({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? { opacity: 0.85 } : null]}
    >
      <View style={styles.rowIcon}>
        <Feather name={icon} size={18} color="#145437" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      <Feather name="chevron-right" size={20} color="rgba(0,0,0,0.35)" />
    </Pressable>
  );
}

export default function MehrIndex() {
  const [account, setAccount] = useState<AccountRow | null>(null);
  const [mail, setMail] = useState("—");

  const load = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      setMail(userData.user?.email ?? "—");
      if (!uid) return;

      const { data, error } = await supabase
        .from("accounts")
        .select("user_id, role, account_type, active")
        .eq("user_id", uid)
        .maybeSingle();

      if (error) throw error;
      setAccount((data ?? null) as AccountRow | null);
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Konnte Account nicht laden.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isAdmin = useMemo(() => account?.role === "admin", [account?.role]);
  const isDealer = useMemo(() => account?.role === "dealer", [account?.role]);

  const onLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  }, []);

  return (
    <Screen variant="scroll" bottomSpace={180}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Mehr</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <Text style={styles.cardText}>{mail}</Text>
          <Text style={styles.cardMeta}>
            {account
              ? `${String(account.account_type).toUpperCase()} · ${String(account.role).toUpperCase()}`
              : "—"}
          </Text>
        </View>

        {/* Admin Section */}
        {isAdmin ? (
          <View style={styles.group}>
            <Text style={styles.groupTitle}>Admin</Text>

            <MenuRow
              title="Mitarbeiter"
              subtitle="Anlegen & deaktivieren"
              icon="users"
              onPress={() => router.push("/(tabs)/mehr/admin/employees")}
            />

            <MenuRow
              title="Einladungscodes"
              subtitle="Codes für Personal-Registrierung erstellen"
              icon="key"
              onPress={() => router.push("/(tabs)/mehr/admin/invites")}
            />

            <MenuRow
              title="Shared Accounts"
              subtitle="Shared Logins anlegen & zuordnen"
              icon="tablet"
              onPress={() => router.push("/(tabs)/mehr/admin/shared-accounts")}
            />

            <MenuRow
              title="Kaufvertrag Vorlagen"
              subtitle="Upload & Verwaltung"
              icon="file-text"
              onPress={() => router.push("/(tabs)/mehr/admin/templates")}
            />

            <MenuRow
              title="Archiv"
              subtitle="Verkaufte Fahrzeuge"
              icon="archive"
              onPress={() => router.push("/(tabs)/mehr/admin/archive")}
            />
          </View>
        ) : null}

        {/* Dealer Section */}
        {isDealer ? (
          <View style={styles.group}>
            <Text style={styles.groupTitle}>Dealer</Text>

            <MenuRow
              title="Archiv"
              subtitle="Verkaufte Fahrzeuge"
              icon="archive"
              onPress={() => router.push("/(tabs)/mehr/dealer/archive")}
            />
          </View>
        ) : null}

        {/* Account actions */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Account</Text>
          <MenuRow
            title="Abmelden"
            subtitle="Session beenden"
            icon="log-out"
            onPress={onLogout}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 16, gap: 14 },
  title: { fontSize: 22, fontWeight: "900", color: "#000" },

  card: {
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.04)",
    padding: 14,
    gap: 6,
  },
  cardTitle: { fontSize: 12, fontWeight: "900", color: "rgba(0,0,0,0.55)" },
  cardText: { fontSize: 14, fontWeight: "900", color: "#000" },
  cardMeta: { fontSize: 12, fontWeight: "800", color: "rgba(0,0,0,0.55)" },

  group: { gap: 8 },
  groupTitle: { fontSize: 13, fontWeight: "900", color: "#000" },

  row: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 13, fontWeight: "900", color: "#000" },
  rowSub: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
    marginTop: 2,
  },
});
