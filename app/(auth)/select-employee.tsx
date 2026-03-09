import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect } from "expo-router";

import { supabase } from "@/src/lib/supabase";
import { useDevEmployee } from "@/src/features/session/devSession";
import { useSessionRequirement } from "@/src/features/session";

type EmployeeRole = "admin" | "dealer" | "mechanic" | "detailer" | "listing";

type EmployeeRow = {
  id: string;
  display_name: string;
  role: EmployeeRole;
  active: boolean;
};

type AppAccountRow = {
  user_id: string;
  default_employee_id: string | null;
};

async function ensureAppAccount(userId: string): Promise<AppAccountRow> {
  const { data: existing, error: readError } = await supabase
    .from("app_accounts")
    .select("user_id, default_employee_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  if (existing) {
    return existing as AppAccountRow;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("app_accounts")
    .insert({
      user_id: userId,
      default_employee_id: null,
    })
    .select("user_id, default_employee_id")
    .single();

  if (insertError) {
    throw insertError;
  }

  return inserted as AppAccountRow;
}

async function loadAllowedEmployeesForShared(
  userId: string,
): Promise<EmployeeRow[]> {
  const { data, error } = await supabase
    .from("shared_account_employees")
    .select(
      `
      employee_id,
      employees!inner (
        id,
        display_name,
        role,
        active
      )
    `,
    )
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as any[])
    .map((row) => row.employees)
    .filter(Boolean)
    .map((employee) => ({
      id: employee.id,
      display_name: employee.display_name,
      role: employee.role,
      active: Boolean(employee.active),
    }));
}

async function loadAllActiveEmployees(): Promise<EmployeeRow[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("id, display_name, role, active")
    .eq("active", true)
    .order("display_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as EmployeeRow[];
}

export default function SelectEmployeeScreen() {
  const { requirement, href, user, account } = useSessionRequirement();
  const { setEmployeeId } = useDevEmployee();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const userId = user?.id ?? null;
  const accountType = account?.account_type ?? null;

  const activeEmployees = useMemo(
    () => employees.filter((item) => item.active),
    [employees],
  );

  const load = useCallback(async () => {
    if (!userId) {
      setEmployees([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorText(null);

    try {
      await ensureAppAccount(userId);

      const nextEmployees =
        accountType === "shared"
          ? await loadAllowedEmployeesForShared(userId)
          : await loadAllActiveEmployees();

      setEmployees(nextEmployees);
    } catch (err: any) {
      setErrorText(err?.message ?? "Mitarbeiter konnten nicht geladen werden.");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [accountType, userId]);

  useEffect(() => {
    if (requirement === "select-employee") {
      void load();
    }
  }, [load, requirement]);

  const onSelectEmployee = useCallback(
    async (employee: EmployeeRow) => {
      if (!userId) return;

      setSavingId(employee.id);
      setErrorText(null);

      try {
        await setEmployeeId(employee.id);

        if (accountType === "individual") {
          const { error } = await supabase
            .from("app_accounts")
            .update({ default_employee_id: employee.id })
            .eq("user_id", userId);

          if (error) {
            throw error;
          }
        }
      } catch (err: any) {
        setErrorText(
          err?.message ?? "Mitarbeiter konnte nicht gespeichert werden.",
        );
      } finally {
        setSavingId(null);
      }
    },
    [accountType, setEmployeeId, userId],
  );

  if (requirement === "ready" && href) {
    return <Redirect href={href} />;
  }

  if (requirement === "login") {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Autohaus System</Text>
        <Text style={styles.title}>Mitarbeiter wählen</Text>
        <Text style={styles.subtitle}>
          Wähle den Mitarbeiter, mit dem du in der App arbeiten möchtest.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.centerText}>Lade Mitarbeiter…</Text>
        </View>
      ) : (
        <FlatList
          data={activeEmployees}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Keine aktiven Mitarbeiter gefunden.
            </Text>
          }
          renderItem={({ item }) => {
            const saving = savingId === item.id;

            return (
              <Pressable
                onPress={() => {
                  void onSelectEmployee(item);
                }}
                disabled={saving}
                style={({ pressed }) => [
                  styles.card,
                  pressed ? { opacity: 0.94 } : null,
                ]}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{item.display_name}</Text>
                  <Text style={styles.badge}>{item.role}</Text>
                </View>

                <Text style={styles.cardSub}>
                  {accountType === "shared"
                    ? "Geteiltes Konto"
                    : "Persönliches Konto"}
                </Text>

                {saving ? (
                  <View style={styles.savingRow}>
                    <ActivityIndicator size="small" />
                    <Text style={styles.savingText}>Speichere Auswahl…</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 72,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  hero: {
    gap: 8,
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    color: "#145437",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#000",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: "rgba(0,0,0,0.55)",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  centerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
  },
  card: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000",
    flex: 1,
  },
  badge: {
    fontSize: 12,
    fontWeight: "800",
    color: "#145437",
    textTransform: "uppercase",
  },
  cardSub: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(0,0,0,0.55)",
  },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  savingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
  },
  error: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "700",
    color: "#B42318",
  },
});
