import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  title?: string;
  status: string;
  assignedEmployeeName?: string | null;
  canClaim: boolean;
  canRelease: boolean;
  canComplete: boolean;
  isBusy?: boolean;
  onClaim: () => void;
  onRelease: () => void;
  onComplete: () => void;
};

function labelStatus(status: string) {
  const value = String(status).toLowerCase();

  if (value === "open") return "Offen";
  if (value === "in_progress") return "In Arbeit";
  if (value === "done") return "Erledigt";
  if (value === "blocked") return "Blockiert";
  if (value === "overdue") return "Überfällig";

  return status;
}

export default function TaskActionPanel({
  title = "Aufgabenstatus",
  status,
  assignedEmployeeName,
  canClaim,
  canRelease,
  canComplete,
  isBusy = false,
  onClaim,
  onRelease,
  onComplete,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.metaBlock}>
        <Text style={styles.metaLabel}>Status</Text>
        <Text style={styles.metaValue}>{labelStatus(status)}</Text>
      </View>

      <View style={styles.metaBlock}>
        <Text style={styles.metaLabel}>Zugeordnet</Text>
        <Text style={styles.metaValue}>
          {assignedEmployeeName ?? "Niemand"}
        </Text>
      </View>

      <View style={styles.actions}>
        {canClaim ? (
          <ActionButton
            label="Übernehmen"
            onPress={onClaim}
            disabled={isBusy}
            tone="primary"
          />
        ) : null}

        {canRelease ? (
          <ActionButton
            label="Freigeben"
            onPress={onRelease}
            disabled={isBusy}
            tone="secondary"
          />
        ) : null}

        {canComplete ? (
          <ActionButton
            label="Abschließen"
            onPress={onComplete}
            disabled={isBusy}
            tone="primary"
          />
        ) : null}

        {isBusy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator size="small" />
            <Text style={styles.busyText}>Speichere…</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  tone,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone: "primary" | "secondary";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        tone === "primary" ? styles.buttonPrimary : styles.buttonSecondary,
        disabled ? styles.buttonDisabled : null,
        pressed ? { opacity: 0.9 } : null,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          tone === "primary"
            ? styles.buttonTextPrimary
            : styles.buttonTextSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    gap: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000",
  },
  metaBlock: {
    gap: 4,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(0,0,0,0.55)",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000",
  },
  actions: {
    gap: 10,
    paddingTop: 2,
  },
  button: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  buttonPrimary: {
    backgroundColor: "#145437",
  },
  buttonSecondary: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "900",
  },
  buttonTextPrimary: {
    color: "#fff",
  },
  buttonTextSecondary: {
    color: "#000",
  },
  busyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  busyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
  },
});
