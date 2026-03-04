import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";

import Screen from "@/src/components/ui/Screen";
import AppButton from "@/src/components/ui/AppButton";
import TextField from "@/src/components/ui/TextField";

import {
  fetchEmployees,
  type EmployeeRow,
  type EmployeeRole,
} from "@/src/features/admin/employeesAdmin.service";
import {
  adminCreateSharedAccount,
  adminListSharedAccounts,
  type SharedAccountRow,
} from "@/src/features/admin/sharedAccountsAdmin.service";

const ROLES: EmployeeRole[] = ["dealer", "mechanic", "detailer", "listing"];

function fmtRole(r: string) {
  const x = String(r).toLowerCase();
  if (x === "dealer") return "Dealer";
  if (x === "mechanic") return "Mechaniker";
  if (x === "detailer") return "Aufbereiter";
  if (x === "listing") return "Listing";
  return x;
}

export default function AdminSharedAccountsScreen() {
  const [loading, setLoading] = useState(false);
  const [shared, setShared] = useState<SharedAccountRow[]>([]);

  // Create form
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [role, setRole] = useState<EmployeeRole>("mechanic");

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadShared = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminListSharedAccounts();
      setShared(list);
    } catch (e: any) {
      Alert.alert(
        "Fehler",
        e?.message ?? "Konnte Shared Accounts nicht laden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const list = await fetchEmployees();
      // only employees with role and not bound yet
      setEmployees(
        list.filter((e) => e.active && !e.account_user_id && e.role === role),
      );
      setSelectedEmployeeIds([]);
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Konnte Mitarbeiter nicht laden.");
    } finally {
      setLoadingEmployees(false);
    }
  }, [role]);

  React.useEffect(() => {
    loadShared();
  }, [loadShared]);

  React.useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const toggleEmp = useCallback((id: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const onCreate = useCallback(async () => {
    const e = email.trim().toLowerCase();
    const p = pw.trim();
    if (!e) return Alert.alert("Fehlt", "Bitte E-Mail eingeben.");
    if (!p || p.length < 6)
      return Alert.alert("Fehlt", "Passwort min. 6 Zeichen.");

    setCreating(true);
    try {
      await adminCreateSharedAccount({
        email: e,
        password: p,
        role,
        employeeIds: selectedEmployeeIds,
      });

      setEmail("");
      setPw("");
      setSelectedEmployeeIds([]);
      await loadShared();
      await loadEmployees();
      Alert.alert("Erstellt", "Shared Account wurde erstellt.");
    } catch (e: any) {
      Alert.alert(
        "Fehler",
        e?.message ?? "Konnte Shared Account nicht erstellen.",
      );
    } finally {
      setCreating(false);
    }
  }, [email, loadEmployees, loadShared, pw, role, selectedEmployeeIds]);

  const employeesHint = useMemo(() => {
    if (loadingEmployees) return "Lade Mitarbeiter…";
    if (employees.length === 0)
      return "Keine freien Mitarbeiter für diese Rolle.";
    return "Optional: Mitarbeiter direkt diesem Shared Login zuordnen.";
  }, [employees.length, loadingEmployees]);

  return (
    <Screen variant="scroll" bottomSpace={200}>
      <Stack.Screen options={{ title: "Shared Accounts" }} />

      <View style={styles.wrap}>
        <Text style={styles.title}>Shared Accounts</Text>
        <Text style={styles.sub}>
          Erstellen + Übersicht inkl. zugeordneten Employees.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Neuer Shared Account</Text>

          <TextField
            label="E-Mail"
            value={email}
            onChangeText={setEmail}
            placeholder="z.B. mechanics@..."
            autoCapitalize="none"
          />
          <TextField
            label="Passwort"
            value={pw}
            onChangeText={setPw}
            placeholder="mind. 6 Zeichen"
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.label}>Rolle</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                style={[styles.chip, role === r && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, role === r && styles.chipTextActive]}
                >
                  {fmtRole(r)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.hint}>{employeesHint}</Text>

          <FlatList
            data={employees}
            keyExtractor={(x) => x.id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingTop: 10, gap: 10 }}
            renderItem={({ item }) => {
              const selected = selectedEmployeeIds.includes(item.id);
              return (
                <Pressable
                  onPress={() => toggleEmp(item.id)}
                  style={[styles.empRow, selected && styles.empRowActive]}
                >
                  <Text style={styles.empName}>{item.display_name}</Text>
                  {selected ? <Text style={styles.tick}>✓</Text> : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>—</Text>}
          />

          <AppButton
            title={creating ? "Erstelle…" : "Shared Account erstellen"}
            onPress={onCreate}
            disabled={creating}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Übersicht</Text>

          {loading ? (
            <View style={{ paddingTop: 12 }}>
              <Text style={styles.hint}>Lade…</Text>
            </View>
          ) : (
            <FlatList
              data={shared}
              keyExtractor={(x) => x.user_id}
              scrollEnabled={false}
              contentContainerStyle={{ paddingTop: 10, gap: 10 }}
              renderItem={({ item }) => (
                <View style={styles.sharedRow}>
                  <Text style={styles.sharedEmail}>{item.email}</Text>
                  <Text style={styles.sharedMeta}>
                    {fmtRole(item.role)} · {item.active ? "aktiv" : "inaktiv"} ·{" "}
                    {item.employees.length} Mitarbeiter
                  </Text>
                  {item.employees.length ? (
                    <Text style={styles.sharedEmployees}>
                      {item.employees.map((e) => e.display_name).join(", ")}
                    </Text>
                  ) : null}
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.hint}>
                  Keine Shared Accounts vorhanden.
                </Text>
              }
            />
          )}

          <Pressable
            onPress={loadShared}
            style={({ pressed }) => [
              styles.reloadBtn,
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <Text style={styles.reloadText}>Neu laden</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 16, gap: 14 },
  title: { fontSize: 20, fontWeight: "900", color: "#000" },
  sub: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
    lineHeight: 18,
  },

  card: {
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.04)",
    padding: 14,
    gap: 10,
  },
  cardTitle: { fontSize: 13, fontWeight: "900", color: "#000" },

  label: { fontSize: 12, fontWeight: "900", color: "rgba(0,0,0,0.65)" },
  hint: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
    lineHeight: 18,
  },

  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  chipActive: {
    backgroundColor: "rgba(20,84,55,0.12)",
    borderWidth: 1,
    borderColor: "rgba(20,84,55,0.22)",
  },
  chipText: { fontSize: 12, fontWeight: "900", color: "rgba(0,0,0,0.65)" },
  chipTextActive: { color: "#145437" },

  empRow: {
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  empRowActive: {
    borderColor: "rgba(20,84,55,0.35)",
    backgroundColor: "rgba(20,84,55,0.10)",
  },
  empName: { fontSize: 13, fontWeight: "900", color: "#000" },
  tick: { fontSize: 16, fontWeight: "900", color: "#145437" },
  empty: { fontSize: 12, fontWeight: "800", color: "rgba(0,0,0,0.55)" },

  sharedRow: {
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  sharedEmail: { fontSize: 13, fontWeight: "900", color: "#000" },
  sharedMeta: { fontSize: 12, fontWeight: "800", color: "rgba(0,0,0,0.55)" },
  sharedEmployees: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
    lineHeight: 18,
  },

  reloadBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  reloadText: { fontSize: 12, fontWeight: "900", color: "#000" },
});
