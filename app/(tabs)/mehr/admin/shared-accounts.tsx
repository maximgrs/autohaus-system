import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack } from "expo-router";

import {
  AdminOnlyScreen,
  adminCreateSharedAccount,
  adminListSharedAccounts,
  fetchEmployees,
  type EmployeeRole,
  type EmployeeRow,
  type SharedAccountRow,
} from "@/src/features/admin";

const ROLES: EmployeeRole[] = ["dealer", "mechanic", "detailer", "listing"];

function fmtRole(role: string) {
  const value = String(role).toLowerCase();
  if (value === "dealer") return "Dealer";
  if (value === "mechanic") return "Mechaniker";
  if (value === "detailer") return "Aufbereiter";
  if (value === "listing") return "Listing";
  return value;
}

export default function AdminSharedAccountsScreen() {
  const [loading, setLoading] = useState(false);
  const [shared, setShared] = useState<SharedAccountRow[]>([]);

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
      setEmployees(
        list.filter(
          (e) => e.active && !e.account_user_id && String(e.role) === role,
        ),
      );
      setSelectedEmployeeIds([]);
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Konnte Mitarbeiter nicht laden.");
    } finally {
      setLoadingEmployees(false);
    }
  }, [role]);

  useEffect(() => {
    void loadShared();
  }, [loadShared]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const toggleEmp = useCallback((id: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const onCreate = useCallback(async () => {
    const nextEmail = email.trim().toLowerCase();
    const nextPw = pw.trim();

    if (!nextEmail) {
      Alert.alert("Fehlt", "Bitte E-Mail eingeben.");
      return;
    }

    if (!nextPw || nextPw.length < 6) {
      Alert.alert("Fehlt", "Passwort min. 6 Zeichen.");
      return;
    }

    setCreating(true);
    try {
      await adminCreateSharedAccount({
        email: nextEmail,
        password: nextPw,
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
    <>
      <Stack.Screen options={{ title: "Shared Accounts" }} />

      <AdminOnlyScreen
        title="Shared Accounts"
        subtitle="Shared Logins erstellen und zugeordnete Mitarbeiter verwalten."
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Neuen Shared Account erstellen</Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="shared@firma.com"
            placeholderTextColor="rgba(0,0,0,0.35)"
            autoCapitalize="none"
            style={styles.input}
          />

          <TextInput
            value={pw}
            onChangeText={setPw}
            placeholder="Passwort"
            placeholderTextColor="rgba(0,0,0,0.35)"
            secureTextEntry
            style={styles.input}
          />

          <View style={styles.roleRow}>
            {ROLES.map((r) => {
              const active = role === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setRole(r)}
                  style={[styles.chip, active ? styles.chipActive : null]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active ? styles.chipTextActive : null,
                    ]}
                  >
                    {fmtRole(r)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.helper}>{employeesHint}</Text>

          {loadingEmployees ? (
            <ActivityIndicator />
          ) : (
            <FlatList
              data={employees}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              ListEmptyComponent={
                <Text style={styles.empty}>Keine passenden Mitarbeiter.</Text>
              }
              renderItem={({ item }) => {
                const selected = selectedEmployeeIds.includes(item.id);

                return (
                  <Pressable
                    onPress={() => toggleEmp(item.id)}
                    style={[styles.row, selected ? styles.rowActive : null]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName}>{item.display_name}</Text>
                      <Text style={styles.rowMeta}>{fmtRole(item.role)}</Text>
                    </View>

                    {selected ? <Text style={styles.tick}>✓</Text> : null}
                  </Pressable>
                );
              }}
            />
          )}

          <Pressable
            onPress={() => {
              void onCreate();
            }}
            disabled={creating}
            style={({ pressed }) => [
              styles.primaryBtn,
              creating ? { opacity: 0.7 } : null,
              pressed ? { opacity: 0.9 } : null,
            ]}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                Shared Account erstellen
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Übersicht</Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={shared}
              keyExtractor={(item) => item.user_id}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  Keine Shared Accounts vorhanden.
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.rowName}>{item.email}</Text>
                    <Text style={styles.rowMeta}>
                      {fmtRole(item.role)} · {item.active ? "Aktiv" : "Inaktiv"}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {item.employees.length > 0
                        ? item.employees.map((e) => e.display_name).join(", ")
                        : "Keine Mitarbeiter zugeordnet"}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}

          <Pressable
            onPress={() => {
              void loadShared();
            }}
            style={({ pressed }) => [
              styles.reloadBtn,
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <Text style={styles.reloadText}>Neu laden</Text>
          </Pressable>
        </View>
      </AdminOnlyScreen>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.04)",
    padding: 14,
    gap: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#000",
  },
  input: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 12,
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  chipActive: {
    backgroundColor: "rgba(21,127,79,0.12)",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(0,0,0,0.65)",
  },
  chipTextActive: {
    color: "#145437",
  },
  helper: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
  },
  loadingBox: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingTop: 2,
  },
  row: {
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowActive: {
    borderColor: "rgba(20,84,55,0.35)",
    backgroundColor: "rgba(20,84,55,0.10)",
  },
  rowName: {
    fontSize: 13,
    fontWeight: "900",
    color: "#000",
  },
  rowMeta: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
  },
  tick: {
    fontSize: 16,
    fontWeight: "900",
    color: "#145437",
  },
  empty: {
    paddingTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
  },
  primaryBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#145437",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
  },
  reloadBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  reloadText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000",
  },
});
