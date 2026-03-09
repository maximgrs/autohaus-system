import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import {
  DetailerDashboard,
  DealerDashboard,
  MechanicDashboard,
} from "@/src/features/tasks/screens";
import { useRoleAccess } from "@/src/features/session";

type EmployeeRole = "admin" | "dealer" | "mechanic" | "detailer" | "listing";

type AdminPicker = {
  onPress: () => void;
};

const ROLE_OPTIONS: { key: EmployeeRole; label: string }[] = [
  { key: "listing", label: "Inserat" },
  { key: "dealer", label: "Händler" },
  { key: "mechanic", label: "Werkstatt" },
  { key: "detailer", label: "Aufbereiter" },
];

export default function AufgabenIndex() {
  const {
    loading,
    account,
    effectiveRole,
    isAdmin,
    canViewDealerDashboard,
    canViewMechanicDashboard,
    canViewDetailerDashboard,
  } = useRoleAccess();

  const [adminRole, setAdminRole] = useState<EmployeeRole>("listing");
  const [roleModal, setRoleModal] = useState(false);

  const dashboardRole = useMemo<EmployeeRole>(() => {
    if (isAdmin) return adminRole;

    if (
      effectiveRole === "dealer" ||
      effectiveRole === "mechanic" ||
      effectiveRole === "detailer" ||
      effectiveRole === "listing"
    ) {
      return effectiveRole;
    }

    return "listing";
  }, [adminRole, effectiveRole, isAdmin]);

  const adminPicker = useMemo<AdminPicker | undefined>(() => {
    if (!isAdmin) return undefined;
    return {
      onPress: () => setRoleModal(true),
    };
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

  let content: React.ReactNode = (
    <View style={styles.loading}>
      <Text style={styles.errTitle}>Kein Dashboard verfügbar</Text>
      <Text style={styles.errSub}>
        Für deine aktuelle Rolle ist kein Aufgaben-Dashboard freigeschaltet.
      </Text>
    </View>
  );

  if (dashboardRole === "dealer" || dashboardRole === "listing") {
    if (canViewDealerDashboard) {
      content = (
        <DealerDashboard adminPicker={adminPicker} viewerAccount={account} />
      );
    }
  } else if (dashboardRole === "mechanic") {
    if (canViewMechanicDashboard) {
      content = <MechanicDashboard adminPicker={adminPicker} />;
    }
  } else if (dashboardRole === "detailer") {
    if (canViewDetailerDashboard) {
      content = <DetailerDashboard adminPicker={adminPicker} />;
    }
  }

  return (
    <>
      {content}

      <Modal
        visible={roleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModal(false)}
      >
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
              <Feather name="x" size={18} color="#000" />
            </Pressable>
          </View>

          <View style={styles.list}>
            {ROLE_OPTIONS.map((option) => {
              const active = option.key === adminRole;

              return (
                <Pressable
                  key={option.key}
                  onPress={() => {
                    setAdminRole(option.key);
                    setRoleModal(false);
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    active ? styles.rowActive : null,
                    pressed ? { opacity: 0.9 } : null,
                  ]}
                >
                  <Text style={styles.rowText}>{option.label}</Text>
                  {active ? <Text style={styles.tick}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
  },
  errTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
    textAlign: "center",
  },
  errSub: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
    textAlign: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
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
  sheetTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    gap: 10,
    paddingBottom: 6,
  },
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
  rowText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  tick: {
    fontSize: 16,
    fontWeight: "900",
    color: "#145437",
  },
});
