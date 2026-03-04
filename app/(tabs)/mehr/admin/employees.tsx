import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";

import Screen from "@/src/components/ui/Screen";
import AppButton from "@/src/components/ui/AppButton";
import TextField from "@/src/components/ui/TextField";

import {
  adminCreateEmployee,
  adminSetEmployeeActive,
  fetchEmployees,
  type EmployeeRow,
  type EmployeeRole,
} from "@/src/features/admin/employeesAdmin.service";

const ROLES: EmployeeRole[] = [
  "dealer",
  "mechanic",
  "detailer",
  "listing",
  "admin",
];

function fmtRole(r: string) {
  const x = String(r).toLowerCase();
  if (x === "dealer") return "Händler";
  if (x === "mechanic") return "Mechaniker";
  if (x === "detailer") return "Aufbereiter";
  if (x === "listing") return "Inserat";
  if (x === "admin") return "Admin";
  return x;
}

export default function AdminEmployeesScreen() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [q, setQ] = useState("");

  // Create form
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

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => String(r.display_name).toLowerCase().includes(s));
  }, [q, rows]);

  const onCreate = useCallback(async () => {
    const n = name.trim();
    if (!n) {
      Alert.alert("Fehlt", "Bitte Name eingeben.");
      return;
    }

    setCreating(true);
    try {
      await adminCreateEmployee({ displayName: n, role });
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
    <Screen variant="scroll" bottomSpace={180}>
      <Stack.Screen options={{ title: "Mitarbeiter" }} />

      <View style={styles.wrap}>
        <Text style={styles.title}>Mitarbeiter</Text>
        <Text style={styles.sub}>Anlegen, aktivieren/deaktivieren.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Neuer Mitarbeiter</Text>

          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="z.B. Max Mustermann"
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

          <AppButton
            title={creating ? "Erstelle…" : "Mitarbeiter erstellen"}
            onPress={onCreate}
            disabled={creating}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Liste</Text>

          <TextField
            label="Suche"
            value={q}
            onChangeText={setQ}
            placeholder="Name…"
          />

          {loading ? (
            <View style={{ paddingTop: 14 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(x) => x.id}
              scrollEnabled={false}
              contentContainerStyle={{ paddingTop: 12, gap: 10 }}
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
                    onPress={() => toggleActive(item)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed ? { opacity: 0.85 } : null,
                      item.active ? styles.deactivate : styles.activate,
                    ]}
                  >
                    <Feather
                      name={item.active ? "slash" : "check"}
                      size={16}
                      color="#145437"
                    />
                    <Text style={styles.actionText}>
                      {item.active ? "Deaktivieren" : "Aktivieren"}
                    </Text>
                  </Pressable>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>Keine Mitarbeiter gefunden.</Text>
              }
            />
          )}

          <Pressable
            onPress={load}
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
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  chipActive: {
    backgroundColor: "rgba(21, 127, 79, 0.12)",
  },
  chipText: { fontSize: 12, fontWeight: "900", color: "rgba(0,0,0,0.65)" },
  chipTextActive: { color: "#145437" },

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
  rowName: { fontSize: 13, fontWeight: "900", color: "#000" },
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
  actionText: { fontSize: 12, fontWeight: "900", color: "#145437" },

  reloadBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  reloadText: { fontSize: 12, fontWeight: "900", color: "#000" },

  empty: {
    paddingTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
  },
});
