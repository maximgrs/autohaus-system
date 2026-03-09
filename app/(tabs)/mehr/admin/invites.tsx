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
  adminCreateEmployeeInvite,
  fetchEmployees,
  type CreatedInvite,
  type EmployeeRow,
} from "@/src/features/admin";

export default function AdminInvitesScreen() {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [expiresDays, setExpiresDays] = useState("30");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedInvite | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchEmployees();
      setEmployees(list.filter((e) => !e.account_user_id && e.active));
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
    if (!q) return employees;

    return employees.filter((e) =>
      String(e.display_name ?? "")
        .toLowerCase()
        .includes(q),
    );
  }, [employees, search]);

  const exp = useMemo(() => {
    const n = parseInt(expiresDays.trim(), 10);
    if (!Number.isFinite(n) || n <= 0) return 30;
    return Math.min(Math.max(n, 1), 365);
  }, [expiresDays]);

  const onCreate = useCallback(async () => {
    const employeeId = String(selectedEmployeeId ?? "").trim();

    if (!employeeId) {
      Alert.alert("Fehlt", "Bitte Mitarbeiter auswählen.");
      return;
    }

    setCreating(true);
    setCreated(null);

    try {
      const invite = await adminCreateEmployeeInvite({
        employeeId,
        expiresDays: exp,
      });
      setCreated(invite);
      Alert.alert("Erstellt", "Einladungscode wurde erstellt.");
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Konnte Code nicht erstellen.");
    } finally {
      setCreating(false);
    }
  }, [exp, selectedEmployeeId]);

  return (
    <>
      <Stack.Screen options={{ title: "Einladungscodes" }} />

      <AdminOnlyScreen
        title="Einladungscodes"
        subtitle="Wähle einen Mitarbeiter ohne Account und erstelle einen Registrierungscode."
      >
        <View style={styles.card}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Mitarbeiter suchen"
            placeholderTextColor="rgba(0,0,0,0.35)"
            style={styles.input}
          />

          <TextInput
            value={expiresDays}
            onChangeText={setExpiresDays}
            keyboardType="number-pad"
            placeholder="30"
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
                <Text style={styles.empty}>
                  Keine passenden Mitarbeiter ohne Account.
                </Text>
              }
              renderItem={({ item }) => {
                const selected = selectedEmployeeId === item.id;

                return (
                  <Pressable
                    onPress={() => setSelectedEmployeeId(item.id)}
                    style={[styles.row, selected ? styles.rowActive : null]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName}>{item.display_name}</Text>
                      <Text style={styles.rowMeta}>
                        {String(item.role).toUpperCase()}
                      </Text>
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
              <Text style={styles.primaryBtnText}>Code erstellen</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              void load();
            }}
            style={({ pressed }) => [
              styles.reloadBtn,
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <Text style={styles.reloadText}>Liste neu laden</Text>
          </Pressable>
        </View>

        {created ? (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>Code</Text>
            <Text style={styles.code}>{created.code}</Text>
            <Text style={styles.rowMeta}>
              Ablauf: {created.expires_at ?? "—"}
            </Text>
          </View>
        ) : null}
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
    marginTop: 2,
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
  result: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(20,84,55,0.10)",
    borderWidth: 1,
    borderColor: "rgba(20,84,55,0.22)",
    gap: 8,
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#145437",
  },
  code: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#000",
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
