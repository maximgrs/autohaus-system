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
} from "@/src/features/admin/employeesAdmin.service";
import {
  adminCreateEmployeeInvite,
  type CreatedInvite,
} from "@/src/features/admin/invitesAdmin.service";

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
      // only unbound employees for personal invites
      setEmployees(list.filter((e) => !e.account_user_id && e.active));
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
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      String(e.display_name).toLowerCase().includes(q),
    );
  }, [employees, search]);

  const exp = useMemo(() => {
    const n = parseInt(expiresDays.trim(), 10);
    if (!Number.isFinite(n) || n <= 0) return 30;
    return Math.min(Math.max(n, 1), 365);
  }, [expiresDays]);

  const onCreate = useCallback(async () => {
    const empId = String(selectedEmployeeId ?? "").trim();
    if (!empId) {
      Alert.alert("Fehlt", "Bitte Mitarbeiter auswählen.");
      return;
    }

    setCreating(true);
    setCreated(null);
    try {
      const inv = await adminCreateEmployeeInvite({
        employeeId: empId,
        expiresDays: exp,
      });
      setCreated(inv);
      Alert.alert("Erstellt", "Einladungscode wurde erstellt.");
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Konnte Code nicht erstellen.");
    } finally {
      setCreating(false);
    }
  }, [exp, selectedEmployeeId]);

  return (
    <Screen variant="scroll" bottomSpace={180}>
      <Stack.Screen options={{ title: "Einladungscodes" }} />

      <View style={styles.wrap}>
        <Text style={styles.title}>Einladungscodes</Text>
        <Text style={styles.sub}>
          Wähle einen Mitarbeiter (ohne Account) und erstelle einen Code für die
          Registrierung.
        </Text>

        <View style={styles.card}>
          <TextField
            label="Suche"
            value={search}
            onChangeText={setSearch}
            placeholder="Name…"
          />
          <TextField
            label="Gültigkeit (Tage)"
            value={expiresDays}
            onChangeText={setExpiresDays}
            placeholder="30"
          />

          <FlatList
            data={filtered}
            keyExtractor={(x) => x.id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingTop: 10, gap: 10 }}
            renderItem={({ item }) => {
              const selected = selectedEmployeeId === item.id;
              return (
                <Pressable
                  onPress={() => setSelectedEmployeeId(item.id)}
                  style={[styles.row, selected && styles.rowActive]}
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
            ListEmptyComponent={
              <Text style={styles.empty}>
                {loading
                  ? "Lade…"
                  : "Keine passenden Mitarbeiter ohne Account."}
              </Text>
            }
          />

          <AppButton
            title={creating ? "Erstelle…" : "Code erstellen"}
            onPress={onCreate}
            disabled={creating || !selectedEmployeeId}
          />
        </View>

        {created ? (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>Code</Text>
            <Text style={styles.code} selectable>
              {created.code}
            </Text>
            <Text style={styles.sub}>Ablauf: {created.expires_at ?? "—"}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={load}
          style={({ pressed }) => [
            styles.reloadBtn,
            pressed ? { opacity: 0.85 } : null,
          ]}
        >
          <Text style={styles.reloadText}>Liste neu laden</Text>
        </Pressable>
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
  rowName: { fontSize: 13, fontWeight: "900", color: "#000" },
  rowMeta: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
    marginTop: 2,
  },
  tick: { fontSize: 16, fontWeight: "900", color: "#145437" },

  empty: {
    paddingTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
  },

  result: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(20,84,55,0.10)",
    borderWidth: 1,
    borderColor: "rgba(20,84,55,0.22)",
    gap: 8,
  },
  resultTitle: { fontSize: 12, fontWeight: "900", color: "#145437" },
  code: { fontSize: 20, fontWeight: "900", letterSpacing: 1, color: "#000" },

  reloadBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  reloadText: { fontSize: 12, fontWeight: "900", color: "#000" },
});
