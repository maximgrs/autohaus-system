import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { supabase } from "@/src/lib/supabase";

// Dashboards
import DetailerDashboard from "@/src/screens/tasks/DetailerDashboard";
import DealerDashboard from "@/src/screens/tasks/DealerDashboard";
import MechanicDashboard from "@/src/screens/tasks/MechanicDashboard";

type EmployeeRole = "admin" | "dealer" | "mechanic" | "detailer" | "listing";

type AccountRow = {
  user_id: string;
  role: EmployeeRole;
  account_type: "shared" | "individual";
  active: boolean;
};

type AdminPicker = { onPress: () => void };

const ROLE_OPTIONS: Array<{ key: EmployeeRole; label: string }> = [
  { key: "listing", label: "Inserat" },
  { key: "dealer", label: "Händler" },
  { key: "mechanic", label: "Werkstatt" },
  { key: "detailer", label: "Aufbereiter" },
];

export default function AufgabenIndex() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<AccountRow | null>(null);

  // Admin kann Dashboard-View wechseln
  const [adminRole, setAdminRole] = useState<EmployeeRole>("listing");
  const [roleModal, setRoleModal] = useState(false);

  const loadAccount = useCallback(async () => {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      if (!uid) {
        setAccount(null);
        return;
      }

      const { data, error } = await supabase
        .from("accounts")
        .select("user_id, role, account_type, active")
        .eq("user_id", uid)
        .maybeSingle();

      if (error) throw error;
      setAccount((data ?? null) as AccountRow | null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const isAdmin = account?.role === "admin";

  const effectiveRole = useMemo<EmployeeRole>(() => {
    if (!account) return "listing";
    return isAdmin ? adminRole : account.role;
  }, [account, adminRole, isAdmin]);

  const adminPicker: AdminPicker | undefined = useMemo(() => {
    if (!isAdmin) return undefined;
    return { onPress: () => setRoleModal(true) };
  }, [isAdmin]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Lade…</Text>
      </View>
    );
  }

  if (!account) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errTitle}>Nicht angemeldet</Text>
        <Text style={styles.errSub}>Bitte einloggen.</Text>
      </View>
    );
  }

  const content =
    effectiveRole === "dealer" ? (
      <DealerDashboard adminPicker={adminPicker} viewerAccount={account} />
    ) : effectiveRole === "mechanic" ? (
      <MechanicDashboard adminPicker={adminPicker} />
    ) : effectiveRole === "detailer" ? (
      <DetailerDashboard adminPicker={adminPicker} />
    ) : (
      <DetailerDashboard adminPicker={adminPicker} />
    );

  return (
    <View style={{ flex: 1 }}>
      {content}

      {/* Admin Dashboard Picker Modal */}
      <Modal visible={roleModal} transparent animationType="fade">
        <Pressable
          style={styles.backdrop}
          onPress={() => setRoleModal(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Dashboard wählen</Text>
            <Pressable
              onPress={() => setRoleModal(false)}
              hitSlop={10}
              style={styles.closeBtn}
            >
              <Feather name="x" size={18} color="rgba(0,0,0,0.75)" />
            </Pressable>
          </View>

          <View style={styles.list}>
            {ROLE_OPTIONS.map((o) => {
              const active = o.key === adminRole;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => {
                    setAdminRole(o.key);
                    setRoleModal(false);
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    active ? styles.rowActive : null,
                    pressed ? { opacity: 0.9 } : null,
                  ]}
                >
                  <Text style={styles.rowText}>{o.label}</Text>
                  {active ? <Text style={styles.tick}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fff",
  },
  loadingText: { fontSize: 12, fontWeight: "700", color: "rgba(0,0,0,0.55)" },
  errTitle: { fontSize: 16, fontWeight: "900", color: "#000" },
  errSub: { fontSize: 12, fontWeight: "700", color: "rgba(0,0,0,0.55)" },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },
  sheet: {
    position: "absolute",
    left: 16,
    right: 16,
    top: "24%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    marginBottom: 10,
  },
  sheetTitle: { fontSize: 14, fontWeight: "900", color: "#000" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  list: { gap: 10, paddingBottom: 6 },
  row: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowActive: {
    backgroundColor: "rgba(20,84,55,0.10)",
    borderWidth: 1,
    borderColor: "rgba(20,84,55,0.25)",
  },
  rowText: { fontSize: 14, fontWeight: "700", color: "#000" },
  tick: { fontSize: 16, fontWeight: "900", color: "#145437" },
});

//letzte version
// app/(tabs)/aufgaben/index.tsx
// import React, { useCallback, useMemo } from "react";
// import {
//   ActivityIndicator,
//   Pressable,
//   StyleSheet,
//   Text,
//   View,
// } from "react-native";
// import { router, useFocusEffect } from "expo-router";

// import Screen from "@/src/components/ui/Screen";
// import AppButton from "@/src/components/ui/AppButton";

// import { useSupabaseSession } from "@/src/features/session/useSupabaseSession";
// import {
//   roleFromAllowedEmployees,
//   useAllowedEmployees,
//   useMyAppAccount,
// } from "@/src/features/session/appAccount.service";

// import { useDevEmployee } from "@/src/features/session/devSession";

// import DetailerDashboard from "@/src/screens/tasks/DetailerDashboard";
// import DealerDashboard from "@/src/screens/tasks/DealerDashboard";
// import MechanicDashboard from "@/src/screens/tasks/MechanicDashboard";

// import DealerDashboardShared from "@/src/screens/tasks/DealerDashboardShared";
// import MechanicDashboardShared from "@/src/screens/tasks/MechanicDashboardShared";

// export default function AufgabenIndex() {
//   const { user } = useSupabaseSession();
//   const { loading: accLoading, account } = useMyAppAccount(user?.id ?? null);

//   const {
//     loading: allowedLoading,
//     employees: allowedEmployees,
//     reload: reloadAllowed,
//   } = useAllowedEmployees(account?.id ?? null);

//   // Personal “active employee” bleibt wie bei dir (devSession)
//   const { loading: devLoading, employee, reload: reloadDev } = useDevEmployee();

//   useFocusEffect(
//     useCallback(() => {
//       reloadDev();
//       reloadAllowed();
//     }, [reloadAllowed, reloadDev]),
//   );

//   const sharedRole = useMemo(() => {
//     if (!account?.is_shared) return "";
//     return roleFromAllowedEmployees(allowedEmployees);
//   }, [account?.is_shared, allowedEmployees]);

//   if (accLoading || (account?.is_shared ? allowedLoading : devLoading)) {
//     return (
//       <Screen variant="scroll" bottomSpace={120}>
//         <View style={styles.center}>
//           <ActivityIndicator />
//           <Text style={styles.muted}>Lade Aufgaben…</Text>
//         </View>
//       </Screen>
//     );
//   }

//   if (!account) {
//     return (
//       <Screen variant="scroll" bottomSpace={160}>
//         <View style={styles.center}>
//           <Text style={styles.title}>Kein App-Account gefunden</Text>
//           <Text style={styles.muted}>
//             In der Tabelle app_accounts existiert kein Eintrag für diesen User.
//           </Text>
//         </View>
//       </Screen>
//     );
//   }

//   // ✅ Shared: KEIN employee select, Routing über “allowedEmployees -> role”
//   if (account.is_shared) {
//     const role = String(sharedRole ?? "").toLowerCase();

//     if (role === "mechanic") return <MechanicDashboardShared />;

//     if (role === "dealer") {
//       return <DealerDashboardShared accountId={account.id} />;
//     }

//     // default: detailer (ist bei dir schon ohne employee)
//     return <DetailerDashboard />;
//   }

//   // Personal: wie bisher
//   if (!employee) {
//     return (
//       <Screen variant="scroll" bottomSpace={160}>
//         <View style={styles.center}>
//           <Text style={styles.title}>Kein Mitarbeiter gewählt</Text>
//           <Text style={styles.muted}>
//             Für Personal Accounts muss einmalig ein Mitarbeiter ausgewählt
//             werden.
//           </Text>

//           <AppButton
//             title="Mitarbeiter auswählen"
//             onPress={() => router.push("/(auth)/select-employee")}
//             style={{ marginTop: 0 }}
//           />

//           <Pressable
//             onPress={reloadDev}
//             style={({ pressed }) => [
//               styles.linkBtn,
//               pressed ? { opacity: 0.85 } : null,
//             ]}
//           >
//             <Text style={styles.linkText}>Neu laden</Text>
//           </Pressable>
//         </View>
//       </Screen>
//     );
//   }

//   const role = String(employee.role ?? "").toLowerCase();
//   if (role === "dealer") return <DealerDashboard />;
//   if (role === "mechanic") return <MechanicDashboard />;

//   return <DetailerDashboard />;
// }

// const styles = StyleSheet.create({
//   center: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },
//   title: { fontSize: 18, fontWeight: "900", color: "#000" },
//   muted: {
//     fontSize: 13,
//     fontWeight: "700",
//     color: "rgba(0,0,0,0.55)",
//     lineHeight: 18,
//   },
//   linkBtn: {
//     alignSelf: "flex-start",
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 999,
//     backgroundColor: "rgba(0,0,0,0.06)",
//   },
//   linkText: { fontSize: 12, fontWeight: "800", color: "#000" },
// });

//die letze version die funktioniert hat mit accounts wechsel und so
// import React, { useCallback } from "react";
// import {
//   ActivityIndicator,
//   Pressable,
//   StyleSheet,
//   Text,
//   View,
// } from "react-native";
// import { router, useFocusEffect } from "expo-router";

// import Screen from "@/src/components/ui/Screen";
// import AppButton from "@/src/components/ui/AppButton";
// import { useDevEmployee } from "@/src/features/session/devSession";

// import DetailerDashboard from "@/src/screens/tasks/DetailerDashboard";
// import DealerDashboard from "@/src/screens/tasks/DealerDashboard";
// import MechanicDashboard from "@/src/screens/tasks/MechanicDashboard";

// export default function AufgabenIndex() {
//   const { loading, employee, reload } = useDevEmployee();

//   useFocusEffect(
//     useCallback(() => {
//       reload();
//     }, [reload]),
//   );

//   if (loading) {
//     return (
//       <Screen variant="scroll" bottomSpace={120}>
//         <View style={styles.center}>
//           <ActivityIndicator />
//           <Text style={styles.muted}>Lade Session…</Text>
//         </View>
//       </Screen>
//     );
//   }

//   if (!employee) {
//     return (
//       <Screen variant="scroll" bottomSpace={160}>
//         <View style={styles.center}>
//           <Text style={styles.title}>Kein Dev-User gewählt</Text>
//           <Text style={styles.muted}>
//             Zum Testen wähle einen Mitarbeiter aus.
//           </Text>

//           <AppButton
//             title="Dev Login öffnen"
//             onPress={() => router.push("/mehr/dev-user")}
//             style={{ marginTop: 0 }}
//           />

//           <Pressable
//             onPress={reload}
//             style={({ pressed }) => [
//               styles.linkBtn,
//               pressed ? { opacity: 0.85 } : null,
//             ]}
//           >
//             <Text style={styles.linkText}>Neu laden</Text>
//           </Pressable>
//         </View>
//       </Screen>
//     );
//   }

//   const role = String(employee.role ?? "").toLowerCase();

//   // role-based dashboard
//   if (role === "dealer") return <DealerDashboard />;
//   if (role === "mechanic") return <MechanicDashboard />;

//   // default: current implementation is detailer dashboard
//   return <DetailerDashboard />;
// }

// const styles = StyleSheet.create({
//   center: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },
//   title: { fontSize: 18, fontWeight: "900", color: "#000" },
//   muted: {
//     fontSize: 13,
//     fontWeight: "700",
//     color: "rgba(0,0,0,0.55)",
//     lineHeight: 18,
//   },

//   linkBtn: {
//     alignSelf: "flex-start",
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 999,
//     backgroundColor: "rgba(0,0,0,0.06)",
//   },
//   linkText: { fontSize: 12, fontWeight: "800", color: "#000" },
// });

//komplett alte version
// import React, { useCallback, useEffect, useMemo, useState } from "react";
// import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
// import { useFocusEffect, router } from "expo-router";

// import Screen from "@/src/components/ui/Screen";
// import FilterChips, { ChipOption } from "@/src/components/ui/FilterChips";
// import DashboardCard from "@/src/components/ui/DashboardCard";
// import { supabase } from "@/src/lib/supabase";
// import {
//   fetchDetailerQueue,
//   type DetailerQueueItem,
// } from "@/src/features/tasks/detailerQueue.service";

// type Filter = "all" | "open" | "in_progress" | "done";

// const FILTERS: ChipOption<Filter>[] = [
//   { key: "all", label: "alle" },
//   { key: "open", label: "offen" },
//   { key: "in_progress", label: "in Arbeit" },
//   { key: "done", label: "erledigt" },
// ];

// function statusLabel(status: string): string {
//   switch (status) {
//     case "open":
//     case "overdue":
//       return "offen";
//     case "in_progress":
//     case "blocked":
//       return "in Arbeit";
//     case "done":
//       return "erledigt";
//     default:
//       return status;
//   }
// }

// function badgeTone(status: string): "pending" | "done" {
//   return status === "done" ? "done" : "pending";
// }

// function subtitleFromType(type: string) {
//   if (type === "detail_intake") return "Status: Neu eingetroffen";
//   if (type === "detail_final") return "Status: Übergabe";
//   return "Status: Aufbereitung";
// }

// function matchesFilter(status: string, filter: Filter) {
//   if (filter === "all") return true;
//   if (filter === "open") return status === "open" || status === "overdue";
//   if (filter === "in_progress")
//     return status === "in_progress" || status === "blocked";
//   return status === "done";
// }

// export default function DetailerDashboard() {
//   const [filter, setFilter] = useState<Filter>("open");
//   const [items, setItems] = useState<DetailerQueueItem[]>([]);
//   const [loading, setLoading] = useState(false);

//   const load = useCallback(async () => {
//     setLoading(true);
//     try {
//       const res = await fetchDetailerQueue();
//       setItems(res);
//     } catch (e: any) {
//       console.log("fetchDetailerQueue error", e?.message ?? e);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     const channel = supabase
//       .channel("detailer-tasks")
//       .on(
//         "postgres_changes",
//         { event: "*", schema: "public", table: "tasks" },
//         () => load(),
//       )
//       .subscribe();

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, [load]);

//   useFocusEffect(
//     useCallback(() => {
//       load();
//     }, [load]),
//   );

//   const data = useMemo(() => {
//     return items.filter((x) => matchesFilter(String(x.status), filter));
//   }, [filter, items]);

//   return (
//     <Screen variant="list">
//       <FlatList
//         data={data}
//         keyExtractor={(item) => item.id}
//         removeClippedSubviews={false}
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={styles.listContent}
//         refreshControl={
//           <RefreshControl refreshing={loading} onRefresh={load} />
//         }
//         ListHeaderComponent={
//           <View style={styles.header}>
//             <Text style={styles.title}>Aufbereiter Aufgaben</Text>
//             <FilterChips
//               options={FILTERS}
//               value={filter}
//               onChange={setFilter}
//             />
//           </View>
//         }
//         ItemSeparatorComponent={() => <View style={{ height: 17 }} />}
//         ListEmptyComponent={
//           !loading ? (
//             <View style={{ paddingTop: 14 }}>
//               <Text style={{ color: "rgba(0,0,0,0.55)", fontWeight: "600" }}>
//                 Keine Einträge vorhanden.
//               </Text>
//             </View>
//           ) : null
//         }
//         renderItem={({ item }) => {
//           const vehicle = item.vehicle;
//           const title = vehicle?.draft_model?.trim()
//             ? vehicle.draft_model
//             : (vehicle?.vin ?? "Fahrzeug");

//           const vin = vehicle?.vin ?? "-";
//           const subtitle = subtitleFromType(String(item.type));

//           const label = statusLabel(String(item.status));
//           const tone = badgeTone(String(item.status));

//           return (
//             <DashboardCard
//               title={title}
//               badgeLabel={label}
//               badgeTone={tone}
//               subtitle={subtitle}
//               meta={`VIN: ${vin}`}
//               onPress={() => router.push(`/task/detailer/${item.id}`)}
//             />
//           );
//         }}
//       />
//     </Screen>
//   );
// }

// const styles = StyleSheet.create({
//   header: { gap: 15, marginBottom: 30 },
//   title: { fontSize: 22, fontWeight: "700", color: "#000" },

//   listContent: {
//     paddingHorizontal: 20,
//     paddingBottom: 160,
//   },
// });
