import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  options?: string[];
  disabled?: boolean;
};

const DEFAULT_OPTIONS = [
  "Stoßstange vorn",
  "Stoßstange hinten",
  "Motorhaube",
  "Dach",
  "Heckklappe",

  "Tür links vorn",
  "Tür links hinten",
  "Tür rechts vorn",
  "Tür rechts hinten",

  "Kotflügel VL",
  "Kotflügel VR",
  "Kotflügel HL",
  "Kotflügel HR",

  "Schweller links",
  "Schweller rechts",
  "Felge VL",
  "Felge VR",
  "Felge HL",
  "Felge HR",
];

const T = {
  bg: "#F2F2F2",
  chipBg: "rgba(126, 41, 41, 0.06)",
  chipBgActive: "rgba(31,122,58,0.14)",
  chipBorderActive: "rgba(31,122,58,0.30)",
  text: "#000",
  muted: "rgba(0,0,0,0.55)",
  green: "#1F7A3A",
  radius: 12,
};

function PositionPickerBase({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  disabled,
}: Props) {
  const toggle = (label: string) => {
    if (disabled) return;
    const has = value.includes(label);
    onChange(has ? value.filter((x) => x !== label) : [label, ...value]);
  };

  return (
    <View style={[styles.wrap, disabled && { opacity: 0.6 }]}>
      <View style={styles.chips}>
        {options.map((opt) => {
          const active = value.includes(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => toggle(opt)}
              style={({ pressed }) => [
                styles.chip,
                active ? styles.chipActive : styles.chipInactive,
                pressed && !disabled ? { opacity: 0.9 } : null,
              ]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {value.length > 0 ? (
        <Text style={styles.selectedHint}>{value.length} ausgewählt</Text>
      ) : (
        <Text style={styles.selectedHint}>Bitte Position(en) auswählen</Text>
      )}
    </View>
  );
}

export default memo(PositionPickerBase);

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: T.bg,
    borderRadius: T.radius,
    padding: 10,
    gap: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipInactive: {
    backgroundColor: T.chipBg,
  },
  chipActive: {
    backgroundColor: T.chipBgActive,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "800",
    color: T.muted,
  },
  chipTextActive: {
    color: T.green,
  },
  selectedHint: {
    fontSize: 10,
    fontWeight: "800",
    color: T.muted,
  },
});
