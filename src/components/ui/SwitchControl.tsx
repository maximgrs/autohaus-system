import React, { useMemo } from "react";
import { Platform, Switch, StyleSheet } from "react-native";

type Props = {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  scale?: number; // optional
};

const COLORS = {
  off: "#6C6C6C",
  on: "#1F7A3A",
  thumb: "#FFFFFF",
};

export default function SwitchControl({
  value,
  onChange,
  disabled,
  scale,
}: Props) {
  const base = useMemo(() => (value ? COLORS.on : COLORS.off), [value]);
  const s = scale ?? (Platform.OS === "ios" ? 0.92 : 1);

  return (
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: COLORS.off, true: COLORS.on }}
      thumbColor={COLORS.thumb}
      ios_backgroundColor={base}
      style={[
        styles.base,
        Platform.OS === "ios" && { backgroundColor: base, borderRadius: 999 },
        { transform: [{ scaleX: s }, { scaleY: s }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "center",
  },
});
