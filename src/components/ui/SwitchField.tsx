import React from "react";
import { StyleSheet, Text, View } from "react-native";
import SwitchControl from "./SwitchControl";

type Props = {
  label: string; // z.B. "Felgen"
  valueLabel: string; // z.B. "Mit Felgen" / "Ohne Felgen"
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

const TOKENS = {
  text: "#000",
  placeholder: "rgba(0,0,0,0.45)",

  bg: "#FFF",
  border: "rgba(0,0,0,0.06)",
  radius: 15,

  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,

  fieldHeight: 48,
};

export default function SwitchField({
  label,
  valueLabel,
  value,
  onChange,
  disabled,
}: Props) {
  return (
    <View style={styles.wrapOuter}>
      <Text style={styles.labelTop}>{label}</Text>

      <View style={[styles.field, disabled && { opacity: 0.5 }]}>
        <Text numberOfLines={1} style={styles.valueText}>
          {valueLabel}
        </Text>

        <SwitchControl value={value} onChange={onChange} disabled={disabled} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapOuter: { gap: 6 },

  labelTop: {
    fontSize: 12,
    fontWeight: "600",
    color: TOKENS.text,
  },

  field: {
    height: TOKENS.fieldHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    backgroundColor: TOKENS.bg,
    borderRadius: TOKENS.radius,
    borderWidth: 1,
    borderColor: TOKENS.border,

    paddingHorizontal: 12,
    paddingVertical: 0,

    shadowColor: TOKENS.shadowColor,
    shadowOpacity: TOKENS.shadowOpacity,
    shadowRadius: TOKENS.shadowRadius,
    shadowOffset: TOKENS.shadowOffset,
    elevation: TOKENS.elevation,
  },

  valueText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "500",
    color: TOKENS.placeholder,
    paddingRight: 12,
  },
});
