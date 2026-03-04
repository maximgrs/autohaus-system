import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import Screen from "@/src/components/ui/Screen";
import AppButton from "@/src/components/ui/AppButton";
import { supabase } from "@/src/lib/supabase";

import { useAuthSession } from "@/src/features/session/authSession";
import { useDevEmployee } from "@/src/features/session/devSession";
import {
  ensureAppAccountRow,
  fetchAppAccount,
  fetchSharedAllowedEmployees,
  setDefaultEmployee,
  type AppAccountRow,
  type EmployeeLite,
} from "@/src/features/session/account.service";
import {
  fetchActiveEmployees,
  type EmployeeRow,
} from "@/src/features/employees/employees.service";

const UI = {
  text: "#000",
  muted: "rgba(0,0,0,0.55)",
  green: "#145437",
} as const;

type Row = EmployeeLite | EmployeeRow;

export default function SelectEmployeeScreen() {
  const { loading: authLoading, user } = useAuthSession();
  const { setEmployeeId } = useDevEmployee();

  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<AppAccountRow | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const uid = user?.id ?? "";

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      await ensureAppAccountRow(uid);
      const acc = await fetchAppAccount(uid);
      setAccount(acc);

      if (!acc) {
        setRows([]);
        return;
      }

      if (acc.is_shared) {
        const allowed = await fetchSharedAllowedEmployees(uid);
        setRows(allowed.filter((x) => x.active));
      } else {
        // personal but not configured yet -> pick once
        const all = await fetchActiveEmployees();
        setRows(all);
      }
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Konnte Daten nicht laden.");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (!authLoading && user) load();
  }, [authLoading, load, user]);

  const title = useMemo(() => {
    if (account?.is_shared) return "Mitarbeiter auswählen";
    return "Dein Mitarbeiterprofil auswählen";
  }, [account?.is_shared]);

  const subtitle = useMemo(() => {
    if (account?.is_shared)
      return "Shared Gerät: bitte wählen, wer gerade arbeitet.";
    return "Einmalige Auswahl für dein persönliches Konto.";
  }, [account?.is_shared]);

  const onPick = useCallback(
    async (empId: string) => {
      try {
        await setEmployeeId(empId);

        // Personal: persist default_employee_id
        if (account && !account.is_shared && uid) {
          await setDefaultEmployee(uid, empId);
        }

        router.replace("/");
      } catch (e: any) {
        Alert.alert("Fehler", e?.message ?? "Konnte Auswahl nicht speichern.");
      }
    },
    [account, setEmployeeId, uid],
  );

  const onLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  }, []);

  if (authLoading || loading) {
    return (
      <Screen variant="scroll" bottomSpace={120}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Lade…</Text>
        </View>
      </Screen>
    );
  }

  if (!user) return null;

  return (
    <Screen variant="scroll" bottomSpace={140}>
      <View style={styles.wrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{subtitle}</Text>

        <FlatList
          data={rows}
          keyExtractor={(x: any) => x.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }: any) => (
            <Pressable
              onPress={() => onPick(item.id)}
              style={({ pressed }) => [
                styles.row,
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.display_name}
                </Text>
                <Text style={styles.rowSub}>{String(item.role ?? "")}</Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Keine Mitarbeiter gefunden. (Admin muss Employees/Mapping
              pflegen.)
            </Text>
          }
        />

        <AppButton title="Abmelden" onPress={onLogout} variant="secondary" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },
  muted: { fontSize: 13, fontWeight: "700", color: UI.muted },

  wrap: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },
  title: { fontSize: 18, fontWeight: "900", color: UI.text },
  sub: { fontSize: 13, fontWeight: "700", color: UI.muted, lineHeight: 18 },

  list: { paddingTop: 14, paddingBottom: 24 },
  row: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowTitle: { fontSize: 14, fontWeight: "900", color: "#000" },
  rowSub: { fontSize: 12, fontWeight: "700", color: "rgba(0,0,0,0.55)" },
  chev: { fontSize: 22, fontWeight: "900", color: UI.green },
  empty: { paddingTop: 10, color: UI.muted, fontWeight: "700" },
});
