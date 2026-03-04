import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Option<T extends string> = {
  label: string;
  value: T;
};

type Props<T extends string> = {
  label: string;
  value: T | null;
  onChange: (next: T | null) => void;
  options: Option<T>[];
  placeholder?: string;
};

const TOKENS = {
  text: "#000",
  muted: "rgba(0,0,0,0.55)",
  placeholder: "rgba(0,0,0,0.45)",
  border: "rgba(0,0,0,0.06)",
  bg: "#FFF",
  radius: 999,

  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,

  sheetRadius: 18,
};

export default function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder = "keine Angabe",
}: Props<T>) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const bottomPad = Math.max(14, insets.bottom + 10);

  const valueLabel = useMemo(() => {
    if (!value) return "";
    return options.find((o) => o.value === value)?.label ?? "";
  }, [options, value]);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.row,
          pressed ? { opacity: 0.95, transform: [{ scale: 0.998 }] } : null,
        ]}
      >
        <Text style={styles.leftText} numberOfLines={1}>
          {label}
        </Text>

        <View style={styles.right}>
          <Text
            style={[
              styles.rightText,
              !valueLabel ? { color: TOKENS.placeholder } : null,
            ]}
            numberOfLines={1}
          >
            {valueLabel || placeholder}
          </Text>
          <Feather name="chevron-down" size={16} color={TOKENS.muted} />
        </View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        presentationStyle="overFullScreen"
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={[StyleSheet.absoluteFillObject, styles.backdrop]}
            onPress={() => setOpen(false)}
          />

          <View style={[styles.sheet, { paddingBottom: bottomPad }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Feather name="x" size={20} color="#000" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
              {/* "keine Angabe" */}
              <Pressable
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.item,
                  !value ? styles.itemActive : null,
                  pressed ? { opacity: 0.85 } : null,
                ]}
              >
                <Text
                  style={[
                    styles.itemText,
                    !value ? styles.itemTextActive : null,
                  ]}
                >
                  {placeholder}
                </Text>
                {!value ? (
                  <Feather name="check" size={18} color="#145437" />
                ) : null}
              </Pressable>

              {options.map((o) => {
                const active = value === o.value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.item,
                      active ? styles.itemActive : null,
                      pressed ? { opacity: 0.85 } : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.itemText,
                        active ? styles.itemTextActive : null,
                      ]}
                    >
                      {o.label}
                    </Text>
                    {active ? (
                      <Feather name="check" size={18} color="#145437" />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },

  row: {
    height: 44,
    borderRadius: TOKENS.radius,
    backgroundColor: TOKENS.bg,
    borderWidth: 1,
    borderColor: TOKENS.border,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    shadowColor: TOKENS.shadowColor,
    shadowOpacity: TOKENS.shadowOpacity,
    shadowRadius: TOKENS.shadowRadius,
    shadowOffset: TOKENS.shadowOffset,
    elevation: TOKENS.elevation,
  },

  leftText: {
    fontSize: 12,
    fontWeight: "800",
    color: TOKENS.text,
    flexShrink: 1,
    paddingRight: 10,
  },

  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },

  rightText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.7)",
    maxWidth: 120,
  },

  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(0,0,0,0.25)" },

  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: TOKENS.sheetRadius,
    borderTopRightRadius: TOKENS.sheetRadius,
    paddingTop: 14,
    paddingHorizontal: 16,
    maxHeight: "70%",
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },

  sheetTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000",
  },

  list: { paddingVertical: 12, gap: 10 },

  item: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  itemActive: {
    backgroundColor: "rgba(20,84,55,0.10)",
    borderWidth: 1,
    borderColor: "rgba(20,84,55,0.25)",
  },

  itemText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
  },

  itemTextActive: {
    fontWeight: "900",
  },
});
