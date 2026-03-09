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
import { Feather } from "@expo/vector-icons";

import {
  AdminOnlyScreen,
  adminCreateEmployee,
  adminSetEmployeeActive,
  fetchEmployees,
  type EmployeeRole,
  type EmployeeRow,
} from "@/src/features/admin";

const ROLES: EmployeeRole[] = [
  "dealer",
  "mechanic",
  "detailer",
  "listing",
  "admin",
];

function fmtRole(role: string) {
  const value = String(role).toLowerCase();
  if (value === "dealer") return "Händler";
  if (value === "mechanic") return "Mechaniker";
  if (value === "detailer") return "Aufbereiter";
  if (value === "listing") return "Inserat";
  if (value === "admin") return "Admin";
  return value;
}

export default function AdminEmployeesScreen() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<EmployeeRole>("dealer");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchEmployees();
      setRows(list);
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Konnte Mitarbeiter nicht laden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) =>
      String(row.display_name ?? "")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  const onCreate = useCallback(async () => {
    const displayName = name.trim();

    if (!displayName) {
      Alert.alert("Fehlt", "Bitte Name eingeben.");
      return;
    }

    setCreating(true);
    try {
      await adminCreateEmployee({ displayName, role });
      setName("");
      setRole("dealer");
      await load();
      Alert.alert("Erstellt", "Mitarbeiter wurde angelegt.");
    } catch (e: any) {
      Alert.alert(
        "Fehler",
        e?.message ?? "Konnte Mitarbeiter nicht erstellen.",
      );
    } finally {
      setCreating(false);
    }
  }, [load, name, role]);

  const toggleActive = useCallback(
    async (employee: EmployeeRow) => {
      try {
        await adminSetEmployeeActive({
          employeeId: employee.id,
          active: !employee.active,
        });
        await load();
      } catch (e: any) {
        Alert.alert("Fehler", e?.message ?? "Konnte Status nicht ändern.");
      }
    },
    [load],
  );

  return (
    <>
      <Stack.Screen options={{ title: "Mitarbeiter" }} />

      <AdminOnlyScreen
        title="Mitarbeiter"
        subtitle="Mitarbeiter anlegen sowie aktivieren und deaktivieren."
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Neuer Mitarbeiter</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Max Mustermann"
              placeholderTextColor="rgba(0,0,0,0.35)"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Rolle</Text>
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
          </View>

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
              <Text style={styles.primaryBtnText}>Mitarbeiter erstellen</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Liste</Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Nach Name suchen"
            placeholderTextColor="rgba(0,0,0,0.35)"
            style={styles.input}
          />

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              ListEmptyComponent={
                <Text style={styles.empty}>Keine Mitarbeiter gefunden.</Text>
              }
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{item.display_name}</Text>
                    <Text style={styles.rowMeta}>
                      {fmtRole(item.role)} · {item.active ? "Aktiv" : "Inaktiv"}
                      {item.account_user_id ? " · gebunden" : ""}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => {
                      void toggleActive(item);
                    }}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      item.active ? styles.deactivate : styles.activate,
                      pressed ? { opacity: 0.85 } : null,
                    ]}
                  >
                    <Feather
                      name={item.active ? "slash" : "check"}
                      size={14}
                      color="#145437"
                    />
                    <Text style={styles.actionText}>
                      {item.active ? "Deaktivieren" : "Aktivieren"}
                    </Text>
                  </Pressable>
                </View>
              )}
            />
          )}

          <Pressable
            onPress={() => {
              void load();
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
  field: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(0,0,0,0.65)",
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
  loadingBox: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingTop: 4,
  },
  row: {
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
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
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(20,84,55,0.22)",
    backgroundColor: "rgba(20,84,55,0.10)",
  },
  deactivate: {},
  activate: {},
  actionText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#145437",
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
  empty: {
    paddingTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
  },
});
